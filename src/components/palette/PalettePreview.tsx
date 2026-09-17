const previewColors = ["#2F8CFF", "#28C7E8", "#45D98C", "#F4D541", "#FF7A5C"];

export function PalettePreview() {
  return (
    <div className="palette-placeholder" aria-label="Brand color preview">
      {previewColors.map((color) => (
        <span key={color} style={{ backgroundColor: color }} title={color} />
      ))}
    </div>
  );
}

