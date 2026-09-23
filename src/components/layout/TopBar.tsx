import { ChevronDown, Cloud, ClipboardPaste, Download, FolderOpen, Palette, Scissors } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "../ui/BrandMark";

type TopBarProps = {
  canRemoveBackground: boolean;
  canRemoveBackgroundCloud: boolean;
  canExtractPalette: boolean;
  canExport: boolean;
  onOpen: () => void;
  onPaste: () => void;
  onRemoveBackground: () => void;
  onRemoveBackgroundCloud: () => void;
  onExtractPalette: () => void;
  onExport: () => void;
};

export function TopBar({
  canRemoveBackground,
  canRemoveBackgroundCloud,
  canExtractPalette,
  canExport,
  onOpen,
  onPaste,
  onRemoveBackground,
  onRemoveBackgroundCloud,
  onExtractPalette,
  onExport,
}: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const splitButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!splitButtonRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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
        <div className="split-button" ref={splitButtonRef}>
          <button
            className="button button--quiet split-button__main"
            type="button"
            disabled={!canRemoveBackground}
            onClick={onRemoveBackground}
          >
            <Scissors size={17} /> Remove background
          </button>
          <button
            className="button button--quiet split-button__toggle"
            type="button"
            disabled={!canRemoveBackground && !canRemoveBackgroundCloud}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="More background removal options"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <ChevronDown size={14} />
          </button>
          {isMenuOpen && (
            <div className="split-button__menu" role="menu">
              <button
                role="menuitem"
                type="button"
                disabled={!canRemoveBackgroundCloud}
                onClick={() => {
                  setIsMenuOpen(false);
                  onRemoveBackgroundCloud();
                }}
              >
                <Cloud size={15} /> Remove with Photoroom
              </button>
            </div>
          )}
        </div>
        <button className="button button--quiet" type="button" disabled={!canExtractPalette} onClick={onExtractPalette}>
          <Palette size={17} /> Extract palette
        </button>
        <button className="button button--primary" type="button" disabled={!canExport} onClick={onExport}>
          <Download size={17} /> Export
        </button>
      </nav>
    </header>
  );
}
