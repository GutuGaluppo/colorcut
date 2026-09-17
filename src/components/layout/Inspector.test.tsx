import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Inspector } from "./Inspector";
import type { ImageAsset, PaletteResult, RemovalResult } from "../../types/domain";

const asset: ImageAsset = {
  id: "1",
  sourceUrl: "blob:one",
  fileName: "cat.png",
  width: 100,
  height: 80,
  mimeType: "image/png",
  fileSizeBytes: 2048,
};

const removal: RemovalResult = { cutoutPath: "/tmp/cutout.png", processingTimeMs: 342 };

const palette: PaletteResult = {
  source: "original",
  count: 4,
  colors: [
    {
      id: "2f8cff",
      hex: "#2F8CFF",
      rgb: { r: 47, g: 140, b: 255 },
      hsl: { h: 214, s: 100, l: 59 },
      oklch: { l: 0.62, c: 0.19, h: 259 },
      percentage: 62.5,
    },
    {
      id: "45d98c",
      hex: "#45D98C",
      rgb: { r: 69, g: 217, b: 140 },
      hsl: { h: 149, s: 60, l: 56 },
      oklch: { l: 0.78, c: 0.15, h: 158 },
      percentage: 37.5,
    },
  ],
};

function renderInspector(overrides: Partial<Parameters<typeof Inspector>[0]> = {}) {
  return render(
    <Inspector
      image={null}
      removal={null}
      viewMode="original"
      isProcessing={false}
      canRemoveBackground={false}
      background="checker"
      onBackgroundChange={vi.fn()}
      onViewModeChange={vi.fn()}
      onRemoveBackground={vi.fn()}
      palette={null}
      paletteSource="original"
      paletteCount={8}
      canExtractPalette={false}
      onPaletteSourceChange={vi.fn()}
      onPaletteCountChange={vi.fn()}
      onExtractPalette={vi.fn()}
      onExportPalette={vi.fn()}
      {...overrides}
    />,
  );
}

describe("Inspector", () => {
  it("disables the remove background action without an image", () => {
    renderInspector();
    expect(screen.getByRole("button", { name: /remove background/i })).toBeDisabled();
  });

  it("enables the remove background action once an image is loaded", () => {
    renderInspector({ image: asset, canRemoveBackground: true });
    expect(screen.getByRole("button", { name: /remove background/i })).toBeEnabled();
  });

  it("shows a processing label while removal is running", () => {
    renderInspector({ image: asset, isProcessing: true });
    expect(screen.getByText(/removing background/i)).toBeInTheDocument();
  });

  it("does not show the original/cutout toggle before a removal exists", () => {
    renderInspector({ image: asset, canRemoveBackground: true });
    expect(screen.queryByText("cutout")).not.toBeInTheDocument();
  });

  it("shows the original/cutout toggle and processing time once removal succeeds", () => {
    renderInspector({ image: asset, removal, viewMode: "cutout" });
    expect(screen.getByText(/done in 342 ms/i)).toBeInTheDocument();
    expect(screen.getByText("cutout")).toBeInTheDocument();
    expect(screen.getByText("original")).toBeInTheDocument();
  });

  it("calls onViewModeChange when switching the toggle", () => {
    const onViewModeChange = vi.fn();
    renderInspector({ image: asset, removal, viewMode: "cutout", onViewModeChange });

    fireEvent.click(screen.getByText("original"));
    expect(onViewModeChange).toHaveBeenCalledWith("original");
  });

  it("calls onRemoveBackground when the action is clicked", () => {
    const onRemoveBackground = vi.fn();
    renderInspector({ image: asset, canRemoveBackground: true, onRemoveBackground });

    fireEvent.click(screen.getByRole("button", { name: /remove background/i }));
    expect(onRemoveBackground).toHaveBeenCalledTimes(1);
  });

  it("disables the subject palette source until a cutout exists", () => {
    renderInspector({ image: asset });
    expect(screen.getByRole("option", { name: "Subject" })).toBeDisabled();
  });

  it("enables the subject palette source once a cutout exists", () => {
    renderInspector({ image: asset, removal });
    expect(screen.getByRole("option", { name: "Subject" })).toBeEnabled();
  });

  it("calls onExtractPalette when the action is clicked", () => {
    const onExtractPalette = vi.fn();
    renderInspector({ image: asset, canExtractPalette: true, onExtractPalette });

    fireEvent.click(screen.getByRole("button", { name: /extract palette/i }));
    expect(onExtractPalette).toHaveBeenCalledTimes(1);
  });

  it("calls onPaletteCountChange when a different count is selected", () => {
    const onPaletteCountChange = vi.fn();
    renderInspector({ image: asset, onPaletteCountChange });

    fireEvent.change(screen.getByLabelText("Colors"), { target: { value: "12" } });
    expect(onPaletteCountChange).toHaveBeenCalledWith(12);
  });

  it("shows the decorative placeholder before any palette is extracted", () => {
    renderInspector();
    expect(screen.getByLabelText("Brand color preview")).toBeInTheDocument();
  });

  it("renders extracted colors and export actions once a palette exists", () => {
    renderInspector({ image: asset, palette });

    expect(screen.getByText("#2F8CFF")).toBeInTheDocument();
    expect(screen.getByText("#45D98C")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CSS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TXT" })).toBeInTheDocument();
  });

  it("calls onExportPalette with the chosen format", () => {
    const onExportPalette = vi.fn();
    renderInspector({ image: asset, palette, onExportPalette });

    fireEvent.click(screen.getByRole("button", { name: "CSS" }));
    expect(onExportPalette).toHaveBeenCalledWith("css");
  });
});
