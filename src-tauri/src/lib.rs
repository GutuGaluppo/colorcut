mod commands;
mod models;
mod services;

use std::path::PathBuf;

use tauri::path::BaseDirectory;
use tauri::Manager;

use services::background_removal_service::BackgroundRemovalService;
use services::photoroom_removal_service::PhotoroomRemovalService;

/// Placeholder until IMPLEMENTATION.md Phase 6 step 3 (ADR-014) deploys the real
/// Cloudflare Worker proxy. Update once that URL exists; the cloud cutout command
/// will fail with a network/unavailable error against this placeholder, which is
/// expected and distinct from the missing-license and no-credit errors it also maps.
const PHOTOROOM_PROXY_URL: &str =
    "https://colorcut-photoroom-proxy.example.workers.dev/remove-background";

pub struct AppState {
    pub background_removal: BackgroundRemovalService,
    pub photoroom_removal: PhotoroomRemovalService,
    pub cutouts_dir: PathBuf,
    pub originals_dir: PathBuf,
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
            let originals_dir = app.path().app_cache_dir()?.join("originals");
            let license_path = app.path().app_config_dir()?.join("photoroom-license.json");

            app.manage(AppState {
                background_removal: BackgroundRemovalService::new(model_path),
                photoroom_removal: PhotoroomRemovalService::new(
                    PHOTOROOM_PROXY_URL.to_owned(),
                    license_path,
                ),
                cutouts_dir,
                originals_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::image_io::get_image_metadata,
            commands::image_io::cache_source_image,
            commands::background_remove::remove_background,
            commands::palette_extract::extract_palette,
            commands::export::export_cutout,
            commands::export::write_text_file,
            commands::export::export_palette_image,
            commands::photoroom::remove_background_cloud,
            commands::photoroom::set_photoroom_license,
            commands::photoroom::get_photoroom_license_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ColorCut");
}
