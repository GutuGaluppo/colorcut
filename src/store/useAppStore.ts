import { create } from "zustand";
import type {
  ImageAsset,
  OperationStatus,
  PaletteCount,
  PaletteResult,
  PaletteSource,
  PreviewBackground,
  RemovalResult,
} from "../types/domain";

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const ZOOM_DEFAULT = 1;

export type ViewMode = "original" | "cutout" | "slider" | "side-by-side";

type AppState = {
  image: ImageAsset | null;
  removal: RemovalResult | null;
  palette: PaletteResult | null;
  paletteSource: PaletteSource;
  paletteCount: PaletteCount;
  operationStatus: OperationStatus;
  message: string;
  previewBackground: PreviewBackground;
  viewMode: ViewMode;
  sliderPosition: number;
  zoom: number;
  setImage: (image: ImageAsset) => void;
  setOperation: (status: OperationStatus, message?: string) => void;
  setPreviewBackground: (background: PreviewBackground) => void;
  setRemoval: (removal: RemovalResult) => void;
  setViewMode: (mode: ViewMode) => void;
  setSliderPosition: (position: number) => void;
  setPalette: (palette: PaletteResult) => void;
  setPaletteSource: (source: PaletteSource) => void;
  setPaletteCount: (count: PaletteCount) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  clearImage: () => void;
};

function revoke(url?: string) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function clampZoom(zoom: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom * 100) / 100));
}

export const useAppStore = create<AppState>((set, get) => ({
  image: null,
  removal: null,
  palette: null,
  paletteSource: "original",
  paletteCount: 8,
  operationStatus: "idle",
  message: "Ready",
  previewBackground: "checker",
  viewMode: "original",
  sliderPosition: 50,
  zoom: ZOOM_DEFAULT,

  setImage: (image) => {
    revoke(get().image?.sourceUrl);
    set({
      image,
      removal: null,
      palette: null,
      operationStatus: "success",
      message: "Image ready",
      viewMode: "original",
      sliderPosition: 50,
      zoom: ZOOM_DEFAULT,
    });
  },

  setOperation: (operationStatus, message = "") => set({ operationStatus, message }),
  setPreviewBackground: (previewBackground) => set({ previewBackground }),
  setRemoval: (removal) =>
    set({ removal, viewMode: "cutout", operationStatus: "success", message: "Background removed" }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSliderPosition: (position) => set({ sliderPosition: Math.min(100, Math.max(0, position)) }),
  setPalette: (palette) => set({ palette, operationStatus: "success", message: "Palette extracted" }),
  setPaletteSource: (paletteSource) => set({ paletteSource }),
  setPaletteCount: (paletteCount) => set({ paletteCount }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  zoomIn: () => set((state) => ({ zoom: clampZoom(state.zoom + ZOOM_STEP) })),
  zoomOut: () => set((state) => ({ zoom: clampZoom(state.zoom - ZOOM_STEP) })),
  resetZoom: () => set({ zoom: ZOOM_DEFAULT }),

  clearImage: () => {
    revoke(get().image?.sourceUrl);
    set({
      image: null,
      removal: null,
      palette: null,
      operationStatus: "idle",
      message: "Ready",
      viewMode: "original",
      sliderPosition: 50,
      zoom: ZOOM_DEFAULT,
    });
  },
}));

