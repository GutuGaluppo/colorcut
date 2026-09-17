import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";

function renderTopBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  return render(
    <TopBar
      hasImage={false}
      canRemoveBackground={false}
      canExport={false}
      onOpen={vi.fn()}
      onPaste={vi.fn()}
      onRemoveBackground={vi.fn()}
      onExport={vi.fn()}
      {...overrides}
    />,
  );
}

describe("TopBar", () => {
  it("disables image-dependent actions when there is no image", () => {
    renderTopBar();

    expect(screen.getByRole("button", { name: /remove background/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /extract palette/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /open/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /paste/i })).toBeEnabled();
  });

  it("enables remove background and extract palette once an image is present", () => {
    renderTopBar({ hasImage: true, canRemoveBackground: true });

    expect(screen.getByRole("button", { name: /remove background/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /extract palette/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
  });

  it("enables export only once a cutout exists", () => {
    renderTopBar({ hasImage: true, canRemoveBackground: true, canExport: true });

    expect(screen.getByRole("button", { name: /export/i })).toBeEnabled();
  });

  it("invokes the open and paste handlers", () => {
    const onOpen = vi.fn();
    const onPaste = vi.fn();
    renderTopBar({ onOpen, onPaste });

    fireEvent.click(screen.getByRole("button", { name: /open/i }));
    fireEvent.click(screen.getByRole("button", { name: /paste/i }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onPaste).toHaveBeenCalledTimes(1);
  });

  it("invokes the remove background and export handlers", () => {
    const onRemoveBackground = vi.fn();
    const onExport = vi.fn();
    renderTopBar({ hasImage: true, canRemoveBackground: true, canExport: true, onRemoveBackground, onExport });

    fireEvent.click(screen.getByRole("button", { name: /remove background/i }));
    fireEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(onRemoveBackground).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
