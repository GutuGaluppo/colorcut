import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom has no layout engine and doesn't implement ResizeObserver. Components that
// measure their container (e.g. ImageWorkspace's contain-fit sizing) need this to
// exist so their effects don't throw. It reports a fixed content-box size on
// observe(), like a real ResizeObserver's initial callback, so tests can assert
// on the resulting computed layout deterministically instead of getting null forever.
export const MOCK_CONTAINER_SIZE = { width: 400, height: 300 };

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    #callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback;
    }

    observe(target: Element) {
      const entry = {
        target,
        contentRect: { ...MOCK_CONTAINER_SIZE, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0 },
        contentBoxSize: [{ inlineSize: MOCK_CONTAINER_SIZE.width, blockSize: MOCK_CONTAINER_SIZE.height }],
        borderBoxSize: [{ inlineSize: MOCK_CONTAINER_SIZE.width, blockSize: MOCK_CONTAINER_SIZE.height }],
        devicePixelContentBoxSize: [{ inlineSize: MOCK_CONTAINER_SIZE.width, blockSize: MOCK_CONTAINER_SIZE.height }],
      } as unknown as ResizeObserverEntry;
      this.#callback([entry], this as unknown as ResizeObserver);
    }

    unobserve() {}
    disconnect() {}
  };
}

