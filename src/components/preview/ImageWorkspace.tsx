import { ImagePlus, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { ImageAsset, PreviewBackground } from "../../types/domain";
import { ZOOM_MAX, ZOOM_MIN } from "../../store/useAppStore";

type ImageWorkspaceProps = {
  image: ImageAsset | null;
  previewSrc?: string;
  previewAlt?: string;
  background: PreviewBackground;
  zoom: number;
  isDragging: boolean;
  isProcessing?: boolean;
  processingMessage?: string;
  onOpen: () => void;
  onClear: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
};

/**
 * WebKit (the Tauri webview's engine) can leave a stale, partially-painted
 * compositing layer when a rounded, `overflow: hidden` box's size is driven by
 * CSS `aspect-ratio` and that value changes on mount — it shows up as half the
 * stage staying blank/checkered with a hard edge. Computing the fitted pixel
 * size in JS and setting it as an explicit width/height sidesteps that bug
 * entirely: no aspect-ratio recalculation for the engine to get wrong.
 */
function useContainSize(container: React.RefObject<HTMLElement | null>, naturalWidth?: number, naturalHeight?: number) {
  const [fitted, setFitted] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = container.current;
    if (!el || !naturalWidth || !naturalHeight || typeof ResizeObserver === "undefined") {
      setFitted(null);
      return;
    }

    const compute = (availableWidth: number, availableHeight: number) => {
      if (availableWidth <= 0 || availableHeight <= 0) return;
      const scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
      setFitted({ width: Math.round(naturalWidth * scale), height: Math.round(naturalHeight * scale) });
    };

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentBoxSize?.[0];
      if (box) {
        compute(box.inlineSize, box.blockSize);
      } else {
        compute(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [container, naturalWidth, naturalHeight]);

  return fitted;
}

export function ImageWorkspace({
  image,
  previewSrc,
  previewAlt,
  background,
  zoom,
  isDragging,
  isProcessing = false,
  processingMessage = "Processing…",
  onOpen,
  onClear,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: ImageWorkspaceProps) {
  const workspaceRef = useRef<HTMLElement>(null);
  const fitted = useContainSize(workspaceRef, image?.width, image?.height);

  return (
    <main
      ref={workspaceRef}
      className={`workspace ${isDragging ? "workspace--dragging" : ""}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {image ? (
        <div
          key={image.id}
          className={`image-stage image-stage--${background} ${zoom !== 1 ? "image-stage--zoomed" : ""} ${isProcessing ? "image-stage--processing" : ""}`}
          style={fitted ? { width: fitted.width, height: fitted.height } : undefined}
        >
          <button className="icon-button image-stage__close" type="button" onClick={onClear} aria-label="Close image">
            <X size={18} />
          </button>
          <img
            src={previewSrc ?? image.sourceUrl}
            alt={previewAlt ?? `Preview of ${image.fileName}`}
            style={{ transform: `scale(${zoom})` }}
          />
          {isProcessing && (
            <div className="processing-mesh" aria-hidden="true">
              <div className="processing-mesh__grid" />
              <div className="processing-mesh__scanline" />
              <span className="processing-mesh__corner processing-mesh__corner--tl" />
              <span className="processing-mesh__corner processing-mesh__corner--tr" />
              <span className="processing-mesh__corner processing-mesh__corner--bl" />
              <span className="processing-mesh__corner processing-mesh__corner--br" />
            </div>
          )}
          {isProcessing && (
            <div className="processing-overlay" role="status" aria-live="polite">
              <span className="processing-overlay__spinner" aria-hidden="true" />
              <span>{processingMessage}</span>
            </div>
          )}
          <div className="zoom-toolbar" role="group" aria-label="Zoom">
            <button
              className="icon-button"
              type="button"
              onClick={onZoomOut}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Zoom out"
            >
              <Minus size={15} />
            </button>
            <button
              className="zoom-toolbar__value"
              type="button"
              onClick={onResetZoom}
              aria-label={`Zoom ${Math.round(zoom * 100)} percent, reset to fit`}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={onZoomIn}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Zoom in"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      ) : (
        <button className="empty-state" type="button" onClick={onOpen}>
          <span className="empty-state__icon"><ImagePlus size={28} /></span>
          <strong>Drop an image here</strong>
          <span>or choose a PNG, JPEG, or WebP</span>
          <span className="empty-state__action">Open image</span>
        </button>
      )}
    </main>
  );
}
