import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageWorkspace } from "./ImageWorkspace";
import type { ImageAsset } from "../../types/domain";

const asset: ImageAsset = {
  id: "1",
  sourceUrl: "blob:one",
  fileName: "cat.png",
  width: 100,
  height: 80,
  mimeType: "image/png",
  fileSizeBytes: 2048,
};

const noop = () => {};

function renderWorkspace(overrides: Partial<Parameters<typeof ImageWorkspace>[0]> = {}) {
  return render(
    <ImageWorkspace
      image={null}
      viewMode="original"
      sliderPosition={50}
      onSliderPositionChange={noop}
      background="checker"
      zoom={1}
      isDragging={false}
      onOpen={noop}
      onClear={noop}
      onZoomIn={noop}
      onZoomOut={noop}
      onResetZoom={noop}
      onDragEnter={noop}
      onDragLeave={noop}
      onDragOver={noop}
      onDrop={noop}
      {...overrides}
    />,
  );
}

describe("ImageWorkspace", () => {
  it("shows the empty state and opens the file picker on click when there is no image", () => {
    const onOpen = vi.fn();
    renderWorkspace({ onOpen });

    fireEvent.click(screen.getByRole("button", { name: /drop an image here/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("renders the image and zoom controls once an image is present", () => {
    renderWorkspace({ image: asset });

    expect(screen.getByAltText("Preview of cat.png")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("sizes the checkered stage to fit the image's own aspect ratio within the available space, not stretched", () => {
    const { container } = renderWorkspace({ image: asset });

    // MOCK_CONTAINER_SIZE is 400x300; a 100x80 image contains at scale 3.75 -> 375x300.
    expect(container.querySelector(".image-stage")).toHaveStyle({ width: "375px", height: "300px" });
  });

  it("calls the zoom handlers from the toolbar", () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onResetZoom = vi.fn();
    renderWorkspace({ image: asset, zoom: 1.5, onZoomIn, onZoomOut, onResetZoom });

    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    fireEvent.click(screen.getByRole("button", { name: /zoom out/i }));
    fireEvent.click(screen.getByText("150%"));

    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onResetZoom).toHaveBeenCalledTimes(1);
  });

  it("disables zoom out at the minimum and zoom in at the maximum", () => {
    const { rerender } = renderWorkspace({ image: asset, zoom: 0.25 });
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeDisabled();

    rerender(
      <ImageWorkspace
        image={asset}
        viewMode="original"
        sliderPosition={50}
        onSliderPositionChange={noop}
        background="checker"
        zoom={4}
        isDragging={false}
        onOpen={noop}
        onClear={noop}
        onZoomIn={noop}
        onZoomOut={noop}
        onResetZoom={noop}
        onDragEnter={noop}
        onDragLeave={noop}
        onDragOver={noop}
        onDrop={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /zoom in/i })).toBeDisabled();
  });

  it("calls onClear when the close button is pressed", () => {
    const onClear = vi.fn();
    renderWorkspace({ image: asset, onClear });

    fireEvent.click(screen.getByRole("button", { name: /close image/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("shows no processing feedback while idle", () => {
    const { container } = renderWorkspace({ image: asset });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.querySelector(".processing-mesh")).not.toBeInTheDocument();
  });

  it("overlays the scanning mesh and announces the status while processing", () => {
    const { container } = renderWorkspace({ image: asset, isProcessing: true, processingMessage: "Removing background…" });

    expect(screen.getByRole("status")).toHaveTextContent("Removing background…");
    expect(container.querySelector(".processing-mesh__scanline")).toBeInTheDocument();
    expect(container.querySelectorAll(".processing-mesh__corner")).toHaveLength(4);
    expect(container.querySelector(".image-stage")).toHaveClass("image-stage--processing");
  });

  it("shows the cutout image when viewMode is cutout and a cutout exists", () => {
    renderWorkspace({ image: asset, viewMode: "cutout", cutoutSrc: "asset://cutout.png" });

    const img = screen.getByAltText("Cutout of cat.png");
    expect(img).toHaveAttribute("src", "asset://cutout.png");
  });

  it("renders a draggable comparison slider in slider mode", () => {
    renderWorkspace({ image: asset, viewMode: "slider", cutoutSrc: "asset://cutout.png", sliderPosition: 30 });

    const handle = screen.getByRole("slider", { name: /comparison position/i });
    expect(handle).toHaveAttribute("aria-valuenow", "30");
  });

  it("renders both images side by side with labels in side-by-side mode", () => {
    const { container } = renderWorkspace({ image: asset, viewMode: "side-by-side", cutoutSrc: "asset://cutout.png" });

    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Cutout")).toBeInTheDocument();
    expect(screen.getByAltText("Original cat.png")).toBeInTheDocument();
    expect(screen.getByAltText("Cutout of cat.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close image/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Zoom" })).toBeInTheDocument();
    for (const stage of container.querySelectorAll(".image-stage")) {
      expect(stage).toHaveStyle({ width: "190px", height: "152px" });
    }
  });

  it("keeps processing feedback visible in side-by-side mode", () => {
    renderWorkspace({
      image: asset,
      viewMode: "side-by-side",
      cutoutSrc: "asset://cutout.png",
      isProcessing: true,
      processingMessage: "Extracting palette…",
    });

    expect(screen.getByRole("status")).toHaveTextContent("Extracting palette…");
  });

  it("falls back to showing the original image when slider/side-by-side is selected without a cutout yet", () => {
    renderWorkspace({ image: asset, viewMode: "slider", cutoutSrc: undefined });
    expect(screen.getByAltText("Preview of cat.png")).toBeInTheDocument();
  });
});
