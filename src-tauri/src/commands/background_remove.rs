use crate::models::RemovalResult;
use crate::AppState;

#[tauri::command]
pub fn remove_background(
    image_bytes: Vec<u8>,
    state: tauri::State<AppState>,
) -> Result<RemovalResult, String> {
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
