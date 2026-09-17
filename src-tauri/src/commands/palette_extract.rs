use crate::models::PaletteResult;
use crate::services::palette_service::{self, PaletteSource};

#[tauri::command]
pub fn extract_palette(
    image_bytes: Vec<u8>,
    source: String,
    count: u8,
    cutout_path: Option<String>,
) -> Result<PaletteResult, String> {
    let source = PaletteSource::parse(&source).map_err(|error| error.to_string())?;
    palette_service::extract_palette(
        &image_bytes,
        source,
        count,
        cutout_path.as_ref().map(std::path::Path::new),
    )
    .map_err(|error| error.to_string())
}
