/**
 * Index of the governing (highest-utilization) entry in a list of load-case
 * utilizations. Returns -1 for an empty list; ties resolve to the first.
 * Used to envelope multiple static load cases into one governing design check.
 */
export function governingIndex(utilizations: number[]): number {
  let best = -1;
  let bestVal = -Infinity;
  for (let i = 0; i < utilizations.length; i++) {
    if (utilizations[i] > bestVal) {
      bestVal = utilizations[i];
      best = i;
    }
  }
  return best;
}
