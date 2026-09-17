use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Instant;

use image::imageops::FilterType;
use image::{DynamicImage, ImageBuffer, ImageDecoder, ImageReader, Luma, Rgba};
use ndarray::Array4;
use ort::ep::coreml::ComputeUnits;
use ort::ep::CoreML;
use ort::session::Session;
use ort::value::TensorRef;
use thiserror::Error;

const INPUT_SIZE: u32 = 1024;
const MEAN: [f32; 3] = [0.5, 0.5, 0.5];
const STD: [f32; 3] = [1.0, 1.0, 1.0];
const MAX_PIXEL_COUNT: u64 = 100_000_000;

#[derive(Debug, Error)]
pub enum BackgroundRemovalError {
    #[error("The image could not be decoded: {0}")]
    Decode(String),
    #[error("The image dimensions are too large to process safely.")]
    DimensionsTooLarge,
    #[error("The background-removal model could not be loaded: {0}")]
    ModelLoad(String),
    #[error("Background removal failed: {0}")]
    Inference(String),
    #[error("The cutout could not be saved: {0}")]
    Save(String),
}

pub struct RemovalOutcome {
    pub cutout_path: PathBuf,
    pub processing_time_ms: u64,
}

/// Isolates the background-removal model/runtime behind a stable boundary, per
/// IMPLEMENTATION.md's BackgroundRemovalService contract. Swapping the model or
/// inference runtime should only require changes inside this file.
pub struct BackgroundRemovalService {
    model_path: PathBuf,
    session: Mutex<Option<Session>>,
}

impl BackgroundRemovalService {
    pub fn new(model_path: PathBuf) -> Self {
        Self {
            model_path,
            session: Mutex::new(None),
        }
    }

    fn with_session<R>(
        &self,
        f: impl FnOnce(&mut Session) -> Result<R, BackgroundRemovalError>,
    ) -> Result<R, BackgroundRemovalError> {
        let mut guard = self.session.lock().expect("session lock poisoned");
        if guard.is_none() {
            let session = Session::builder()
                .map_err(|e| BackgroundRemovalError::ModelLoad(e.to_string()))?
                .with_execution_providers([CoreML::default()
                    .with_compute_units(ComputeUnits::CPUAndGPU)
                    .build()
                    .error_on_failure()])
                .map_err(|e| BackgroundRemovalError::ModelLoad(e.to_string()))?
                .commit_from_file(&self.model_path)
                .map_err(|e| BackgroundRemovalError::ModelLoad(e.to_string()))?;
            *guard = Some(session);
        }
        f(guard.as_mut().expect("session initialized above"))
    }

    /// Runs background removal on an in-memory image and writes the transparent
    /// PNG result into `cache_dir`. The source image is never modified or written to.
    pub fn remove_background(
        &self,
        image_bytes: &[u8],
        cache_dir: &Path,
    ) -> Result<RemovalOutcome, BackgroundRemovalError> {
        let start = Instant::now();

        let original = decode_respecting_exif_orientation(image_bytes)?;
        let (orig_w, orig_h) = (original.width(), original.height());
        check_dimensions(orig_w, orig_h)?;
        let rgb = original.to_rgb8();

        let resized = image::imageops::resize(&rgb, INPUT_SIZE, INPUT_SIZE, FilterType::Lanczos3);
        let mut input = Array4::<f32>::zeros((1, 3, INPUT_SIZE as usize, INPUT_SIZE as usize));
        for y in 0..INPUT_SIZE {
            for x in 0..INPUT_SIZE {
                let px = resized.get_pixel(x, y);
                for c in 0..3 {
                    let v = px[c] as f32 / 255.0;
                    input[[0, c, y as usize, x as usize]] = (v - MEAN[c]) / STD[c];
                }
            }
        }

        let mask = self.with_session(|session| {
            let outputs = TensorRef::from_array_view(&input)
                .and_then(|tensor| session.run(ort::inputs![tensor]))
                .map_err(|e| BackgroundRemovalError::Inference(e.to_string()))?;
            let (shape, data) = outputs[0]
                .try_extract_tensor::<f32>()
                .map_err(|e| BackgroundRemovalError::Inference(e.to_string()))?;
            let dims: Vec<usize> = shape.iter().map(|d| *d as usize).collect();
            let (h, w) = (dims[dims.len() - 2], dims[dims.len() - 1]);

            let mut mask = data.to_vec();
            let (mut min, mut max) = (f32::MAX, f32::MIN);
            for v in &mask {
                if *v < min {
                    min = *v;
                }
                if *v > max {
                    max = *v;
                }
            }
            let range = (max - min).max(1e-6);
            for v in mask.iter_mut() {
                *v = ((*v - min) / range).clamp(0.0, 1.0);
            }
            Ok((mask, w, h))
        })?;
        let (mask_values, mask_w, mask_h) = mask;

        let mask_img: ImageBuffer<Luma<u8>, Vec<u8>> =
            ImageBuffer::from_fn(mask_w as u32, mask_h as u32, |x, y| {
                let v = mask_values[y as usize * mask_w + x as usize];
                Luma([(v * 255.0).round() as u8])
            });
        let mask_full = image::imageops::resize(&mask_img, orig_w, orig_h, FilterType::Lanczos3);

        let mut rgba: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(orig_w, orig_h);
        for y in 0..orig_h {
            for x in 0..orig_w {
                let p = rgb.get_pixel(x, y);
                let a = mask_full.get_pixel(x, y)[0];
                rgba.put_pixel(x, y, Rgba([p[0], p[1], p[2], a]));
            }
        }

        std::fs::create_dir_all(cache_dir)
            .map_err(|e| BackgroundRemovalError::Save(e.to_string()))?;
        let cutout_path = cache_dir.join(format!("cutout-{}.png", uuid_like()));
        rgba.save(&cutout_path)
            .map_err(|e| BackgroundRemovalError::Save(e.to_string()))?;

        Ok(RemovalOutcome {
            cutout_path,
            processing_time_ms: start.elapsed().as_millis() as u64,
        })
    }
}

fn uuid_like() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{nanos:x}")
}

/// Decodes an image and applies its EXIF orientation (common on phone photos, where the raw
/// pixel buffer is stored sensor-orientation and a tag says how to rotate/flip it for display).
/// `image::load_from_memory` ignores this tag, which silently produced sideways, wrong-aspect-ratio
/// cutouts for photos shot on a phone held in portrait.
fn decode_respecting_exif_orientation(
    image_bytes: &[u8],
) -> Result<DynamicImage, BackgroundRemovalError> {
    let mut decoder = ImageReader::new(Cursor::new(image_bytes))
        .with_guessed_format()
        .map_err(|e| BackgroundRemovalError::Decode(e.to_string()))?
        .into_decoder()
        .map_err(|e| BackgroundRemovalError::Decode(e.to_string()))?;
    let orientation = decoder
        .orientation()
        .map_err(|e| BackgroundRemovalError::Decode(e.to_string()))?;
    let mut image = DynamicImage::from_decoder(decoder)
        .map_err(|e| BackgroundRemovalError::Decode(e.to_string()))?;
    image.apply_orientation(orientation);
    Ok(image)
}

fn check_dimensions(width: u32, height: u32) -> Result<(), BackgroundRemovalError> {
    if u64::from(width) * u64::from(height) > MAX_PIXEL_COUNT {
        return Err(BackgroundRemovalError::DimensionsTooLarge);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_dimensions_within_the_safety_cap() {
        assert!(check_dimensions(8256, 5504).is_ok());
    }

    #[test]
    fn rejects_dimensions_over_the_safety_cap() {
        assert!(matches!(
            check_dimensions(20_000, 20_000),
            Err(BackgroundRemovalError::DimensionsTooLarge)
        ));
    }

    /// End-to-end check against the real isnet-general-use.onnx model. Skipped when the
    /// model hasn't been fetched (see scripts/fetch-models.sh) so `cargo test` still passes
    /// on a clean checkout; run `pnpm fetch-models` first to exercise it for real.
    #[test]
    fn remove_background_produces_a_transparent_png_matching_source_dimensions() {
        let model_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources/models/isnet-general-use.onnx");
        if !model_path.is_file() {
            eprintln!("skipping: model not fetched, run `pnpm fetch-models` first");
            return;
        }

        let width = 200;
        let height = 150;
        let mut source: ImageBuffer<image::Rgb<u8>, Vec<u8>> = ImageBuffer::new(width, height);
        for (x, y, pixel) in source.enumerate_pixels_mut() {
            let in_subject =
                x > width / 4 && x < 3 * width / 4 && y > height / 4 && y < 3 * height / 4;
            *pixel = if in_subject {
                image::Rgb([220, 40, 40])
            } else {
                image::Rgb([245, 245, 245])
            };
        }
        let mut bytes: Vec<u8> = Vec::new();
        image::DynamicImage::ImageRgb8(source)
            .write_to(
                &mut std::io::Cursor::new(&mut bytes),
                image::ImageFormat::Png,
            )
            .expect("encode synthetic source image");

        let temp_dir = std::env::temp_dir().join(format!("colorcut-test-{}", uuid_like()));
        let service = BackgroundRemovalService::new(model_path);

        let outcome = service
            .remove_background(&bytes, &temp_dir)
            .expect("background removal should succeed");

        assert!(outcome.cutout_path.is_file());
        assert!(outcome.processing_time_ms > 0);

        let cutout = image::open(&outcome.cutout_path)
            .expect("cutout should be a valid image")
            .to_rgba8();
        assert_eq!(cutout.width(), width);
        assert_eq!(cutout.height(), height);

        std::fs::remove_dir_all(&temp_dir).ok();
    }

    /// Diagnostic: reprocesses every file in the repo-root `original/` folder (the user's ad hoc
    /// comparison set, not part of the repo) and writes fresh cutouts next to the previous
    /// `remove_bg_results/` for manual review. Skips gracefully if either folder or the model
    /// is absent. Not a pass/fail assertion test — it only checks dimensions are preserved.
    #[test]
    fn diagnostic_reprocess_original_folder() {
        let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
        let model_path = repo_root.join("src-tauri/resources/models/isnet-general-use.onnx");
        let originals_dir = repo_root.join("original");
        if !model_path.is_file() || !originals_dir.is_dir() {
            eprintln!("skipping: model or original/ folder not present");
            return;
        }

        let out_dir = repo_root.join("remove_bg_results_v2");
        std::fs::create_dir_all(&out_dir).unwrap();
        let service = BackgroundRemovalService::new(model_path);

        for entry in std::fs::read_dir(&originals_dir).unwrap() {
            let path = entry.unwrap().path();
            if !path.is_file() {
                continue;
            }
            let bytes = std::fs::read(&path).unwrap();
            let stem = path.file_stem().unwrap().to_string_lossy().into_owned();
            let start = Instant::now();
            match service.remove_background(&bytes, &out_dir) {
                Ok(outcome) => {
                    let final_path = out_dir.join(format!("{stem}-cutout.png"));
                    std::fs::rename(&outcome.cutout_path, &final_path).unwrap();
                    let dims = image::image_dimensions(&final_path).unwrap();
                    println!(
                        "{stem}: ok in {}ms, output {}x{}",
                        start.elapsed().as_millis(),
                        dims.0,
                        dims.1
                    );
                }
                Err(error) => println!("{stem}: FAILED: {error}"),
            }
        }
    }
}
