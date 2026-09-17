import type { ImageAsset, OperationStatus } from "../../types/domain";

type StatusBarProps = {
  image: ImageAsset | null;
  status: OperationStatus;
  message: string;
};

export function StatusBar({ image, status, message }: StatusBarProps) {
  return (
    <footer className="statusbar" aria-live="polite">
      <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
      <span>{message}</span>
      {image && <span className="statusbar__meta">{image.fileName} · {image.width} × {image.height}</span>}
    </footer>
  );
}

