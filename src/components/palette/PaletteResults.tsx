import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { PaletteColor, PaletteResult } from "../../types/domain";

type PaletteResultsProps = {
  palette: PaletteResult;
};

function formatRgb(color: PaletteColor) {
  return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
}

function formatHsl(color: PaletteColor) {
  return `hsl(${Math.round(color.hsl.h)}, ${Math.round(color.hsl.s)}%, ${Math.round(color.hsl.l)}%)`;
}

function formatOklch(color: PaletteColor) {
  return `oklch(${color.oklch.l.toFixed(2)} ${color.oklch.c.toFixed(3)} ${Math.round(color.oklch.h)})`;
}

export function PaletteResults({ palette }: PaletteResultsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1200);
    } catch {
      // Clipboard access can be denied by the OS; there's nothing to recover from, so just skip the feedback.
    }
  }

  return (
    <div className="palette-results">
      <ul className="palette-swatches" aria-label="Extracted palette swatches">
        {palette.colors.map((color) => (
          <li key={color.id}>
            <button
              type="button"
              className="palette-swatch"
              style={{ backgroundColor: color.hex }}
              onClick={() => void copy(`${color.id}-swatch`, color.hex)}
              aria-label={`Copy ${color.hex}, ${color.percentage.toFixed(1)} percent of the palette`}
              title={`${color.hex} · ${color.percentage.toFixed(1)}%`}
            >
              {copiedId === `${color.id}-swatch` && <Check size={13} className="palette-swatch__check" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>

      <ul className="palette-list">
        {palette.colors.map((color) => (
          <li key={color.id} className="palette-row">
            <span className="palette-row__swatch" style={{ backgroundColor: color.hex }} aria-hidden="true" />
            <div className="palette-row__values">
              <div className="palette-row__primary">
                <span>{color.hex}</span>
                <span className="palette-row__percentage">{color.percentage.toFixed(1)}%</span>
              </div>
              <div className="palette-row__formats">
                {(
                  [
                    { id: "rgb", label: formatRgb(color) },
                    { id: "hsl", label: formatHsl(color) },
                    { id: "oklch", label: formatOklch(color) },
                  ] as const
                ).map((format) => {
                  const copyId = `${color.id}-${format.id}`;
                  return (
                    <button
                      key={format.id}
                      type="button"
                      className="palette-row__format"
                      onClick={() => void copy(copyId, format.label)}
                      aria-label={`Copy ${format.label}`}
                    >
                      {copiedId === copyId ? <Check size={11} /> : <Copy size={11} />}
                      {format.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
