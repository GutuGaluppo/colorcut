use serde::Serialize;

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
    pub percentage: f32,
}

#[derive(Debug, Serialize)]
pub struct RgbColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Serialize)]
pub struct HslColor {
    pub h: f32,
    pub s: f32,
    pub l: f32,
}
