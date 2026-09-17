import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "./useAppStore";
import type { ImageAsset } from "../types/domain";

function makeAsset(overrides: Partial<ImageAsset> = {}): ImageAsset {
  return {
    id: "asset-1",
    sourceUrl: "blob:one",
    fileName: "cat.png",
    width: 100,
    height: 80,
    mimeType: "image/png",
    fileSizeBytes: 1024,
    ...overrides,
  };
}

describe("useAppStore", () => {
  const initialState = useAppStore.getState();
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    useAppStore.setState(initialState, true);
    URL.revokeObjectURL = originalRevoke;
  });

  it("marks the image ready and resets removal, palette, and zoom", () => {
    useAppStore.setState({ zoom: 2 });
    useAppStore.getState().setImage(makeAsset());

    const state = useAppStore.getState();
    expect(state.image?.fileName).toBe("cat.png");
    expect(state.removal).toBeNull();
    expect(state.palette).toBeNull();
    expect(state.zoom).toBe(1);
    expect(state.operationStatus).toBe("success");
  });

  it("revokes the previous object URL when a new image replaces it", () => {
    useAppStore.getState().setImage(makeAsset({ sourceUrl: "blob:one" }));
    useAppStore.getState().setImage(makeAsset({ sourceUrl: "blob:two" }));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:one");
  });

  it("clears all image-derived state and revokes its URL", () => {
    useAppStore.getState().setImage(makeAsset());
    useAppStore.getState().clearImage();

    const state = useAppStore.getState();
    expect(state.image).toBeNull();
    expect(state.operationStatus).toBe("idle");
    expect(state.message).toBe("Ready");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:one");
  });

  it("clamps zoom within bounds when stepping in and out", () => {
    useAppStore.setState({ zoom: 4 });
    useAppStore.getState().zoomIn();
    expect(useAppStore.getState().zoom).toBe(4);

    useAppStore.setState({ zoom: 0.25 });
    useAppStore.getState().zoomOut();
    expect(useAppStore.getState().zoom).toBe(0.25);
  });

  it("steps zoom by 0.25 and resets to 1", () => {
    useAppStore.setState({ zoom: 1 });
    useAppStore.getState().zoomIn();
    expect(useAppStore.getState().zoom).toBe(1.25);

    useAppStore.getState().resetZoom();
    expect(useAppStore.getState().zoom).toBe(1);
  });

  it("updates the preview background independently of other state", () => {
    useAppStore.getState().setPreviewBackground("black");
    expect(useAppStore.getState().previewBackground).toBe("black");
  });

  it("switches to the cutout view and reports success once removal completes", () => {
    useAppStore.getState().setImage(makeAsset());
    useAppStore.getState().setRemoval({ cutoutPath: "/tmp/cutout.png", processingTimeMs: 250 });

    const state = useAppStore.getState();
    expect(state.removal).toEqual({ cutoutPath: "/tmp/cutout.png", processingTimeMs: 250 });
    expect(state.viewMode).toBe("cutout");
    expect(state.operationStatus).toBe("success");
  });

  it("resets the view mode to original when a new image is loaded", () => {
    useAppStore.getState().setImage(makeAsset());
    useAppStore.getState().setRemoval({ cutoutPath: "/tmp/cutout.png", processingTimeMs: 250 });
    useAppStore.getState().setImage(makeAsset({ sourceUrl: "blob:two" }));

    expect(useAppStore.getState().viewMode).toBe("original");
    expect(useAppStore.getState().removal).toBeNull();
  });
});
