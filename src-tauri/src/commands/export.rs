use std::path::Path;

use crate::models::RgbColor;
use crate::services::{export_service, palette_image};

#[tauri::command]
pub fn export_cutout(source_path: String, destination_path: String) -> Result<(), String> {
    export_service::copy_or_convert(Path::new(&source_path), Path::new(&destination_path))
        .map_err(|error| error.to_string())
}

/// Writes already-formatted text (JSON/CSS/TXT palette exports) to a user-chosen
/// destination. Formatting stays in the frontend, next to the PaletteResult data
/// it's built from; this command is intentionally just an fs::write.
#[tauri::command]
pub fn write_text_file(contents: String, destination_path: String) -> Result<(), String> {
    export_service::write_palette_text(&contents, Path::new(&destination_path))
        .map_err(|error| error.to_string())
}

/// Renders the palette as a simple horizontal PNG strip and saves it.
#[tauri::command]
pub fn export_palette_image(colors: Vec<RgbColor>, destination_path: String) -> Result<(), String> {
    palette_image::save_strip(&colors, Path::new(&destination_path))
        .map_err(|error| error.to_string())
}
