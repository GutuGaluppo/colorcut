import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toast } from "./Toast";

afterEach(() => {
  vi.useRealTimers();
});

describe("Toast", () => {
  it("announces errors assertively and can be dismissed", () => {
    const onDismiss = vi.fn();
    render(<Toast tone="error" message="Export failed." onDismiss={onDismiss} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Export failed.");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses itself after the configured duration", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast tone="success" message="Exported palette.png" onDismiss={onDismiss} durationMs={1000} />);

    act(() => vi.advanceTimersByTime(999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
