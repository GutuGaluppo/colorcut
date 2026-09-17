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
