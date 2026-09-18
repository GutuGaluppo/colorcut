import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { useAppStore } from "../store/useAppStore";

class ResolvingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 640;
  naturalHeight = 480;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function selectFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

describe("App import flow", () => {
  const initialState = useAppStore.getState();
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal("Image", ResolvingImage);
  });

  afterEach(() => {
    useAppStore.setState(initialState, true);
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.unstubAllGlobals();
  });

  it("shows the empty state before any image is loaded", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /drop an image here/i })).toBeInTheDocument();
  });

  it("loads a valid image selected through the file picker into a shared ImageAsset state", async () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "cat.png", { type: "image/png" });

    selectFile(input, file);

    await waitFor(() => expect(screen.getByAltText("Preview of cat.png")).toBeInTheDocument());
    expect(screen.getByText("Image ready")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: /remove background/i })) {
      expect(button).toBeEnabled();
    }
  });

  it("surfaces a recoverable error and keeps the empty state for an unsupported file", async () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "cat.gif", { type: "image/gif" });

    selectFile(input, file);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Choose a PNG, JPEG, or WebP image."));
    expect(screen.getByRole("button", { name: /drop an image here/i })).toBeInTheDocument();
  });

  it("surfaces a recoverable error outside the desktop app without discarding the loaded image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer) }),
    );
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    selectFile(input, new File(["x"], "cat.png", { type: "image/png" }));
    await waitFor(() => expect(screen.getByAltText("Preview of cat.png")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: /remove background/i })[0]);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This native operation is available in the ColorCut desktop app.",
      ),
    );
    expect(screen.getByAltText("Preview of cat.png")).toBeInTheDocument();
  });
});
