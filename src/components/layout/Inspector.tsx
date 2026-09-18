import { Palette, Scissors, Sparkles } from "lucide-react";
import type { ImageAsset, PaletteCount, PaletteResult, PaletteSource, PreviewBackground, RemovalResult } from "../../types/domain";
import type { ViewMode } from "../../store/useAppStore";
import type { PaletteExportFormat } from "../../features/palette/exportPalette";
import { PalettePreview } from "../palette/PalettePreview";
import { PaletteResults } from "../palette/PaletteResults";

const PALETTE_COUNTS: PaletteCount[] = [4, 6, 8, 12, 16];
const PALETTE_EXPORT_FORMATS: PaletteExportFormat[] = ["json", "css", "txt"];
const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "cutout", label: "Cutout" },
  { value: "slider", label: "Slider" },
  { value: "side-by-side", label: "Side by side" },
];

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
  palette: PaletteResult | null;
  paletteSource: PaletteSource;
  paletteCount: PaletteCount;
  canExtractPalette: boolean;
  onPaletteSourceChange: (source: PaletteSource) => void;
  onPaletteCountChange: (count: PaletteCount) => void;
  onExtractPalette: () => void;
  onExportPalette: (format: PaletteExportFormat) => void;
  onExportPaletteImage: () => void;
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
  palette,
  paletteSource,
  paletteCount,
  canExtractPalette,
  onPaletteSourceChange,
  onPaletteCountChange,
  onExtractPalette,
  onExportPalette,
  onExportPaletteImage,
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
            <div className="segmented-control segmented-control--wrap" role="group" aria-label="Preview mode">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.value}
                  className={viewMode === mode.value ? "is-active" : ""}
                  type="button"
                  aria-pressed={viewMode === mode.value}
                  onClick={() => onViewModeChange(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="field" disabled={!image}>
          <legend>Preview background</legend>
          <div className="segmented-control" role="group" aria-label="Preview background options">
            {(["checker", "white", "black"] as const).map((option) => (
              <button
                key={option}
                className={background === option ? "is-active" : ""}
                type="button"
                aria-pressed={background === option}
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
        {palette ? <PaletteResults palette={palette} /> : <PalettePreview />}
        <div className="inline-fields">
          <label>
            Source
            <select
              disabled={!image}
              value={paletteSource}
              onChange={(event) => onPaletteSourceChange(event.target.value as PaletteSource)}
            >
              <option value="original">Original</option>
              <option value="subject" disabled={!removal}>
                Subject
              </option>
            </select>
          </label>
          <label>
            Colors
            <select
              disabled={!image}
              value={paletteCount}
              onChange={(event) => onPaletteCountChange(Number(event.target.value) as PaletteCount)}
            >
              {PALETTE_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="button button--secondary button--full"
          type="button"
          disabled={!canExtractPalette}
          onClick={onExtractPalette}
        >
          {isProcessing ? "Extracting…" : "Extract palette"}
        </button>

        {palette && (
          <div className="palette-export-row" role="group" aria-label="Export palette">
            <button
              type="button"
              className="button button--quiet palette-export-row__button"
              disabled={isProcessing}
              onClick={onExportPaletteImage}
            >
              PNG
            </button>
            {PALETTE_EXPORT_FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                className="button button--quiet palette-export-row__button"
                disabled={isProcessing}
                onClick={() => onExportPalette(format)}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
