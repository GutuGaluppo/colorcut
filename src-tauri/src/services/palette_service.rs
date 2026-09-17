use std::path::Path;

use image::imageops::FilterType;
use image::{ImageBuffer, Pixel};
use thiserror::Error;

use super::color_conversion::{rgb_to_hsl, rgb_to_oklch, to_hex};
use super::median_cut::quantize;
use crate::models::{PaletteColor, PaletteResult, RgbColor};

const MAX_SAMPLE_DIMENSION: u32 = 200;
const SUBJECT_ALPHA_THRESHOLD: u8 = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteSource {
    Original,
    Subject,
}

impl PaletteSource {
    pub fn parse(value: &str) -> Result<Self, PaletteError> {
        match value {
            "original" => Ok(Self::Original),
            "subject" => Ok(Self::Subject),
            other => Err(PaletteError::InvalidSource(other.to_owned())),
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Original => "original",
            Self::Subject => "subject",
        }
    }
}

#[derive(Debug, Error)]
pub enum PaletteError {
    #[error("Unsupported palette source: {0}")]
    InvalidSource(String),
    #[error("Choose 4, 6, 8, 12, or 16 colors.")]
    InvalidCount,
    #[error("Extract a subject cutout with Remove Background first.")]
    MissingCutout,
    #[error("The image could not be decoded: {0}")]
    Decode(String),
    #[error("The subject has no visible pixels to sample.")]
    NoPixels,
}

pub fn extract_palette(
    image_bytes: &[u8],
    source: PaletteSource,
    count: u8,
    cutout_path: Option<&Path>,
) -> Result<PaletteResult, PaletteError> {
    if ![4, 6, 8, 12, 16].contains(&count) {
        return Err(PaletteError::InvalidCount);
    }

    let pixels = match source {
        PaletteSource::Original => sample_original(image_bytes)?,
        PaletteSource::Subject => {
            let path = cutout_path.ok_or(PaletteError::MissingCutout)?;
            sample_subject(path)?
        }
    };

    if pixels.is_empty() {
        return Err(PaletteError::NoPixels);
    }

    let total = pixels.len() as f32;
    let mut clusters = quantize(pixels, count as usize);
    clusters.sort_by(|a, b| b.population.cmp(&a.population));

    let mut colors: Vec<PaletteColor> = clusters
        .iter()
        .map(|cluster| {
            let rgb = RgbColor {
                r: cluster.color[0],
                g: cluster.color[1],
                b: cluster.color[2],
            };
            PaletteColor {
                id: to_hex(rgb).to_lowercase(),
                hex: to_hex(rgb),
                rgb,
                hsl: rgb_to_hsl(rgb),
                oklch: rgb_to_oklch(rgb),
                percentage: (cluster.population as f32 / total) * 100.0,
            }
        })
        .collect();

    normalize_percentages(&mut colors);

    Ok(PaletteResult {
        source: source.as_str().to_owned(),
        count,
        colors,
    })
}

/// Rounds each color's percentage to one decimal, then nudges the largest
/// share by the rounding remainder so the total lands at (approximately) 100%.
fn normalize_percentages(colors: &mut [PaletteColor]) {
    for color in colors.iter_mut() {
        color.percentage = (color.percentage * 10.0).round() / 10.0;
    }
    let sum: f32 = colors.iter().map(|c| c.percentage).sum();
    let drift = 100.0 - sum;
    if let Some(largest) = colors
        .iter_mut()
        .max_by(|a, b| a.percentage.total_cmp(&b.percentage))
    {
        largest.percentage = ((largest.percentage + drift) * 10.0).round() / 10.0;
    }
}

fn sample_original(image_bytes: &[u8]) -> Result<Vec<[u8; 3]>, PaletteError> {
    let image =
        image::load_from_memory(image_bytes).map_err(|e| PaletteError::Decode(e.to_string()))?;
    let rgb = image.to_rgb8();
    let sampled = downsample(&rgb);
    Ok(sampled.pixels().map(|p| p.0).collect())
}

fn sample_subject(cutout_path: &Path) -> Result<Vec<[u8; 3]>, PaletteError> {
    let image = image::open(cutout_path).map_err(|e| PaletteError::Decode(e.to_string()))?;
    let rgba = image.to_rgba8();
    let sampled = downsample(&rgba);
    Ok(sampled
        .pixels()
        .filter(|p| p.0[3] > SUBJECT_ALPHA_THRESHOLD)
        .map(|p| [p.0[0], p.0[1], p.0[2]])
        .collect())
}

fn downsample<P>(image: &ImageBuffer<P, Vec<P::Subpixel>>) -> ImageBuffer<P, Vec<P::Subpixel>>
where
    P: Pixel + 'static,
{
    let (width, height) = image.dimensions();
    let longest = width.max(height);
    if longest <= MAX_SAMPLE_DIMENSION {
        return image.clone();
    }
    let scale = MAX_SAMPLE_DIMENSION as f32 / longest as f32;
    let target_w = ((width as f32) * scale).round().max(1.0) as u32;
    let target_h = ((height as f32) * scale).round().max(1.0) as u32;
    image::imageops::resize(image, target_w, target_h, FilterType::Nearest)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgb, Rgba};
    use std::io::Cursor;

    fn encode_rgb_png(width: u32, height: u32, fill: impl Fn(u32, u32) -> [u8; 3]) -> Vec<u8> {
        let mut img: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::new(width, height);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            *pixel = Rgb(fill(x, y));
        }
        let mut bytes = Vec::new();
        image::DynamicImage::ImageRgb8(img)
            .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)
            .unwrap();
        bytes
    }

    fn write_rgba_png(path: &Path, width: u32, height: u32, fill: impl Fn(u32, u32) -> [u8; 4]) {
        let mut img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(width, height);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            *pixel = Rgba(fill(x, y));
        }
        img.save(path).unwrap();
    }

    #[test]
    fn rejects_an_invalid_color_count() {
        let bytes = encode_rgb_png(4, 4, |_, _| [10, 10, 10]);
        let result = extract_palette(&bytes, PaletteSource::Original, 7, None);
        assert!(matches!(result, Err(PaletteError::InvalidCount)));
    }

    #[test]
    fn requires_a_cutout_path_for_subject_mode() {
        let bytes = encode_rgb_png(4, 4, |_, _| [10, 10, 10]);
        let result = extract_palette(&bytes, PaletteSource::Subject, 4, None);
        assert!(matches!(result, Err(PaletteError::MissingCutout)));
    }

    #[test]
    fn extracts_a_two_color_palette_from_a_half_and_half_image() {
        let bytes = encode_rgb_png(
            40,
            40,
            |x, _| if x < 20 { [255, 0, 0] } else { [0, 0, 255] },
        );
        let result =
            extract_palette(&bytes, PaletteSource::Original, 4, None).expect("should extract");

        assert_eq!(result.source, "original");
        assert!(result.colors.len() <= 4);
        assert!(result.colors.iter().any(|c| c.hex == "#FF0000"));
        assert!(result.colors.iter().any(|c| c.hex == "#0000FF"));

        let total: f32 = result.colors.iter().map(|c| c.percentage).sum();
        assert!(
            (total - 100.0).abs() < 0.5,
            "percentages should sum to ~100, got {total}"
        );

        // Sorted by weight descending.
        for pair in result.colors.windows(2) {
            assert!(pair[0].percentage >= pair[1].percentage);
        }
    }

    #[test]
    fn subject_mode_ignores_near_transparent_pixels() {
        let temp_dir =
            std::env::temp_dir().join(format!("colorcut-palette-test-{}", std::process::id()));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let cutout_path = temp_dir.join("cutout.png");
        // Half opaque green, half fully transparent.
        write_rgba_png(&cutout_path, 20, 20, |x, _| {
            if x < 10 {
                [0, 200, 0, 255]
            } else {
                [0, 0, 0, 0]
            }
        });

        let dummy_original = encode_rgb_png(1, 1, |_, _| [0, 0, 0]);
        let result = extract_palette(
            &dummy_original,
            PaletteSource::Subject,
            4,
            Some(&cutout_path),
        )
        .expect("should extract from the cutout");

        assert_eq!(result.colors.len(), 1);
        assert_eq!(result.colors[0].hex, "#00C800");

        std::fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn fails_clearly_when_the_subject_has_no_visible_pixels() {
        let temp_dir = std::env::temp_dir().join(format!(
            "colorcut-palette-test-empty-{}",
            std::process::id()
        ));
        std::fs::create_dir_all(&temp_dir).unwrap();
        let cutout_path = temp_dir.join("cutout.png");
        write_rgba_png(&cutout_path, 10, 10, |_, _| [0, 0, 0, 0]);

        let dummy_original = encode_rgb_png(1, 1, |_, _| [0, 0, 0]);
        let result = extract_palette(
            &dummy_original,
            PaletteSource::Subject,
            4,
            Some(&cutout_path),
        );

        assert!(matches!(result, Err(PaletteError::NoPixels)));
        std::fs::remove_dir_all(&temp_dir).ok();
    }
}
