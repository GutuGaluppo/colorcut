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

  it("reports a default or custom message when a palette is set", () => {
    const palette = { source: "original" as const, count: 40 as const, colors: [] };
    useAppStore.getState().setPalette(palette);
    expect(useAppStore.getState().message).toBe("Palette extracted");
    useAppStore.getState().setPalette(palette, "Palette extracted · Auto chose 40 colors");
    expect(useAppStore.getState().message).toBe("Palette extracted · Auto chose 40 colors");
    expect(useAppStore.getState().operationStatus).toBe("success");
  });

  it("accepts Auto as the palette size", () => {
    useAppStore.getState().setPaletteCount("auto");
    expect(useAppStore.getState().paletteCount).toBe("auto");
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
    useAppStore.setState({ sliderPosition: 20 });
    useAppStore.getState().setImage(makeAsset());
    useAppStore.getState().setRemoval({ cutoutPath: "/tmp/cutout.png", processingTimeMs: 250 });
    useAppStore.getState().setSliderPosition(75);
    useAppStore.getState().setImage(makeAsset({ sourceUrl: "blob:two" }));

    expect(useAppStore.getState().viewMode).toBe("original");
    expect(useAppStore.getState().removal).toBeNull();
    expect(useAppStore.getState().sliderPosition).toBe(50);
  });

  it("clamps the comparison slider position", () => {
    useAppStore.getState().setSliderPosition(-10);
    expect(useAppStore.getState().sliderPosition).toBe(0);

    useAppStore.getState().setSliderPosition(125);
    expect(useAppStore.getState().sliderPosition).toBe(100);
  });

  describe("trim to subject", () => {
    const trimmedAsset = makeAsset({ sourceUrl: "blob:trimmed", width: 40, height: 30 });
    const cutout = { cutoutPath: "/cache/cutout.png", processingTimeMs: 10 };
    const trimmedCutout = { cutoutPath: "/cache/cutout-trim.png", processingTimeMs: 10 };

    it("keeps the full frame so a trim can be undone", () => {
      useAppStore.setState({ image: makeAsset(), removal: cutout });

      useAppStore.getState().applyTrim(trimmedAsset, trimmedCutout);
      expect(useAppStore.getState().image).toEqual(trimmedAsset);
      expect(useAppStore.getState().removal).toEqual(trimmedCutout);

      useAppStore.getState().restoreFullFrame();
      expect(useAppStore.getState().image).toEqual(makeAsset());
      expect(useAppStore.getState().removal).toEqual(cutout);
      expect(useAppStore.getState().fullFrame).toBeNull();
    });

    it("keeps the first full frame across repeated trims", () => {
      useAppStore.setState({ image: makeAsset(), removal: cutout });

      useAppStore.getState().applyTrim(trimmedAsset, trimmedCutout);
      useAppStore.getState().applyTrim(makeAsset({ sourceUrl: "blob:again" }), trimmedCutout);
      useAppStore.getState().restoreFullFrame();

      expect(useAppStore.getState().image).toEqual(makeAsset());
    });

    it("drops the full frame when a new cutout replaces the trimmed one", () => {
      useAppStore.setState({ image: makeAsset(), removal: cutout });
      useAppStore.getState().applyTrim(trimmedAsset, trimmedCutout);

      useAppStore.getState().setRemoval(cutout);

      expect(useAppStore.getState().fullFrame).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:one");
    });

    it("releases the full frame's blob when the image is cleared", () => {
      useAppStore.setState({ image: makeAsset(), removal: cutout });
      useAppStore.getState().applyTrim(trimmedAsset, trimmedCutout);

      useAppStore.getState().clearImage();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:one");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:trimmed");
    });

    it("ignores a trim when there is no cutout yet", () => {
      useAppStore.setState({ image: makeAsset(), removal: null });

      useAppStore.getState().applyTrim(trimmedAsset, trimmedCutout);

      expect(useAppStore.getState().image).toEqual(makeAsset());
      expect(useAppStore.getState().fullFrame).toBeNull();
    });
  });
});
