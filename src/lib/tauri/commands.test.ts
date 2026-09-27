import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke, convertFileSrc: (path: string) => path }));

const { extractPaletteOfSize } = await import("./commands");

describe("extractPaletteOfSize", () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invoke.mockResolvedValue({ source: "original", count: 8, colors: [] });
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    invoke.mockReset();
  });

  it("sends a fixed size to extract_palette", async () => {
    await extractPaletteOfSize("original", 40, "/cache/a", undefined);
    expect(invoke).toHaveBeenCalledWith("extract_palette", {
      sourcePath: "/cache/a",
      source: "original",
      count: 40,
      cutoutPath: undefined,
    });
  });

  it("sends Auto to extract_palette_auto without a count", async () => {
    await extractPaletteOfSize("subject", "auto", undefined, "/cache/cutout.png");
    expect(invoke).toHaveBeenCalledWith("extract_palette_auto", {
      sourcePath: undefined,
      source: "subject",
      cutoutPath: "/cache/cutout.png",
    });
  });
});
