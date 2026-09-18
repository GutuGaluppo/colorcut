use std::path::Path;

use image::{ImageBuffer, Rgb};
use thiserror::Error;

use crate::models::RgbColor;

const STRIP_WIDTH: u32 = 960;
const STRIP_HEIGHT: u32 = 160;
const MAX_COLORS: usize = 16;

#[derive(Debug, Error)]
pub enum PaletteImageError {
    #[error("Extract a palette before exporting its image.")]
    EmptyPalette,
    #[error("A palette image can contain at most 16 colors.")]
    TooManyColors,
    #[error("Choose a PNG destination for the palette image.")]
    UnsupportedFormat,
    #[error("The palette image could not be saved: {0}")]
    Save(String),
}

fn has_png_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("png"))
}

/// Renders a simple horizontal strip with one equal-width segment per color,
/// left to right in the order given (callers should already have them sorted
/// by weight, matching the on-screen swatch order).
pub fn render_strip(
    colors: &[RgbColor],
) -> Result<ImageBuffer<Rgb<u8>, Vec<u8>>, PaletteImageError> {
    if colors.is_empty() {
        return Err(PaletteImageError::EmptyPalette);
    }
    if colors.len() > MAX_COLORS {
        return Err(PaletteImageError::TooManyColors);
    }

    let mut image = ImageBuffer::new(STRIP_WIDTH, STRIP_HEIGHT);
    let count = colors.len() as u32;

    for (index, color) in colors.iter().enumerate() {
        let index = index as u32;
        let x_start = index * STRIP_WIDTH / count;
        let x_end = (index + 1) * STRIP_WIDTH / count;
        let pixel = Rgb([color.r, color.g, color.b]);
        for x in x_start..x_end {
            for y in 0..STRIP_HEIGHT {
                image.put_pixel(x, y, pixel);
            }
        }
    }

    Ok(image)
}

pub fn save_strip(colors: &[RgbColor], destination: &Path) -> Result<(), PaletteImageError> {
    if !has_png_extension(destination) {
        return Err(PaletteImageError::UnsupportedFormat);
    }

    render_strip(colors)?
        .save(destination)
        .map_err(|error| PaletteImageError::Save(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_at_the_expected_dimensions() {
        let colors = vec![RgbColor { r: 255, g: 0, b: 0 }];
        let image = render_strip(&colors).unwrap();
        assert_eq!(image.dimensions(), (STRIP_WIDTH, STRIP_HEIGHT));
    }

    #[test]
    fn fills_the_full_width_with_no_gaps_for_several_colors() {
        let colors = vec![
            RgbColor { r: 255, g: 0, b: 0 },
            RgbColor { r: 0, g: 255, b: 0 },
            RgbColor { r: 0, g: 0, b: 255 },
        ];
        let image = render_strip(&colors).unwrap();
        for x in 0..STRIP_WIDTH {
            let pixel = image.get_pixel(x, STRIP_HEIGHT / 2);
            assert!(pixel.0 == [255, 0, 0] || pixel.0 == [0, 255, 0] || pixel.0 == [0, 0, 255]);
        }
    }

    #[test]
    fn first_and_last_segments_show_the_first_and_last_colors() {
        let colors = vec![
            RgbColor { r: 255, g: 0, b: 0 },
            RgbColor { r: 0, g: 0, b: 255 },
        ];
        let image = render_strip(&colors).unwrap();
        assert_eq!(image.get_pixel(0, 0).0, [255, 0, 0]);
        assert_eq!(image.get_pixel(STRIP_WIDTH - 1, 0).0, [0, 0, 255]);
    }

    #[test]
    fn handles_a_single_color_without_dividing_by_zero() {
        let colors = vec![RgbColor {
            r: 10,
            g: 20,
            b: 30,
        }];
        let image = render_strip(&colors).unwrap();
        assert_eq!(image.get_pixel(0, 0).0, [10, 20, 30]);
        assert_eq!(image.get_pixel(STRIP_WIDTH - 1, 0).0, [10, 20, 30]);
    }

    #[test]
    fn rejects_an_empty_palette() {
        assert!(matches!(
            render_strip(&[]),
            Err(PaletteImageError::EmptyPalette)
        ));
    }

    #[test]
    fn rejects_more_than_the_supported_color_count() {
        let colors = vec![RgbColor { r: 1, g: 2, b: 3 }; MAX_COLORS + 1];
        assert!(matches!(
            render_strip(&colors),
            Err(PaletteImageError::TooManyColors)
        ));
    }

    #[test]
    fn saves_only_png_destinations() {
        let colors = vec![RgbColor { r: 1, g: 2, b: 3 }];
        assert!(matches!(
            save_strip(&colors, Path::new("palette.webp")),
            Err(PaletteImageError::UnsupportedFormat)
        ));
    }
}
