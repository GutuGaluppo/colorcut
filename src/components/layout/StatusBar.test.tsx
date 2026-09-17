import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBar } from "./StatusBar";
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

describe("StatusBar", () => {
  it("shows the status message without file metadata when there is no image", () => {
    render(<StatusBar image={null} status="idle" message="Ready" />);

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText(/cat.png/)).not.toBeInTheDocument();
  });

  it("shows file metadata alongside the message once an image is loaded", () => {
    render(<StatusBar image={asset} status="success" message="Image ready" />);

    expect(screen.getByText("Image ready")).toBeInTheDocument();
    expect(screen.getByText("cat.png · 100 × 80")).toBeInTheDocument();
  });

  it("reflects an error status in the status indicator", () => {
    const { container } = render(<StatusBar image={null} status="error" message="The image could not be opened." />);

    expect(screen.getByText("The image could not be opened.")).toBeInTheDocument();
    expect(container.querySelector(".status-dot--error")).toBeInTheDocument();
  });
});
