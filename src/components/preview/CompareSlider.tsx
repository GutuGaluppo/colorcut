import { useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

type CompareSliderProps = {
  originalSrc: string;
  cutoutSrc: string;
  fileName: string;
  position: number;
  onPositionChange: (position: number) => void;
  zoom: number;
};

const STEP = 2;

function clampPosition(position: number) {
  return Math.min(100, Math.max(0, position));
}

export function CompareSlider({ originalSrc, cutoutSrc, fileName, position, onPositionChange, zoom }: CompareSliderProps) {
  const activePointerId = useRef<number | null>(null);
  const safePosition = clampPosition(position);

  function positionFromClientX(container: HTMLElement, clientX: number) {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return safePosition;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    return clampPosition(Math.round(ratio));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    onPositionChange(positionFromClientX(event.currentTarget, event.clientX));
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== event.pointerId) return;
    onPositionChange(positionFromClientX(event.currentTarget, event.clientX));
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== event.pointerId) return;
    activePointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        onPositionChange(clampPosition(safePosition - STEP));
        event.preventDefault();
        break;
      case "ArrowRight":
      case "ArrowUp":
        onPositionChange(clampPosition(safePosition + STEP));
        event.preventDefault();
        break;
      case "Home":
        onPositionChange(0);
        event.preventDefault();
        break;
      case "End":
        onPositionChange(100);
        event.preventDefault();
        break;
    }
  }

  return (
    <div
      className="compare-slider"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={() => {
        activePointerId.current = null;
      }}
    >
      {/*
        Both panes are clipped to complementary halves instead of stacking the
        cutout over a full-size opaque original. Compositing the cutout's alpha
        channel over the very same original photo always reconstructs that
        photo exactly, pixel for pixel, everywhere the mask says "background" —
        so the reveal would never visibly show anything, no matter the mask.
        Clipping instead means the cutout's transparent pixels show whatever is
        beneath the shared workspace background (checker/white/black), the same
        backdrop the plain Cutout view already uses.
      */}
      <div className="compare-slider__reveal" style={{ clipPath: `inset(0 ${100 - safePosition}% 0 0)` }}>
        <img
          className="compare-slider__layer"
          src={cutoutSrc}
          alt={`Cutout of ${fileName}`}
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
        />
      </div>
      <div className="compare-slider__reveal" style={{ clipPath: `inset(0 0 0 ${safePosition}%)` }}>
        <img
          className="compare-slider__layer"
          src={originalSrc}
          alt={`Original ${fileName}`}
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
        />
      </div>
      <div
        className="compare-slider__handle"
        style={{ left: `${safePosition}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Comparison position"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safePosition}
        aria-valuetext={`${safePosition}% cutout visible`}
        onKeyDown={handleKeyDown}
      >
        <span className="compare-slider__grip" aria-hidden="true" />
      </div>
    </div>
  );
}
