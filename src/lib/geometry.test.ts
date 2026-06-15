import { describe, it, expect } from "vitest";
import { firstInvalidDimension } from "./geometry";
import type { Joint } from "../types";

function tJoint(overrides: Record<string, number>): Joint {
  return {
    id: "j",
    name: "n",
    type: "t_joint",
    geometry: {
      type: "t_joint",
      webThickness: 12,
      flangeThickness: 16,
      jointLength: 400,
      weldSize: 8,
      ...overrides,
    },
  } as unknown as Joint;
}

describe("firstInvalidDimension", () => {
  it("passes a fully-specified positive T-joint", () => {
    expect(firstInvalidDimension(tJoint({}))).toBeNull();
  });

  it("flags zero and negative dimensions", () => {
    expect(firstInvalidDimension(tJoint({ weldSize: 0 }))).toBe("Weld size");
    expect(firstInvalidDimension(tJoint({ webThickness: -1 }))).toBe("Web thickness");
    expect(firstInvalidDimension(tJoint({ jointLength: 0 }))).toBe("Joint length");
  });

  it("returns the first offending field in declared order", () => {
    expect(firstInvalidDimension(tJoint({ webThickness: 0, weldSize: 0 }))).toBe("Web thickness");
  });

  it("checks corner weld legs per configuration", () => {
    const corner = (cfg: string, o: Record<string, number>): Joint =>
      ({
        id: "j", name: "n", type: "corner_joint",
        geometry: { type: "corner_joint", plate1Thickness: 12, plate2Thickness: 12, jointLength: 300, weldConfig: cfg, weldSizeInside: 8, weldSizeOutside: 6, ...o },
      } as unknown as Joint);
    expect(firstInvalidDimension(corner("both", {}))).toBeNull();
    expect(firstInvalidDimension(corner("inside", { weldSizeInside: 0 }))).toBe("Inside weld leg");
    // outside leg not required when config is "inside"
    expect(firstInvalidDimension(corner("inside", { weldSizeOutside: 0 }))).toBeNull();
    expect(firstInvalidDimension(corner("both", { weldSizeOutside: -1 }))).toBe("Outside weld leg");
  });

  it("butt joint allows zero root opening/face (only plate thickness required)", () => {
    const butt = (o: Record<string, number>): Joint =>
      ({
        id: "j", name: "n", type: "butt_joint",
        geometry: { type: "butt_joint", plate1Thickness: 12, plate2Thickness: 12, grooveAngle: 60, rootOpening: 0, rootFace: 0, penetration: "full", ...o },
      } as unknown as Joint);
    expect(firstInvalidDimension(butt({}))).toBeNull();
    expect(firstInvalidDimension(butt({ plate1Thickness: 0 }))).toBe("Plate 1 thickness");
  });

  it("flags non-numeric / missing values", () => {
    const j = tJoint({});
    (j.geometry as unknown as Record<string, unknown>).weldSize = undefined;
    expect(firstInvalidDimension(j)).toBe("Weld size");
  });
});
