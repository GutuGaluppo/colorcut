#[tauri::command]
pub async fn export_cutout(_source_path: String, _destination_path: String) -> Result<(), String> {
    Err("Cutout export is unavailable until background removal is implemented.".to_owned())
}

