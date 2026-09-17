import { ClipboardPaste, Download, FolderOpen, Palette, Scissors } from "lucide-react";
import { BrandMark } from "../ui/BrandMark";

type TopBarProps = {
  hasImage: boolean;
  onOpen: () => void;
  onPaste: () => void;
};

export function TopBar({ hasImage, onOpen, onPaste }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="product-lockup">
        <BrandMark />
        <div>
          <strong>ColorCut</strong>
          <span>palette + cutout utility</span>
        </div>
      </div>

      <nav className="topbar__actions" aria-label="Primary actions">
        <button className="button button--quiet" type="button" onClick={onOpen}>
          <FolderOpen size={17} /> Open
        </button>
        <button className="button button--quiet" type="button" onClick={onPaste}>
          <ClipboardPaste size={17} /> Paste
        </button>
        <span className="topbar__divider" aria-hidden="true" />
        <button className="button button--quiet" type="button" disabled={!hasImage}>
          <Scissors size={17} /> Remove background
        </button>
        <button className="button button--quiet" type="button" disabled={!hasImage}>
          <Palette size={17} /> Extract palette
        </button>
        <button className="button button--primary" type="button" disabled={!hasImage}>
          <Download size={17} /> Export
        </button>
      </nav>
    </header>
  );
}

