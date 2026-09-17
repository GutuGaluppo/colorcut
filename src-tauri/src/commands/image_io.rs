use crate::{models::ImageMetadata, services::image_service};

#[tauri::command]
pub fn get_image_metadata(image_path: String) -> Result<ImageMetadata, String> {
    image_service::metadata(&image_path).map_err(|error| error.to_string())
}
