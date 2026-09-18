use std::{
    fs,
    path::{Path, PathBuf},
};

use image::ImageReader;
use thiserror::Error;

use crate::models::ImageMetadata;

const MAX_FILE_BYTES: u64 = 100 * 1024 * 1024;
const MAX_PIXEL_COUNT: u64 = 100_000_000;

#[derive(Debug, Error)]
pub enum ImageServiceError {
    #[error("The selected path is not a file.")]
    NotAFile,
    #[error("The image is larger than 100 MB.")]
    FileTooLarge,
    #[error("The image dimensions are too large to process safely.")]
    DimensionsTooLarge,
    #[error("The image could not be read: {0}")]
    Read(String),
    #[error("The image could not be cached: {0}")]
    Cache(String),
    #[error("The image could not be found. Try importing it again.")]
    CacheMissing,
}

/// Persists renderer-supplied bytes (imported via file picker, drag-and-drop, or
/// clipboard, none of which carry a native path) to `destination_dir` so later
/// commands can take a path instead of resending the whole image over IPC.
pub fn cache_source_bytes(
    bytes: &[u8],
    destination_dir: &Path,
) -> Result<PathBuf, ImageServiceError> {
    fs::create_dir_all(destination_dir)
        .map_err(|error| ImageServiceError::Cache(error.to_string()))?;
    let path = destination_dir.join(format!("source-{}.bin", unique_suffix()));
    fs::write(&path, bytes).map_err(|error| ImageServiceError::Cache(error.to_string()))?;
    Ok(path)
}

/// Reads back bytes written by [`cache_source_bytes`].
pub fn read_cached_bytes(path: &str) -> Result<Vec<u8>, ImageServiceError> {
    fs::read(path).map_err(|_| ImageServiceError::CacheMissing)
}

fn unique_suffix() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{nanos:x}")
}

pub fn metadata(image_path: &str) -> Result<ImageMetadata, ImageServiceError> {
    let path = Path::new(image_path);
    if !path.is_file() {
        return Err(ImageServiceError::NotAFile);
    }

    let fs_metadata =
        fs::metadata(path).map_err(|error| ImageServiceError::Read(error.to_string()))?;
    if fs_metadata.len() > MAX_FILE_BYTES {
        return Err(ImageServiceError::FileTooLarge);
    }

    let reader = ImageReader::open(path)
        .map_err(|error| ImageServiceError::Read(error.to_string()))?
        .with_guessed_format()
        .map_err(|error| ImageServiceError::Read(error.to_string()))?;
    let format = reader
        .format()
        .map(|format| format.extensions_str()[0].to_owned())
        .unwrap_or_else(|| "unknown".to_owned());
    let (width, height) = reader
        .into_dimensions()
        .map_err(|error| ImageServiceError::Read(error.to_string()))?;

    if u64::from(width) * u64::from(height) > MAX_PIXEL_COUNT {
        return Err(ImageServiceError::DimensionsTooLarge);
    }

    Ok(ImageMetadata {
        file_name: path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("image")
            .to_owned(),
        width,
        height,
        format,
        file_size_bytes: fs_metadata.len(),
    })
}
