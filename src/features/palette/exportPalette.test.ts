import { describe, expect, it } from "vitest";
import { formatPalette, paletteToCss, paletteToJson, paletteToTxt } from "./exportPalette";
import type { PaletteResult } from "../../types/domain";

const palette: PaletteResult = {
  source: "original",
  count: 4,
  colors: [
    {
      id: "2f8cff",
      hex: "#2F8CFF",
      rgb: { r: 47, g: 140, b: 255 },
      hsl: { h: 214.2, s: 100, l: 59.2 },
      oklch: { l: 0.62, c: 0.19, h: 259.1 },
      percentage: 62.5,
    },
    {
      id: "45d98c",
      hex: "#45D98C",
      rgb: { r: 69, g: 217, b: 140 },
      hsl: { h: 148.9, s: 60.1, l: 56.1 },
      oklch: { l: 0.78, c: 0.15, h: 158.3 },
      percentage: 37.5,
    },
  ],
};

describe("paletteToJson", () => {
  it("round-trips the full palette structure", () => {
    const parsed = JSON.parse(paletteToJson(palette));
    expect(parsed).toEqual(palette);
  });
});

describe("paletteToCss", () => {
  it("emits one custom property per color inside a :root block", () => {
    const css = paletteToCss(palette);
    expect(css).toContain(":root {");
    expect(css).toContain("--color-1: #2F8CFF;");
    expect(css).toContain("--color-2: #45D98C;");
    expect(css.trim().endsWith("}")).toBe(true);
  });
});

describe("paletteToTxt", () => {
  it("lists hex, rgb, hsl, and percentage per line", () => {
    const txt = paletteToTxt(palette);
    const lines = txt.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("#2F8CFF");
    expect(lines[0]).toContain("rgb(47, 140, 255)");
    expect(lines[0]).toContain("hsl(214, 100%, 59%)");
    expect(lines[0]).toContain("62.5%");
  });
});

describe("formatPalette", () => {
  it("dispatches to the matching formatter", () => {
    expect(formatPalette(palette, "json")).toBe(paletteToJson(palette));
    expect(formatPalette(palette, "css")).toBe(paletteToCss(palette));
    expect(formatPalette(palette, "txt")).toBe(paletteToTxt(palette));
  });
});
