use crate::models::RemovalResult;

#[tauri::command]
pub async fn remove_background(_image_path: String) -> Result<RemovalResult, String> {
    Err("Background removal is not implemented. Complete the model evaluation first.".to_owned())
}

