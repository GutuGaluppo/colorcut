import { Palette, Scissors, Sparkles } from "lucide-react";
import type { ImageAsset, PreviewBackground, RemovalResult } from "../../types/domain";
import type { ViewMode } from "../../store/useAppStore";
import { PalettePreview } from "../palette/PalettePreview";

type InspectorProps = {
  image: ImageAsset | null;
  removal: RemovalResult | null;
  viewMode: ViewMode;
  isProcessing: boolean;
  canRemoveBackground: boolean;
  background: PreviewBackground;
  onBackgroundChange: (background: PreviewBackground) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onRemoveBackground: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Inspector({
  image,
  removal,
  viewMode,
  isProcessing,
  canRemoveBackground,
  background,
  onBackgroundChange,
  onViewModeChange,
  onRemoveBackground,
}: InspectorProps) {
  return (
    <aside className="inspector" aria-label="Image inspector">
      <section className="inspector__section">
        <span className="eyebrow">Image</span>
        {image ? (
          <dl className="metadata">
            <div><dt>Name</dt><dd title={image.fileName}>{image.fileName}</dd></div>
            <div><dt>Size</dt><dd>{image.width} × {image.height}</dd></div>
            <div><dt>File</dt><dd>{formatBytes(image.fileSizeBytes)}</dd></div>
          </dl>
        ) : (
          <p className="muted">Import an image to begin.</p>
        )}
      </section>

      <section className="inspector__section">
        <div className="section-heading"><Scissors size={17} /><h2>Cutout</h2></div>
        <button className="action-card" type="button" disabled={!canRemoveBackground} onClick={onRemoveBackground}>
          <span><Sparkles size={18} /> {isProcessing ? "Removing background…" : "Remove background"}</span>
          <small>
            {isProcessing
              ? "Local processing · this can take a few seconds"
              : removal
                ? `Done in ${removal.processingTimeMs} ms · local processing`
                : "Local processing"}
          </small>
        </button>

        {removal && (
          <fieldset className="field">
            <legend>View</legend>
            <div className="segmented-control">
              {(["original", "cutout"] as const).map((option) => (
                <button
                  key={option}
                  className={viewMode === option ? "is-active" : ""}
                  type="button"
                  onClick={() => onViewModeChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="field" disabled={!image}>
          <legend>Preview background</legend>
          <div className="segmented-control">
            {(["checker", "white", "black"] as const).map((option) => (
              <button
                key={option}
                className={background === option ? "is-active" : ""}
                type="button"
                onClick={() => onBackgroundChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="inspector__section">
        <div className="section-heading"><Palette size={17} /><h2>Palette</h2></div>
        <PalettePreview />
        <div className="inline-fields">
          <label>Source<select disabled={!image} defaultValue="original"><option value="original">Original</option><option value="subject">Subject</option></select></label>
          <label>Colors<select disabled={!image} defaultValue="8"><option>4</option><option>6</option><option>8</option><option>12</option><option>16</option></select></label>
        </div>
        <button className="button button--secondary button--full" type="button" disabled={!image}>Extract palette</button>
      </section>
    </aside>
  );
}
