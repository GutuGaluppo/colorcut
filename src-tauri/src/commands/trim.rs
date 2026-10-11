use std::path::Path;

use crate::models::TrimResult;
use crate::services::trim_service;
use crate::AppState;

/// Crops a cutout to its subject plus `padding` pixels. Delegates all pixel work
/// to the trim service; this handler only maps the outcome to the contract.
#[tauri::command]
pub fn trim_to_subject(
    cutout_path: String,
    padding: u32,
    state: tauri::State<AppState>,
) -> Result<TrimResult, String> {
    trim_service::trim_cutout(Path::new(&cutout_path), &state.cutouts_dir, padding)
        .map(|outcome| TrimResult {
            cutout_path: outcome.cutout_path.to_string_lossy().into_owned(),
            x: outcome.rect.x,
            y: outcome.rect.y,
            width: outcome.rect.width,
            height: outcome.rect.height,
        })
        .map_err(|error| error.to_string())
}
