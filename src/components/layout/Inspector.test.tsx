import { fireEvent, render, screen, within } from "@testing-library/react";
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
      onExportPaletteImage={vi.fn()}
      photoroomLicense={{ hasLicense: false }}
      canRemoveBackgroundCloud={false}
      onRemoveBackgroundCloud={vi.fn()}
      onSavePhotoroomLicense={vi.fn()}
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

  it("does not show the view mode toggle before a removal exists", () => {
    renderInspector({ image: asset, canRemoveBackground: true });
    expect(screen.queryByRole("group", { name: "Preview mode" })).not.toBeInTheDocument();
  });

  it("shows the view mode toggle once removal succeeds", () => {
    renderInspector({ image: asset, removal, viewMode: "cutout" });
    const modes = within(screen.getByRole("group", { name: "Preview mode" }));
    expect(modes.getByRole("button", { name: "Cutout" })).toHaveAttribute("aria-pressed", "true");
    expect(modes.getByRole("button", { name: "Original" })).toBeInTheDocument();
    expect(modes.getByRole("button", { name: "Slider" })).toBeInTheDocument();
    expect(modes.getByRole("button", { name: "Side by side" })).toBeInTheDocument();
  });

  it("calls onViewModeChange when switching the toggle", () => {
    const onViewModeChange = vi.fn();
    renderInspector({ image: asset, removal, viewMode: "cutout", onViewModeChange });

    const modes = within(screen.getByRole("group", { name: "Preview mode" }));
    fireEvent.click(modes.getByRole("button", { name: "Original" }));
    expect(onViewModeChange).toHaveBeenCalledWith("original");
  });

  it("calls onViewModeChange with slider and side-by-side modes", () => {
    const onViewModeChange = vi.fn();
    renderInspector({ image: asset, removal, onViewModeChange });

    const modes = within(screen.getByRole("group", { name: "Preview mode" }));
    fireEvent.click(modes.getByRole("button", { name: "Slider" }));
    expect(onViewModeChange).toHaveBeenCalledWith("slider");

    fireEvent.click(modes.getByRole("button", { name: "Side by side" }));
    expect(onViewModeChange).toHaveBeenCalledWith("side-by-side");
  });

  it("exposes the selected preview background without relying on color", () => {
    renderInspector({ image: asset, background: "black" });
    const backgrounds = within(screen.getByRole("group", { name: "Preview background options" }));

    expect(backgrounds.getByRole("button", { name: "black" })).toHaveAttribute("aria-pressed", "true");
    expect(backgrounds.getByRole("button", { name: "checker" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onRemoveBackground when the action is clicked", () => {
    const onRemoveBackground = vi.fn();
    renderInspector({ image: asset, canRemoveBackground: true, onRemoveBackground });

    fireEvent.click(screen.getByRole("button", { name: /remove background/i }));
    expect(onRemoveBackground).toHaveBeenCalledTimes(1);
  });

  it("disables the cloud cutout action without an image", () => {
    renderInspector();
    expect(screen.getByRole("button", { name: /remove with photoroom/i })).toBeDisabled();
  });

  it("calls onRemoveBackgroundCloud when the cloud cutout action is clicked", () => {
    const onRemoveBackgroundCloud = vi.fn();
    renderInspector({ image: asset, canRemoveBackgroundCloud: true, onRemoveBackgroundCloud });

    fireEvent.click(screen.getByRole("button", { name: /remove with photoroom/i }));
    expect(onRemoveBackgroundCloud).toHaveBeenCalledTimes(1);
  });

  it("shows no-license guidance until a license is saved", () => {
    renderInspector();
    expect(screen.getByText("No license saved yet.")).toBeInTheDocument();
  });

  it("shows the license is saved once photoroomLicense reports one", () => {
    renderInspector({ photoroomLicense: { hasLicense: true } });
    expect(screen.getByText("License saved on this device.")).toBeInTheDocument();
  });

  it("replaces the input with a saved indicator once a license exists, and Edit License brings the input back", () => {
    renderInspector({ photoroomLicense: { hasLicense: true } });

    expect(screen.queryByLabelText("ColorCut Pro license")).not.toBeInTheDocument();
    expect(screen.getByText("License saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit License" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit License" }));

    expect(screen.getByLabelText("ColorCut Pro license")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("hides the license code by default and reveals it via the toggle", () => {
    renderInspector();
    const input = screen.getByLabelText("ColorCut Pro license") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: /show license code/i }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: /hide license code/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("calls onSavePhotoroomLicense with the trimmed license code", () => {
    const onSavePhotoroomLicense = vi.fn();
    renderInspector({ onSavePhotoroomLicense });

    fireEvent.change(screen.getByLabelText("ColorCut Pro license"), {
      target: { value: "  CC-PRO-1234  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSavePhotoroomLicense).toHaveBeenCalledWith("CC-PRO-1234");
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
    expect(screen.getByRole("button", { name: "PNG" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CSS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TXT" })).toBeInTheDocument();
  });

  it("calls onExportPaletteImage when the PNG export action is clicked", () => {
    const onExportPaletteImage = vi.fn();
    renderInspector({ image: asset, palette, onExportPaletteImage });

    fireEvent.click(screen.getByRole("button", { name: "PNG" }));
    expect(onExportPaletteImage).toHaveBeenCalledTimes(1);
  });

  it("calls onExportPalette with the chosen format", () => {
    const onExportPalette = vi.fn();
    renderInspector({ image: asset, palette, onExportPalette });

    fireEvent.click(screen.getByRole("button", { name: "CSS" }));
    expect(onExportPalette).toHaveBeenCalledWith("css");
  });

  it("disables palette exports while another operation is processing", () => {
    renderInspector({ image: asset, palette, isProcessing: true });

    for (const button of within(screen.getByRole("group", { name: "Export palette" })).getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
