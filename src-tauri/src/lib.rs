mod commands;
mod models;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::image_io::get_image_metadata,
            commands::background_remove::remove_background,
            commands::palette_extract::extract_palette,
            commands::export::export_cutout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ColorCut");
}

