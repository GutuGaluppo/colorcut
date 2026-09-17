import { ImagePlus, X } from "lucide-react";
import type { DragEvent } from "react";
import type { ImageAsset, PreviewBackground } from "../../types/domain";

type ImageWorkspaceProps = {
  image: ImageAsset | null;
  background: PreviewBackground;
  isDragging: boolean;
  onOpen: () => void;
  onClear: () => void;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
};

export function ImageWorkspace({
  image,
  background,
  isDragging,
  onOpen,
  onClear,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: ImageWorkspaceProps) {
  return (
    <main
      className={`workspace ${isDragging ? "workspace--dragging" : ""}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {image ? (
        <div className={`image-stage image-stage--${background}`}>
          <button className="icon-button image-stage__close" type="button" onClick={onClear} aria-label="Close image">
            <X size={18} />
          </button>
          <img src={image.sourceUrl} alt={`Preview of ${image.fileName}`} />
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

