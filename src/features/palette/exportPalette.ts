import type { PaletteResult } from "../../types/domain";

export type PaletteExportFormat = "json" | "css" | "txt";

export function paletteToJson(palette: PaletteResult): string {
  return JSON.stringify(palette, null, 2);
}

export function paletteToCss(palette: PaletteResult): string {
  const lines = palette.colors.map((color, index) => `  --color-${index + 1}: ${color.hex};`);
  return `:root {\n${lines.join("\n")}\n}\n`;
}

export function paletteToTxt(palette: PaletteResult): string {
  const lines = palette.colors.map((color) => {
    const rgb = `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
    const hsl = `hsl(${Math.round(color.hsl.h)}, ${Math.round(color.hsl.s)}%, ${Math.round(color.hsl.l)}%)`;
    return `${color.hex}\t${rgb}\t${hsl}\t${color.percentage.toFixed(1)}%`;
  });
  return `${lines.join("\n")}\n`;
}

export function formatPalette(palette: PaletteResult, format: PaletteExportFormat): string {
  switch (format) {
    case "json":
      return paletteToJson(palette);
    case "css":
      return paletteToCss(palette);
    case "txt":
      return paletteToTxt(palette);
  }
}
