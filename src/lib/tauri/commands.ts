import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { PaletteCount, PaletteResult, PaletteSource, RemovalResult, RgbColor } from "../../types/domain";

function assertTauriRuntime() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("This native operation is available in the ColorCut desktop app.");
  }
}

/// Caches image bytes to a native path so operations below can reference them
/// without resending the whole image as a JSON number array (which inflates a
/// multi-megabyte photo to tens of megabytes of text and can fail IPC delivery
/// outright). The bytes must be passed as `invoke`'s whole argument, not
/// wrapped in an object, so Tauri sends them as a raw request body.
export async function cacheSourceImage(imageBytes: Uint8Array): Promise<string> {
  assertTauriRuntime();
  return invoke<string>("cache_source_image", imageBytes);
}

export async function removeBackground(sourcePath: string): Promise<RemovalResult> {
  assertTauriRuntime();
  return invoke<RemovalResult>("remove_background", { sourcePath });
}

export async function exportCutout(sourcePath: string, destinationPath: string): Promise<void> {
  assertTauriRuntime();
  return invoke<void>("export_cutout", { sourcePath, destinationPath });
}

export function cutoutPreviewUrl(cutoutPath: string): string {
  return convertFileSrc(cutoutPath);
}

export async function extractPalette(
  source: PaletteSource,
  count: PaletteCount,
  sourcePath?: string,
  cutoutPath?: string,
): Promise<PaletteResult> {
  assertTauriRuntime();
  return invoke<PaletteResult>("extract_palette", {
    sourcePath,
    source,
    count,
    cutoutPath,
  });
}

export async function writeTextFile(contents: string, destinationPath: string): Promise<void> {
  assertTauriRuntime();
  return invoke<void>("write_text_file", { contents, destinationPath });
}

export async function exportPaletteImage(colors: RgbColor[], destinationPath: string): Promise<void> {
  assertTauriRuntime();
  return invoke<void>("export_palette_image", { colors, destinationPath });
}

