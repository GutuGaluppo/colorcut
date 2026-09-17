import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PalettePreview } from "./PalettePreview";

describe("PalettePreview", () => {
  it("labels the decorative brand palette", () => {
    render(<PalettePreview />);
    expect(screen.getByLabelText("Brand color preview")).toBeInTheDocument();
  });
});

