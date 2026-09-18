use crate::models::PaletteResult;
use crate::services::image_service;
use crate::services::palette_service::{self, PaletteSource};

#[tauri::command]
pub fn extract_palette(
    source_path: Option<String>,
    source: String,
    count: u8,
    cutout_path: Option<String>,
) -> Result<PaletteResult, String> {
    let source = PaletteSource::parse(&source).map_err(|error| error.to_string())?;

    // Subject mode samples the already-decoded cutout file below; the original
    // bytes are never read for it, so we avoid requiring (and re-transferring) them.
    let image_bytes = match source {
        PaletteSource::Original => {
            let path = source_path
                .ok_or_else(|| "Import an image before extracting a palette.".to_owned())?;
            image_service::read_cached_bytes(&path).map_err(|error| error.to_string())?
        }
        PaletteSource::Subject => Vec::new(),
    };

    palette_service::extract_palette(
        &image_bytes,
        source,
        count,
        cutout_path.as_ref().map(std::path::Path::new),
    )
    .map_err(|error| error.to_string())
}
