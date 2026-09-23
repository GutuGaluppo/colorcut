use crate::models::{PhotoroomCloudError, PhotoroomLicenseStatus, RemovalResult};
use crate::services::image_service;
use crate::AppState;

#[tauri::command]
pub async fn remove_background_cloud(
    source_path: String,
    state: tauri::State<'_, AppState>,
) -> Result<RemovalResult, PhotoroomCloudError> {
    let image_bytes = image_service::read_cached_bytes(&source_path)
        .map_err(|error| PhotoroomCloudError::unavailable(error.to_string()))?;
    state
        .photoroom_removal
        .remove_background(&image_bytes, &state.cutouts_dir)
        .await
        .map(|outcome| RemovalResult {
            cutout_path: outcome.cutout_path.to_string_lossy().into_owned(),
            mask_path: None,
            processing_time_ms: outcome.processing_time_ms,
        })
        .map_err(PhotoroomCloudError::from)
}

#[tauri::command]
pub fn set_photoroom_license(code: String, state: tauri::State<AppState>) -> Result<(), String> {
    state
        .photoroom_removal
        .set_license(&code)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_photoroom_license_status(
    state: tauri::State<AppState>,
) -> Result<PhotoroomLicenseStatus, String> {
    Ok(state.photoroom_removal.license_status())
}
