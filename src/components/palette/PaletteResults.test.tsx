import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaletteResults } from "./PaletteResults";
import type { PaletteResult } from "../../types/domain";

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

describe("PaletteResults", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a swatch and a detail row per color", () => {
    render(<PaletteResults palette={palette} />);

    expect(
      within(screen.getByRole("list", { name: "Extracted palette swatches" })).getAllByRole("listitem"),
    ).toHaveLength(2);
    expect(screen.getByText("#2F8CFF")).toBeInTheDocument();
    expect(screen.getByText("62.5%")).toBeInTheDocument();
    expect(screen.getByText("#45D98C")).toBeInTheDocument();
    expect(screen.getByText("37.5%")).toBeInTheDocument();
  });

  it("copies the hex value when a swatch is clicked", async () => {
    render(<PaletteResults palette={palette} />);

    fireEvent.click(screen.getByRole("button", { name: /copy #2f8cff/i }));

    expect(writeText).toHaveBeenCalledWith("#2F8CFF");
  });

  it("copies the formatted rgb/hsl/oklch value when its chip is clicked", async () => {
    render(<PaletteResults palette={palette} />);

    fireEvent.click(screen.getByRole("button", { name: /copy rgb\(47, 140, 255\)/i }));
    expect(writeText).toHaveBeenCalledWith("rgb(47, 140, 255)");

    fireEvent.click(screen.getByRole("button", { name: /copy hsl\(214, 100%, 59%\)/i }));
    expect(writeText).toHaveBeenCalledWith("hsl(214, 100%, 59%)");

    fireEvent.click(screen.getByRole("button", { name: /copy oklch\(0\.62 0\.190 259\)/i }));
    expect(writeText).toHaveBeenCalledWith("oklch(0.62 0.190 259)");
  });
});
