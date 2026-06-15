export type UnitSystem = "metric" | "imperial";

export const UNIT_LABELS = {
  metric: {
    length: "mm",
    force: "N",
    moment: "N·mm",
    stress: "MPa",
    area: "mm²",
    angle: "°",
  },
  imperial: {
    length: "in",
    force: "lbf",
    moment: "lbf·in",
    stress: "ksi",
    area: "in²",
    angle: "°",
  },
} as const;

/**
 * Physical dimension of an input field. All values are stored internally in
 * SI (mm, N, N·mm, MPa); only the displayed value is converted. "angle" is
 * dimensionless across unit systems (no conversion).
 */
export type Dimension = "length" | "force" | "moment" | "stress" | "angle";

/** SI value → value shown in the active unit system. */
export function toDisplay(siValue: number, dim: Dimension, system: UnitSystem): number {
  if (system === "metric") return siValue;
  switch (dim) {
    case "length": return mmToIn(siValue);
    case "force": return nToLbf(siValue);
    case "moment": return nMmToLbfIn(siValue);
    case "stress": return mpaToKsi(siValue);
    case "angle": return siValue;
  }
}

/** Value entered in the active unit system → SI value for storage. */
export function fromDisplay(displayValue: number, dim: Dimension, system: UnitSystem): number {
  if (system === "metric") return displayValue;
  switch (dim) {
    case "length": return inToMm(displayValue);
    case "force": return lbfToN(displayValue);
    case "moment": return lbfInToNMm(displayValue);
    case "stress": return ksiToMpa(displayValue);
    case "angle": return displayValue;
  }
}

/** Format a display value with ~6 significant figures, trailing zeros trimmed. */
export function formatDisplay(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  return String(parseFloat(n.toPrecision(6)));
}

export function mmToIn(mm: number): number {
  return mm / 25.4;
}

export function inToMm(inches: number): number {
  return inches * 25.4;
}

export function nToLbf(n: number): number {
  return n * 0.2248089;
}

export function lbfToN(lbf: number): number {
  return lbf / 0.2248089;
}

export function nMmToLbfIn(nMm: number): number {
  return nMm * 0.2248089 * (1 / 25.4);
}

export function lbfInToNMm(lbfIn: number): number {
  return lbfIn * (1 / 0.2248089) * 25.4;
}

export function mpaToKsi(mpa: number): number {
  return mpa * 0.14503774;
}

export function ksiToMpa(ksi: number): number {
  return ksi / 0.14503774;
}

export function convertLength(val: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return val;
  return from === "metric" ? mmToIn(val) : inToMm(val);
}

export function convertForce(val: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return val;
  return from === "metric" ? nToLbf(val) : lbfToN(val);
}

export function convertMoment(val: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return val;
  return from === "metric" ? nMmToLbfIn(val) : lbfInToNMm(val);
}

export function convertStress(val: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return val;
  return from === "metric" ? mpaToKsi(val) : ksiToMpa(val);
}
