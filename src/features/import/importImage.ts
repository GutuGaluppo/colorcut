import type { ImageAsset } from "../../types/domain";

const supportedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxInputBytes = 100 * 1024 * 1024;

export class ImageImportError extends Error {}

function readDimensions(sourceUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new ImageImportError("The image could not be decoded."));
    image.src = sourceUrl;
  });
}

export async function importImageFile(file: File): Promise<ImageAsset> {
  if (!supportedTypes.has(file.type)) {
    throw new ImageImportError("Choose a PNG, JPEG, or WebP image.");
  }

  if (file.size > maxInputBytes) {
    throw new ImageImportError("Choose an image smaller than 100 MB.");
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const { width, height } = await readDimensions(sourceUrl);
    if (width === 0 || height === 0) {
      throw new ImageImportError("The image has invalid dimensions.");
    }

    return {
      id: crypto.randomUUID(),
      sourceUrl,
      fileName: file.name || "Clipboard image",
      width,
      height,
      mimeType: file.type,
      fileSizeBytes: file.size,
    };
  } catch (error) {
    URL.revokeObjectURL(sourceUrl);
    throw error;
  }
}

export async function readObjectUrlBytes(sourceUrl: string): Promise<Uint8Array> {
  const response = await fetch(sourceUrl);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function getClipboardImage(): Promise<File> {
  if (!navigator.clipboard?.read) {
    throw new ImageImportError("Clipboard image access is unavailable here.");
  }

  const clipboardItems = await navigator.clipboard.read();
  for (const item of clipboardItems) {
    const imageType = item.types.find((type) => supportedTypes.has(type));
    if (imageType) {
      const blob = await item.getType(imageType);
      return new File([blob], "Clipboard image", { type: imageType });
    }
  }

  // A file copied in Finder (Cmd+C on its icon) puts a file reference on the
  // pasteboard, not image bytes, and the platform doesn't expose that
  // reference as a readable type here — so "no supported image" also covers
  // that case, not just an empty or non-image clipboard. Copying the image
  // data itself (Preview's Copy, a browser's Copy Image, a screenshot) works;
  // for a file on disk, use Open or drag it in instead.
  throw new ImageImportError(
    "The clipboard doesn't contain image data ColorCut can read. Copying a file in Finder doesn't work here — copy the image itself (Preview, a browser, a screenshot), or use Open / drag the file in instead.",
  );
}

