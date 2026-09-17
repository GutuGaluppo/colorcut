use std::path::Path;

#[tauri::command]
pub fn export_cutout(source_path: String, destination_path: String) -> Result<(), String> {
    let source = Path::new(&source_path);
    if !source.is_file() {
        return Err("The cutout could not be found. Try removing the background again.".to_owned());
    }

    std::fs::copy(source, &destination_path).map_err(|error| error.to_string())?;
    Ok(())
}

/// Writes already-formatted text (JSON/CSS/TXT palette exports) to a user-chosen
/// destination. Formatting stays in the frontend, next to the PaletteResult data
/// it's built from; this command is intentionally just an fs::write.
#[tauri::command]
pub fn write_text_file(contents: String, destination_path: String) -> Result<(), String> {
    std::fs::write(destination_path, contents).map_err(|error| error.to_string())
}
