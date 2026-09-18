use tauri::ipc::{InvokeBody, Request};

use crate::{models::ImageMetadata, services::image_service, AppState};

#[tauri::command]
pub fn get_image_metadata(image_path: String) -> Result<ImageMetadata, String> {
    image_service::metadata(&image_path).map_err(|error| error.to_string())
}

/// Caches renderer-supplied image bytes to disk and returns their path.
///
/// Takes the raw IPC request body instead of a JSON `Vec<u8>` argument: a JSON
/// number array inflates a multi-megabyte image to tens of megabytes of text,
/// which the webview's IPC transport can fail to deliver ("Load failed") for
/// realistic photo sizes. The frontend must invoke this with the bytes as the
/// whole argument (e.g. `invoke("cache_source_image", uint8Array)`), not
/// wrapped in a named field, so the request carries `InvokeBody::Raw` instead.
#[tauri::command]
pub fn cache_source_image(
    request: Request<'_>,
    state: tauri::State<AppState>,
) -> Result<String, String> {
    let bytes = match request.body() {
        InvokeBody::Raw(bytes) => bytes,
        InvokeBody::Json(_) => return Err("Expected raw image bytes.".to_owned()),
    };

    image_service::cache_source_bytes(bytes, &state.originals_dir)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|error| error.to_string())
}
