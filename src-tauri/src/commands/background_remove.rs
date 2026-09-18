use crate::models::RemovalResult;
use crate::services::image_service;
use crate::AppState;

#[tauri::command]
pub fn remove_background(
    source_path: String,
    state: tauri::State<AppState>,
) -> Result<RemovalResult, String> {
    let image_bytes =
        image_service::read_cached_bytes(&source_path).map_err(|error| error.to_string())?;
    state
        .background_removal
        .remove_background(&image_bytes, &state.cutouts_dir)
        .map(|outcome| RemovalResult {
            cutout_path: outcome.cutout_path.to_string_lossy().into_owned(),
            mask_path: None,
            processing_time_ms: outcome.processing_time_ms,
        })
        .map_err(|error| error.to_string())
}
