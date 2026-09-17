import { create } from "zustand";
import type {
  ImageAsset,
  OperationStatus,
  PaletteResult,
  PreviewBackground,
  RemovalResult,
} from "../types/domain";

type AppState = {
  image: ImageAsset | null;
  removal: RemovalResult | null;
  palette: PaletteResult | null;
  operationStatus: OperationStatus;
  message: string;
  previewBackground: PreviewBackground;
  setImage: (image: ImageAsset) => void;
  setOperation: (status: OperationStatus, message?: string) => void;
  setPreviewBackground: (background: PreviewBackground) => void;
  clearImage: () => void;
};

function revoke(url?: string) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export const useAppStore = create<AppState>((set, get) => ({
  image: null,
  removal: null,
  palette: null,
  operationStatus: "idle",
  message: "Ready",
  previewBackground: "checker",

  setImage: (image) => {
    revoke(get().image?.sourceUrl);
    revoke(get().removal?.previewUrl);
    set({
      image,
      removal: null,
      palette: null,
      operationStatus: "success",
      message: "Image ready",
    });
  },

  setOperation: (operationStatus, message = "") => set({ operationStatus, message }),
  setPreviewBackground: (previewBackground) => set({ previewBackground }),

  clearImage: () => {
    revoke(get().image?.sourceUrl);
    revoke(get().removal?.previewUrl);
    set({
      image: null,
      removal: null,
      palette: null,
      operationStatus: "idle",
      message: "Ready",
    });
  },
}));

