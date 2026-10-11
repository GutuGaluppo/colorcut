use std::{
    fs,
    path::{Path, PathBuf},
};

use image::RgbaImage;
use thiserror::Error;

use crate::services::image_service;

/// Pixels at or below this alpha are treated as empty. Calibrated on real cutouts:
/// at 16, faint haze and fringe pixels stretched the crop to nearly the full
/// frame (e.g. 3957×4518 for a subject that is about 1122×3806 at 64).
pub const ALPHA_THRESHOLD: u8 = 64;

#[derive(Debug, Error)]
pub enum TrimError {
    #[error("The cutout could not be read: {0}")]
    Read(String),
    #[error("No subject was found in the cutout. Remove the background first.")]
    NoSubject,
    #[error("The trimmed cutout could not be saved: {0}")]
    Save(String),
}

/// A rectangle in the cutout's own pixel space.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

pub struct TrimOutcome {
    pub cutout_path: PathBuf,
    pub rect: CropRect,
}

/// The smallest rectangle that holds every visible pixel, grown by `padding` on
/// each side and clamped to the image bounds.
pub fn subject_crop(image: &RgbaImage, padding: u32) -> Result<CropRect, TrimError> {
    let (image_width, image_height) = image.dimensions();

    let mut bounds: Option<(u32, u32, u32, u32)> = None;
    for (x, y, pixel) in image.enumerate_pixels() {
        if pixel[3] <= ALPHA_THRESHOLD {
            continue;
        }
        bounds = Some(match bounds {
            None => (x, y, x, y),
            Some((min_x, min_y, max_x, max_y)) => {
                (min_x.min(x), min_y.min(y), max_x.max(x), max_y.max(y))
            }
        });
    }
    let (min_x, min_y, max_x, max_y) = bounds.ok_or(TrimError::NoSubject)?;

    let left = min_x.saturating_sub(padding);
    let top = min_y.saturating_sub(padding);
    let right = max_x.saturating_add(padding).min(image_width - 1);
    let bottom = max_y.saturating_add(padding).min(image_height - 1);

    Ok(CropRect {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
    })
}

/// Writes a new, cropped PNG next to the other cutouts. The input cutout is
/// only read, never modified.
pub fn trim_cutout(
    cutout_path: &Path,
    destination_dir: &Path,
    padding: u32,
) -> Result<TrimOutcome, TrimError> {
    let cutout = image::open(cutout_path)
        .map_err(|error| TrimError::Read(error.to_string()))?
        .to_rgba8();
    let rect = subject_crop(&cutout, padding)?;

    let trimmed =
        image::imageops::crop_imm(&cutout, rect.x, rect.y, rect.width, rect.height).to_image();

    fs::create_dir_all(destination_dir).map_err(|error| TrimError::Save(error.to_string()))?;
    let path = destination_dir.join(format!(
        "cutout-trim-{}.png",
        image_service::unique_suffix()
    ));
    trimmed
        .save(&path)
        .map_err(|error| TrimError::Save(error.to_string()))?;

    Ok(TrimOutcome {
        cutout_path: path,
        rect,
    })
}

#[cfg(test)]
mod tests {
    use image::{Rgba, RgbaImage};

    use super::*;

    fn canvas(width: u32, height: u32) -> RgbaImage {
        RgbaImage::from_pixel(width, height, Rgba([0, 0, 0, 0]))
    }

    #[test]
    fn crops_to_the_visible_pixels() {
        let mut image = canvas(10, 8);
        image.put_pixel(3, 2, Rgba([255, 0, 0, 255]));
        image.put_pixel(6, 5, Rgba([255, 0, 0, 255]));

        let rect = subject_crop(&image, 0).unwrap();

        assert_eq!(
            rect,
            CropRect {
                x: 3,
                y: 2,
                width: 4,
                height: 4
            }
        );
    }

    #[test]
    fn ignores_pixels_at_or_below_the_alpha_threshold() {
        let mut image = canvas(10, 10);
        image.put_pixel(1, 1, Rgba([255, 0, 0, ALPHA_THRESHOLD]));
        image.put_pixel(7, 6, Rgba([255, 0, 0, ALPHA_THRESHOLD + 1]));

        let rect = subject_crop(&image, 0).unwrap();

        assert_eq!(
            rect,
            CropRect {
                x: 7,
                y: 6,
                width: 1,
                height: 1
            }
        );
    }

    #[test]
    fn faint_haze_below_the_threshold_does_not_stretch_the_crop() {
        let mut image = canvas(200, 100);
        image.put_pixel(2, 2, Rgba([255, 0, 0, 40]));
        image.put_pixel(100, 60, Rgba([255, 0, 0, 255]));

        let rect = subject_crop(&image, 0).unwrap();

        assert_eq!(
            rect,
            CropRect {
                x: 100,
                y: 60,
                width: 1,
                height: 1
            }
        );
    }

    #[test]
    fn padding_grows_the_crop_and_clamps_to_the_image() {
        let mut image = canvas(10, 10);
        image.put_pixel(1, 1, Rgba([255, 0, 0, 255]));
        image.put_pixel(8, 8, Rgba([255, 0, 0, 255]));

        let rect = subject_crop(&image, 3).unwrap();

        assert_eq!(
            rect,
            CropRect {
                x: 0,
                y: 0,
                width: 10,
                height: 10
            }
        );
    }

    #[test]
    fn rejects_a_cutout_with_no_subject() {
        let image = canvas(4, 4);

        assert!(matches!(subject_crop(&image, 0), Err(TrimError::NoSubject)));
    }

    #[test]
    fn trim_cutout_writes_a_cropped_png_and_keeps_the_input() {
        let dir = std::env::temp_dir().join(format!(
            "colorcut-trim-test-{}",
            image_service::unique_suffix()
        ));
        fs::create_dir_all(&dir).unwrap();
        let input = dir.join("input.png");
        let mut image = canvas(20, 12);
        for x in 5..9 {
            image.put_pixel(x, 4, Rgba([0, 255, 0, 255]));
        }
        image.save(&input).unwrap();

        let outcome = trim_cutout(&input, &dir, 1).unwrap();
        let trimmed = image::open(&outcome.cutout_path).unwrap();

        assert_eq!((trimmed.width(), trimmed.height()), (6, 3));
        assert_eq!(
            outcome.rect,
            CropRect {
                x: 4,
                y: 3,
                width: 6,
                height: 3
            }
        );
        assert_eq!(image::open(&input).unwrap().width(), 20);

        fs::remove_dir_all(&dir).unwrap();
    }
}
