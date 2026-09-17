use crate::models::PaletteResult;

#[tauri::command]
pub async fn extract_palette(
    _image_path: String,
    _source: String,
    _count: u8,
) -> Result<PaletteResult, String> {
    Err("Palette extraction is not implemented in the starter scaffold.".to_owned())
}

