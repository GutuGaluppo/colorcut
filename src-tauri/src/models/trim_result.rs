use serde::Serialize;

/// The trimmed cutout and where its crop sits in the original image, so the
/// renderer can crop the original to the same rectangle.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrimResult {
    pub cutout_path: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}
