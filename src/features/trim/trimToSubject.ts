import type { TrimResult } from "../../types/domain";

/** Smallest margin kept around the subject, in image pixels. */
const MIN_PADDING_PX = 16;
/** Margin as a share of the longer side, so large photos keep proportional room. */
const PADDING_RATIO = 0.02;

/** Breathing room kept around the subject, scaled to the image size. */
export function trimPaddingFor(width: number, height: number): number {
  return Math.max(MIN_PADDING_PX, Math.round(Math.max(width, height) * PADDING_RATIO));
}

/**
 * Crops the image at `sourceUrl` to the rectangle the native trim chose. The
 * rectangle is in the same pixel space as the cutout, which matches the image,
 * so the original and the cutout stay aligned in every preview mode.
 */
export async function cropImageToRect(
  sourceUrl: string,
  rect: Pick<TrimResult, "x" | "y" | "width" | "height">,
): Promise<string> {
  const blob = await (await fetch(sourceUrl)).blob();
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = rect.width;
    canvas.height = rect.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The trimmed image could not be drawn.");
    context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

    const cropped = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("The trimmed image could not be encoded."))),
        "image/png",
      ),
    );
    return URL.createObjectURL(cropped);
  } finally {
    bitmap.close();
  }
}
