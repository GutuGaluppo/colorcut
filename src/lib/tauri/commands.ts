import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { PaletteResult, RemovalResult } from "../../types/domain";

function assertTauriRuntime() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("This native operation is available in the ColorCut desktop app.");
  }
}

export async function removeBackground(imageBytes: Uint8Array): Promise<RemovalResult> {
  assertTauriRuntime();
  return invoke<RemovalResult>("remove_background", { imageBytes: Array.from(imageBytes) });
}

export async function exportCutout(sourcePath: string, destinationPath: string): Promise<void> {
  assertTauriRuntime();
  return invoke<void>("export_cutout", { sourcePath, destinationPath });
}

export function cutoutPreviewUrl(cutoutPath: string): string {
  return convertFileSrc(cutoutPath);
}

export async function extractPalette(
  imagePath: string,
  source: "original" | "subject",
  count: 4 | 6 | 8 | 12 | 16,
): Promise<PaletteResult> {
  assertTauriRuntime();
  return invoke<PaletteResult>("extract_palette", { imagePath, source, count });
}

