mod commands;
mod models;
mod services;

use std::path::PathBuf;

use tauri::path::BaseDirectory;
use tauri::Manager;

use services::background_removal_service::BackgroundRemovalService;

pub struct AppState {
    pub background_removal: BackgroundRemovalService,
    pub cutouts_dir: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let model_path = app.path().resolve(
                "resources/models/isnet-general-use.onnx",
                BaseDirectory::Resource,
            )?;
            let cutouts_dir = app.path().app_cache_dir()?.join("cutouts");

            app.manage(AppState {
                background_removal: BackgroundRemovalService::new(model_path),
                cutouts_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::image_io::get_image_metadata,
            commands::background_remove::remove_background,
            commands::palette_extract::extract_palette,
            commands::export::export_cutout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ColorCut");
}
