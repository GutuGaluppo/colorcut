use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemovalResult {
    pub cutout_path: String,
    pub mask_path: Option<String>,
    pub processing_time_ms: u64,
}

