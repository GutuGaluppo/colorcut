use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaletteResult {
    pub source: String,
    pub count: u8,
    pub colors: Vec<PaletteColor>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaletteColor {
    pub id: String,
    pub hex: String,
    pub rgb: RgbColor,
    pub hsl: HslColor,
    pub oklch: OklchColor,
    pub percentage: f32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct RgbColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Copy, Serialize)]
pub struct HslColor {
    pub h: f32,
    pub s: f32,
    pub l: f32,
}

#[derive(Debug, Clone, Copy, Serialize)]
pub struct OklchColor {
    pub l: f32,
    pub c: f32,
    pub h: f32,
}
