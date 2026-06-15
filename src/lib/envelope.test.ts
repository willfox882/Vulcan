import { describe, it, expect } from "vitest";
import { governingIndex } from "./envelope";

describe("governingIndex", () => {
  it("returns -1 for an empty list", () => {
    expect(governingIndex([])).toBe(-1);
  });

  it("picks the highest utilization", () => {
    expect(governingIndex([10, 55, 30])).toBe(1);
    expect(governingIndex([90, 12, 4])).toBe(0);
    expect(governingIndex([5, 9, 120])).toBe(2);
  });

  it("resolves ties to the first occurrence", () => {
    expect(governingIndex([42, 42, 10])).toBe(0);
  });

  it("handles a single entry", () => {
    expect(governingIndex([7])).toBe(0);
  });

  it("handles negatives / zero", () => {
    expect(governingIndex([0, 0, 0])).toBe(0);
    expect(governingIndex([-5, -1, -9])).toBe(1);
  });
});
