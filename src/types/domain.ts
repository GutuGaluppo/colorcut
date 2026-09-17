export type OperationStatus = "idle" | "processing" | "success" | "error";

export type ImageAsset = {
  id: string;
  sourceUrl: string;
  fileName: string;
  width: number;
  height: number;
  mimeType: string;
  fileSizeBytes: number;
};

export type RemovalResult = {
  cutoutPath: string;
  previewUrl?: string;
  maskPath?: string;
  processingTimeMs: number;
};

export type RgbColor = { r: number; g: number; b: number };
export type HslColor = { h: number; s: number; l: number };
export type OklchColor = { l: number; c: number; h: number };

export type PaletteColor = {
  id: string;
  hex: string;
  rgb: RgbColor;
  hsl: HslColor;
  oklch?: OklchColor;
  percentage: number;
};

export type PaletteResult = {
  source: "original" | "subject";
  count: 4 | 6 | 8 | 12 | 16;
  colors: PaletteColor[];
};

export type PreviewBackground = "checker" | "white" | "black";

