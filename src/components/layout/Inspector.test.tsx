import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Inspector } from "./Inspector";
import type { ImageAsset, RemovalResult } from "../../types/domain";

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
});
