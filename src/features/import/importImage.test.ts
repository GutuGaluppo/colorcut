import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageImportError, getClipboardImage, importImageFile } from "./importImage";

class ResolvingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

class RejectingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

function makeFile(overrides: Partial<{ type: string; size: number; name: string }> = {}) {
  const file = new File(["x"], overrides.name ?? "photo.png", { type: overrides.type ?? "image/png" });
  if (overrides.size !== undefined) {
    Object.defineProperty(file, "size", { value: overrides.size });
  }
  return file;
}

describe("importImageFile", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.unstubAllGlobals();
  });

  it("rejects unsupported mime types without touching the clipboard/blob APIs", async () => {
    await expect(importImageFile(makeFile({ type: "image/gif" }))).rejects.toThrow(ImageImportError);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects files over the 100 MB limit", async () => {
    await expect(importImageFile(makeFile({ size: 200 * 1024 * 1024 }))).rejects.toThrow(/smaller than 100 MB/);
  });

  it("builds an ImageAsset with decoded dimensions for a valid file", async () => {
    vi.stubGlobal("Image", ResolvingImage);

    const asset = await importImageFile(makeFile({ name: "cat.png" }));

    expect(asset).toMatchObject({
      fileName: "cat.png",
      width: 800,
      height: 600,
      mimeType: "image/png",
      sourceUrl: "blob:mock-url",
    });
    expect(asset.id).toBeTruthy();
  });

  it("revokes the object URL and rejects when the image fails to decode", async () => {
    vi.stubGlobal("Image", RejectingImage);

    await expect(importImageFile(makeFile())).rejects.toThrow(ImageImportError);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("rejects images that decode to zero dimensions", async () => {
    vi.stubGlobal(
      "Image",
      class extends ResolvingImage {
        naturalWidth = 0;
        naturalHeight = 0;
      },
    );

    await expect(importImageFile(makeFile())).rejects.toThrow(/invalid dimensions/);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

describe("getClipboardImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when the clipboard API is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await expect(getClipboardImage()).rejects.toThrow(ImageImportError);
  });

  it("throws when the clipboard has no supported image type", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        read: vi.fn().mockResolvedValue([{ types: ["text/plain"] }]),
      },
    });
    await expect(getClipboardImage()).rejects.toThrow(/does not contain a supported image/);
  });

  it("returns a File built from the first supported clipboard item", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    vi.stubGlobal("navigator", {
      clipboard: {
        read: vi.fn().mockResolvedValue([
          { types: ["image/png"], getType: vi.fn().mockResolvedValue(blob) },
        ]),
      },
    });

    const file = await getClipboardImage();
    expect(file.type).toBe("image/png");
    expect(file.name).toBe("Clipboard image");
  });
});
