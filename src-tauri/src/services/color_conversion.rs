use crate::models::{HslColor, OklchColor, RgbColor};

pub fn to_hex(rgb: RgbColor) -> String {
    format!("#{:02X}{:02X}{:02X}", rgb.r, rgb.g, rgb.b)
}

pub fn rgb_to_hsl(rgb: RgbColor) -> HslColor {
    let r = rgb.r as f32 / 255.0;
    let g = rgb.g as f32 / 255.0;
    let b = rgb.b as f32 / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f32::EPSILON {
        return HslColor {
            h: 0.0,
            s: 0.0,
            l: l * 100.0,
        };
    }

    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };

    let mut h = if max == r {
        (g - b) / d
    } else if max == g {
        (b - r) / d + 2.0
    } else {
        (r - g) / d + 4.0
    };
    h *= 60.0;
    if h < 0.0 {
        h += 360.0;
    }

    HslColor {
        h,
        s: s * 100.0,
        l: l * 100.0,
    }
}

fn srgb_channel_to_linear(c: f32) -> f32 {
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

/// RGB -> OKLCH via OKLab, using Björn Ottosson's published sRGB/OKLab matrices.
/// `l` is 0-1, `c` is typically 0-~0.4, `h` is degrees 0-360.
pub fn rgb_to_oklch(rgb: RgbColor) -> OklchColor {
    let r = srgb_channel_to_linear(rgb.r as f32 / 255.0);
    let g = srgb_channel_to_linear(rgb.g as f32 / 255.0);
    let b = srgb_channel_to_linear(rgb.b as f32 / 255.0);

    let l = 0.412_221_47 * r + 0.536_332_54 * g + 0.051_445_995 * b;
    let m = 0.211_903_5 * r + 0.680_699_5 * g + 0.107_396_96 * b;
    let s = 0.088_302_46 * r + 0.281_718_84 * g + 0.629_978_7 * b;

    let l_ = l.cbrt();
    let m_ = m.cbrt();
    let s_ = s.cbrt();

    let ok_l = 0.210_454_26 * l_ + 0.793_617_8 * m_ - 0.004_072_047 * s_;
    let ok_a = 1.977_998_5 * l_ - 2.428_592_2 * m_ + 0.450_593_7 * s_;
    let ok_b = 0.025_904_037 * l_ + 0.782_771_77 * m_ - 0.808_675_77 * s_;

    let c = (ok_a * ok_a + ok_b * ok_b).sqrt();
    let mut h = ok_b.atan2(ok_a).to_degrees();
    if h < 0.0 {
        h += 360.0;
    }

    OklchColor { l: ok_l, c, h }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(a: f32, b: f32, tolerance: f32) {
        assert!(
            (a - b).abs() <= tolerance,
            "expected {a} to be within {tolerance} of {b}"
        );
    }

    #[test]
    fn hex_formats_uppercase_with_leading_hash() {
        assert_eq!(
            to_hex(RgbColor {
                r: 47,
                g: 140,
                b: 255
            }),
            "#2F8CFF"
        );
        assert_eq!(to_hex(RgbColor { r: 0, g: 0, b: 0 }), "#000000");
        assert_eq!(
            to_hex(RgbColor {
                r: 255,
                g: 255,
                b: 255
            }),
            "#FFFFFF"
        );
    }

    #[test]
    fn white_is_achromatic_in_hsl() {
        let hsl = rgb_to_hsl(RgbColor {
            r: 255,
            g: 255,
            b: 255,
        });
        assert_close(hsl.l, 100.0, 0.01);
        assert_close(hsl.s, 0.0, 0.01);
    }

    #[test]
    fn black_is_achromatic_in_hsl() {
        let hsl = rgb_to_hsl(RgbColor { r: 0, g: 0, b: 0 });
        assert_close(hsl.l, 0.0, 0.01);
        assert_close(hsl.s, 0.0, 0.01);
    }

    #[test]
    fn pure_red_hsl_matches_known_value() {
        let hsl = rgb_to_hsl(RgbColor { r: 255, g: 0, b: 0 });
        assert_close(hsl.h, 0.0, 0.5);
        assert_close(hsl.s, 100.0, 0.5);
        assert_close(hsl.l, 50.0, 0.5);
    }

    #[test]
    fn pure_green_hsl_hue_is_120_degrees() {
        let hsl = rgb_to_hsl(RgbColor { r: 0, g: 255, b: 0 });
        assert_close(hsl.h, 120.0, 0.5);
    }

    #[test]
    fn white_is_achromatic_in_oklch() {
        let oklch = rgb_to_oklch(RgbColor {
            r: 255,
            g: 255,
            b: 255,
        });
        assert_close(oklch.l, 1.0, 0.01);
        assert_close(oklch.c, 0.0, 0.01);
    }

    #[test]
    fn black_has_zero_lightness_in_oklch() {
        let oklch = rgb_to_oklch(RgbColor { r: 0, g: 0, b: 0 });
        assert_close(oklch.l, 0.0, 0.01);
        assert_close(oklch.c, 0.0, 0.01);
    }
}
