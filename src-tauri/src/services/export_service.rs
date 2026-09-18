use std::path::Path;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ExportError {
    #[error("The cutout could not be found. Try removing the background again.")]
    SourceMissing,
    #[error("The image could not be read: {0}")]
    Decode(String),
    #[error("Choose a PNG or WebP destination.")]
    UnsupportedImageFormat,
    #[error("Choose a JSON, CSS, or TXT destination.")]
    UnsupportedTextFormat,
    #[error("The export could not be saved: {0}")]
    Save(String),
}

fn has_extension(path: &Path, extension: &str) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case(extension))
}

/// Copies `source` (always one of our own PNG cutouts) to `destination`, converting
/// format when the destination's extension differs from the source's. A PNG
/// destination is a cheap, lossless byte copy; a WebP destination goes through
/// a real decode + re-encode. Other extensions are rejected.
pub fn copy_or_convert(source: &Path, destination: &Path) -> Result<(), ExportError> {
    if !source.is_file() {
        return Err(ExportError::SourceMissing);
    }

    if has_extension(destination, "png") {
        std::fs::copy(source, destination).map_err(|error| ExportError::Save(error.to_string()))?;
    } else if has_extension(destination, "webp") {
        let image = image::open(source).map_err(|error| ExportError::Decode(error.to_string()))?;
        image
            .save(destination)
            .map_err(|error| ExportError::Save(error.to_string()))?;
    } else {
        return Err(ExportError::UnsupportedImageFormat);
    }
    Ok(())
}

/// Writes a frontend-formatted palette only to one of the formats exposed by
/// the save dialog. Keeping this allow-list at the native boundary prevents a
/// stale or compromised renderer from presenting arbitrary file types as a
/// successful palette export.
pub fn write_palette_text(contents: &str, destination: &Path) -> Result<(), ExportError> {
    let supported = ["json", "css", "txt"]
        .iter()
        .any(|extension| has_extension(destination, extension));
    if !supported {
        return Err(ExportError::UnsupportedTextFormat);
    }

    std::fs::write(destination, contents).map_err(|error| ExportError::Save(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};

    fn write_test_png(path: &Path) {
        let img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(4, 4, |x, y| {
            if (x + y) % 2 == 0 {
                Rgba([255, 0, 0, 255])
            } else {
                Rgba([0, 0, 255, 128])
            }
        });
        img.save(path).unwrap();
    }

    #[test]
    fn fails_clearly_when_the_source_is_missing() {
        let result = copy_or_convert(
            Path::new("/nonexistent/cutout.png"),
            Path::new("/tmp/out.png"),
        );
        assert!(matches!(result, Err(ExportError::SourceMissing)));
    }

    #[test]
    fn copies_png_to_png_byte_for_byte() {
        let dir = std::env::temp_dir().join(format!("colorcut-export-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let source = dir.join("source.png");
        let destination = dir.join("destination.png");
        write_test_png(&source);

        copy_or_convert(&source, &destination).expect("copy should succeed");

        assert_eq!(
            std::fs::read(&source).unwrap(),
            std::fs::read(&destination).unwrap()
        );
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn converts_png_to_webp_preserving_dimensions_and_transparency() {
        let dir =
            std::env::temp_dir().join(format!("colorcut-export-test-webp-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let source = dir.join("source.png");
        let destination = dir.join("destination.webp");
        write_test_png(&source);

        copy_or_convert(&source, &destination).expect("conversion should succeed");

        let converted = image::open(&destination)
            .expect("webp output should be readable")
            .to_rgba8();
        assert_eq!(converted.dimensions(), (4, 4));
        // Fully-opaque source pixel should stay opaque; lossless WebP preserves alpha exactly.
        assert_eq!(converted.get_pixel(0, 0).0[3], 255);
        assert_eq!(converted.get_pixel(1, 0).0[3], 128);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rejects_unsupported_image_export_extensions() {
        let dir = std::env::temp_dir().join(format!(
            "colorcut-export-test-unsupported-{}",
            std::process::id()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let source = dir.join("source.png");
        write_test_png(&source);

        let result = copy_or_convert(&source, &dir.join("destination.jpg"));

        assert!(matches!(result, Err(ExportError::UnsupportedImageFormat)));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn writes_only_supported_palette_text_formats() {
        let dir =
            std::env::temp_dir().join(format!("colorcut-export-test-text-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let destination = dir.join("palette.css");

        write_palette_text(":root {}", &destination).expect("CSS export should succeed");
        assert_eq!(std::fs::read_to_string(destination).unwrap(), ":root {}");
        assert!(matches!(
            write_palette_text("palette", &dir.join("palette.html")),
            Err(ExportError::UnsupportedTextFormat)
        ));

        std::fs::remove_dir_all(&dir).ok();
    }
}
