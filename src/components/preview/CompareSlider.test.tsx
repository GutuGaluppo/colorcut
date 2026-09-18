import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompareSlider } from "./CompareSlider";

function renderSlider(position = 50, onPositionChange = vi.fn()) {
  render(
    <CompareSlider
      originalSrc="blob:original"
      cutoutSrc="asset://cutout.png"
      fileName="cat.png"
      position={position}
      onPositionChange={onPositionChange}
      zoom={1}
    />,
  );
  return { onPositionChange, slider: screen.getByRole("slider", { name: "Comparison position" }) };
}

describe("CompareSlider", () => {
  it("exposes both comparison images and the current percentage", () => {
    const { slider } = renderSlider(35);

    expect(screen.getByAltText("Original cat.png")).toHaveAttribute("src", "blob:original");
    expect(screen.getByAltText("Cutout of cat.png")).toHaveAttribute("src", "asset://cutout.png");
    expect(slider).toHaveAttribute("aria-valuenow", "35");
    expect(slider).toHaveAttribute("aria-valuetext", "35% cutout visible");
  });

  it("supports arrow, Home, and End keyboard controls", () => {
    const { onPositionChange, slider } = renderSlider(50);

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    fireEvent.keyDown(slider, { key: "ArrowUp" });
    fireEvent.keyDown(slider, { key: "Home" });
    fireEvent.keyDown(slider, { key: "End" });

    expect(onPositionChange).toHaveBeenNthCalledWith(1, 48);
    expect(onPositionChange).toHaveBeenNthCalledWith(2, 52);
    expect(onPositionChange).toHaveBeenNthCalledWith(3, 0);
    expect(onPositionChange).toHaveBeenNthCalledWith(4, 100);
  });

  it("clamps keyboard changes at the slider boundaries", () => {
    const lower = vi.fn();
    const { slider: lowerSlider } = renderSlider(0, lower);
    fireEvent.keyDown(lowerSlider, { key: "ArrowDown" });
    expect(lower).toHaveBeenCalledWith(0);
  });
});
