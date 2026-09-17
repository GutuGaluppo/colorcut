import { invoke } from "@tauri-apps/api/core";
import type { PaletteResult, RemovalResult } from "../../types/domain";

function assertTauriRuntime() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("This native operation is available in the ColorCut desktop app.");
  }
}

export async function removeBackground(imagePath: string): Promise<RemovalResult> {
  assertTauriRuntime();
  return invoke<RemovalResult>("remove_background", { imagePath });
}

export async function extractPalette(
  imagePath: string,
  source: "original" | "subject",
  count: 4 | 6 | 8 | 12 | 16,
): Promise<PaletteResult> {
  assertTauriRuntime();
  return invoke<PaletteResult>("extract_palette", { imagePath, source, count });
}

