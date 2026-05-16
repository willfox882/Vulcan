export type UnitSystem = "metric" | "imperial";

export const UNIT_LABELS = {
  metric: {
    length: "mm",
    force: "N",
    moment: "N·mm",
    stress: "MPa",
    area: "mm²",
  },
  imperial: {
    length: "in",
    force: "lbf",
    moment: "lbf·in",
    stress: "ksi",
    area: "in²",
  },
} as const;

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
