import { describe, it, expect } from "vitest";
import { toDisplay, fromDisplay, formatDisplay } from "./units";

describe("unit conversion (toDisplay / fromDisplay)", () => {
  it("length: 12 mm -> 0.4724 in and back", () => {
    expect(toDisplay(12, "length", "imperial")).toBeCloseTo(0.4724409, 5);
    expect(fromDisplay(0.4724409, "length", "imperial")).toBeCloseTo(12, 4);
  });

  it("metric is identity for every dimension", () => {
    for (const dim of ["length", "force", "moment", "stress", "angle"] as const) {
      expect(toDisplay(123.4, dim, "metric")).toBe(123.4);
      expect(fromDisplay(123.4, dim, "metric")).toBe(123.4);
    }
  });

  it("force: 10000 N -> 2248.09 lbf", () => {
    expect(toDisplay(10000, "force", "imperial")).toBeCloseTo(2248.089, 2);
  });

  it("stress: 483 MPa -> 70.05 ksi", () => {
    expect(toDisplay(483, "stress", "imperial")).toBeCloseTo(70.053, 2);
  });

  it("angle never converts", () => {
    expect(toDisplay(60, "angle", "imperial")).toBe(60);
    expect(fromDisplay(60, "angle", "imperial")).toBe(60);
  });

  it("round-trips within fp tolerance (imperial)", () => {
    for (const dim of ["length", "force", "moment", "stress"] as const) {
      const si = -1234.5;
      const back = fromDisplay(toDisplay(si, dim, "imperial"), dim, "imperial");
      expect(back).toBeCloseTo(si, 6);
    }
  });
});

describe("formatDisplay", () => {
  it("trims trailing zeros", () => {
    expect(formatDisplay(12.0)).toBe("12");
  });
  it("keeps ~6 significant figures", () => {
    expect(formatDisplay(0.47244094)).toBe("0.472441");
  });
  it("handles zero and negatives", () => {
    expect(formatDisplay(0)).toBe("0");
    expect(formatDisplay(-2248.089)).toBe("-2248.09");
  });
  it("non-finite falls back to 0", () => {
    expect(formatDisplay(Infinity)).toBe("0");
    expect(formatDisplay(NaN)).toBe("0");
  });
});
