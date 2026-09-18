import { ImagePlus, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { ImageAsset, PreviewBackground } from "../../types/domain";
import type { ViewMode } from "../../store/useAppStore";
import { ZOOM_MAX, ZOOM_MIN } from "../../store/useAppStore";
import { CompareSlider } from "./CompareSlider";

type ImageWorkspaceProps = {
  image: ImageAsset | null;
  cutoutSrc?: string;
  viewMode: ViewMode;
  sliderPosition: number;
  onSliderPositionChange: (position: number) => void;
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
 *
 * `columns` lets side-by-side mode fit each pane against half the available
 * width instead of the whole thing.
 */
function useContainSize(
  container: React.RefObject<HTMLElement | null>,
  naturalWidth?: number,
  naturalHeight?: number,
  columns = 1,
  columnGap = 0,
  heightOffset = 0,
) {
  const [fitted, setFitted] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = container.current;
    if (!el || !naturalWidth || !naturalHeight || typeof ResizeObserver === "undefined") {
      setFitted(null);
      return;
    }

    const compute = (availableWidth: number, availableHeight: number) => {
      const perColumnWidth = (availableWidth - columnGap * (columns - 1)) / columns;
      const contentHeight = availableHeight - heightOffset;
      if (perColumnWidth <= 0 || contentHeight <= 0) return;
      const scale = Math.min(perColumnWidth / naturalWidth, contentHeight / naturalHeight);
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
  }, [container, naturalWidth, naturalHeight, columns, columnGap, heightOffset]);

  return fitted;
}

export function ImageWorkspace({
  image,
  cutoutSrc,
  viewMode,
  sliderPosition,
  onSliderPositionChange,
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
  const isSideBySide = viewMode === "side-by-side" && Boolean(cutoutSrc);
  const fitted = useContainSize(
    workspaceRef,
    image?.width,
    image?.height,
    isSideBySide ? 2 : 1,
    isSideBySide ? 20 : 0,
    isSideBySide ? 24 : 0,
  );

  const processingOverlay = isProcessing && (
    <>
      <div className="processing-mesh" aria-hidden="true">
        <div className="processing-mesh__grid" />
        <div className="processing-mesh__scanline" />
        <span className="processing-mesh__corner processing-mesh__corner--tl" />
        <span className="processing-mesh__corner processing-mesh__corner--tr" />
        <span className="processing-mesh__corner processing-mesh__corner--bl" />
        <span className="processing-mesh__corner processing-mesh__corner--br" />
      </div>
      <div className="processing-overlay" role="status" aria-live="polite">
        <span className="processing-overlay__spinner" aria-hidden="true" />
        <span>{processingMessage}</span>
      </div>
    </>
  );

  const zoomToolbar = (
    <div className="zoom-toolbar" role="group" aria-label="Zoom">
      <button className="icon-button" type="button" onClick={onZoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out">
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
      <button className="icon-button" type="button" onClick={onZoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in">
        <Plus size={15} />
      </button>
    </div>
  );

  const stageClassName = (extra = "") =>
    `image-stage image-stage--${background} ${zoom !== 1 ? "image-stage--zoomed" : ""} ${isProcessing ? "image-stage--processing" : ""} ${extra}`;

  function renderContent() {
    if (!image) return null;

    if (isSideBySide && cutoutSrc) {
      return (
        <div
          key={image.id}
          className={`compare-side-by-side ${isProcessing ? "compare-side-by-side--processing" : ""}`}
          role="group"
          aria-label="Side-by-side comparison"
        >
          <button className="icon-button image-stage__close" type="button" onClick={onClear} aria-label="Close image">
            <X size={18} />
          </button>
          <div className="compare-pane">
            <span className="compare-pane__label">Original</span>
            <div className={stageClassName()} style={fitted ?? undefined}>
              <img src={image.sourceUrl} alt={`Original ${image.fileName}`} style={{ transform: `scale(${zoom})` }} />
            </div>
          </div>
          <div className="compare-pane">
            <span className="compare-pane__label">Cutout</span>
            <div className={stageClassName()} style={fitted ?? undefined}>
              <img src={cutoutSrc} alt={`Cutout of ${image.fileName}`} style={{ transform: `scale(${zoom})` }} />
            </div>
          </div>
          {processingOverlay}
          {zoomToolbar}
        </div>
      );
    }

    return (
      <div key={image.id} className={stageClassName()} style={fitted ?? undefined}>
        <button className="icon-button image-stage__close" type="button" onClick={onClear} aria-label="Close image">
          <X size={18} />
        </button>
        {viewMode === "slider" && cutoutSrc ? (
          <CompareSlider
            originalSrc={image.sourceUrl}
            cutoutSrc={cutoutSrc}
            fileName={image.fileName}
            position={sliderPosition}
            onPositionChange={onSliderPositionChange}
            zoom={zoom}
          />
        ) : (
          <img
            src={viewMode === "cutout" && cutoutSrc ? cutoutSrc : image.sourceUrl}
            alt={viewMode === "cutout" && cutoutSrc ? `Cutout of ${image.fileName}` : `Preview of ${image.fileName}`}
            style={{ transform: `scale(${zoom})` }}
          />
        )}
        {processingOverlay}
        {zoomToolbar}
      </div>
    );
  }

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
        renderContent()
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
