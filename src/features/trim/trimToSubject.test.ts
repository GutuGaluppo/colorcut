import { describe, expect, it } from "vitest";
import { trimPaddingFor } from "./trimToSubject";

describe("trimPaddingFor", () => {
  it("keeps the 16 px minimum for small images", () => {
    expect(trimPaddingFor(400, 300)).toBe(16);
  });

  it("scales with the longer side for large photos", () => {
    expect(trimPaddingFor(4000, 3000)).toBe(80);
    expect(trimPaddingFor(3000, 4000)).toBe(80);
  });
});
