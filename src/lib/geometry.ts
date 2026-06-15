import type { Joint } from "../types";

/**
 * Returns the human-readable name of the first geometry dimension that is not
 * strictly positive, or null if all required dimensions are valid. Used to
 * keep non-physical geometry (zero/negative thickness, length, weld size) from
 * reaching the solver and producing a misleading "ADEQUATE" at zero demand.
 *
 * Fields that may legitimately be zero (root opening, root face, angles) and
 * optional fields with engine-side defaults (PJP throat) are not checked here.
 */
export function firstInvalidDimension(joint: Joint): string | null {
  const g = joint.geometry as unknown as Record<string, unknown>;

  const checks: Array<[string, string]> = [];
  switch (joint.type) {
    case "t_joint":
    case "cruciform":
      checks.push(
        ["webThickness", "Web thickness"],
        ["flangeThickness", "Flange thickness"],
        ["jointLength", "Joint length"],
        ["weldSize", "Weld size"],
      );
      break;
    case "lap_joint":
      checks.push(
        ["plate1Thickness", "Plate 1 thickness"],
        ["plate2Thickness", "Plate 2 thickness"],
        ["overlapLength", "Overlap length"],
        ["jointLength", "Weld length"],
        ["weldSize", "Weld size"],
      );
      break;
    case "edge":
      checks.push(
        ["plate1Thickness", "Plate 1 thickness"],
        ["plate2Thickness", "Plate 2 thickness"],
        ["jointLength", "Joint length"],
        ["weldSize", "Weld size"],
      );
      break;
    case "corner_joint": {
      checks.push(
        ["plate1Thickness", "Plate 1 thickness"],
        ["plate2Thickness", "Plate 2 thickness"],
        ["jointLength", "Joint length"],
      );
      const cfg = g.weldConfig;
      if (cfg === "inside" || cfg === "both") checks.push(["weldSizeInside", "Inside weld leg"]);
      if (cfg === "outside" || cfg === "both") checks.push(["weldSizeOutside", "Outside weld leg"]);
      break;
    }
    case "butt_joint":
      checks.push(
        ["plate1Thickness", "Plate 1 thickness"],
        ["plate2Thickness", "Plate 2 thickness"],
      );
      break;
    default:
      return null;
  }

  for (const [key, label] of checks) {
    const v = g[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return label;
  }
  return null;
}
