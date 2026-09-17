use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageMetadata {
    pub file_name: String,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub file_size_bytes: u64,
}
