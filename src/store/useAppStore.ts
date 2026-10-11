import { create } from "zustand";
import type {
  ImageAsset,
  OperationStatus,
  PaletteSize,
  PaletteResult,
  PaletteSource,
  PreviewBackground,
  RemovalResult,
} from "../types/domain";

/** The full-frame image and cutout, kept so a trim can be undone. */
type FullFrame = { image: ImageAsset; removal: RemovalResult };

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
  paletteCount: PaletteSize;
  operationStatus: OperationStatus;
  message: string;
  previewBackground: PreviewBackground;
  viewMode: ViewMode;
  sliderPosition: number;
  zoom: number;
  fullFrame: FullFrame | null;
  setImage: (image: ImageAsset) => void;
  setOperation: (status: OperationStatus, message?: string) => void;
  setPreviewBackground: (background: PreviewBackground) => void;
  setRemoval: (removal: RemovalResult) => void;
  setViewMode: (mode: ViewMode) => void;
  setSliderPosition: (position: number) => void;
  setPalette: (palette: PaletteResult, message?: string) => void;
  setPaletteSource: (source: PaletteSource) => void;
  setPaletteCount: (count: PaletteSize) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  clearImage: () => void;
  applyTrim: (image: ImageAsset, removal: RemovalResult) => void;
  restoreFullFrame: () => void;
};

function revoke(url?: string) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

/** Frees every blob URL the store holds for the current image, including a trim's full frame. */
function releaseFrames(state: Pick<AppState, "image" | "fullFrame">) {
  revoke(state.image?.sourceUrl);
  if (state.fullFrame) revoke(state.fullFrame.image.sourceUrl);
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
  fullFrame: null,

  setImage: (image) => {
    releaseFrames(get());
    set({
      image,
      removal: null,
      palette: null,
      fullFrame: null,
      operationStatus: "success",
      message: "Image ready",
      viewMode: "original",
      sliderPosition: 50,
      zoom: ZOOM_DEFAULT,
    });
  },

  setOperation: (operationStatus, message = "") => set({ operationStatus, message }),
  setPreviewBackground: (previewBackground) => set({ previewBackground }),
  setRemoval: (removal) => {
    // A new cutout becomes the base frame, so the earlier full frame is no longer reachable.
    const { fullFrame, image } = get();
    if (fullFrame && fullFrame.image.sourceUrl !== image?.sourceUrl) revoke(fullFrame.image.sourceUrl);
    set({
      removal,
      fullFrame: null,
      viewMode: "cutout",
      operationStatus: "success",
      message: "Background removed",
    });
  },
  setViewMode: (viewMode) => set({ viewMode }),
  setSliderPosition: (position) => set({ sliderPosition: Math.min(100, Math.max(0, position)) }),
  setPalette: (palette, message = "Palette extracted") => set({ palette, operationStatus: "success", message }),
  setPaletteSource: (paletteSource) => set({ paletteSource }),
  setPaletteCount: (paletteCount) => set({ paletteCount }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  zoomIn: () => set((state) => ({ zoom: clampZoom(state.zoom + ZOOM_STEP) })),
  zoomOut: () => set((state) => ({ zoom: clampZoom(state.zoom - ZOOM_STEP) })),
  resetZoom: () => set({ zoom: ZOOM_DEFAULT }),

  applyTrim: (image, removal) => {
    const state = get();
    if (!state.image || !state.removal) return;
    // The current frame is itself a trimmed copy when a full frame is held; release it before replacing.
    if (state.fullFrame && state.image.sourceUrl !== state.fullFrame.image.sourceUrl) {
      revoke(state.image.sourceUrl);
    }
    set({
      image,
      removal,
      fullFrame: state.fullFrame ?? { image: state.image, removal: state.removal },
    });
  },

  restoreFullFrame: () => {
    const state = get();
    if (!state.fullFrame || !state.image) return;
    revoke(state.image.sourceUrl);
    set({
      image: state.fullFrame.image,
      removal: state.fullFrame.removal,
      fullFrame: null,
    });
  },

  clearImage: () => {
    releaseFrames(get());
    set({
      image: null,
      removal: null,
      palette: null,
      fullFrame: null,
      operationStatus: "idle",
      message: "Ready",
      viewMode: "original",
      sliderPosition: 50,
      zoom: ZOOM_DEFAULT,
    });
  },
}));

