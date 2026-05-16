import type { FatigueResult } from "../../types";

interface Props {
  result: FatigueResult;
  loadCaseName: string;
}

export function FatigueResults({ result, loadCaseName }: Props) {
  const passColor =
    result.passes === true
      ? "text-semantic-pass"
      : result.passes === false
      ? "text-semantic-fail"
      : "text-text-secondary";

  return (
    <div
      className={`bg-bg-surface border rounded p-3 ${
        result.passes === false ? "border-semantic-fail/40" : "border-border-subtle"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="text-text-secondary text-xs font-medium">Fatigue — {loadCaseName}</div>
        <span className={`text-xs font-semibold ${passColor}`}>
          {result.passes === true ? "PASS" : result.passes === false ? "FAIL" : "—"}
        </span>
      </div>
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between">
          <span className="text-text-secondary">Category</span>
          <span className="text-text-primary font-mono">
            {result.category} — {result.category_description.split(",")[0]}
          </span>
        </div>
        {result.stress_range_MPa !== null && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Stress range</span>
            <span className="text-text-primary font-mono">{result.stress_range_MPa} MPa</span>
          </div>
        )}
        {result.cycles_to_failure !== null && result.cycles_to_failure !== Infinity && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Cycles to failure</span>
            <span className="text-text-primary font-mono">
              {result.cycles_to_failure.toExponential(2)}
            </span>
          </div>
        )}
        {result.damage !== null && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Damage D</span>
            <span className="text-text-primary font-mono">{result.damage.toFixed(4)}</span>
          </div>
        )}
        {result.service_life_years !== null && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Service life</span>
            <span className="text-text-primary font-mono">
              {result.service_life_years === Infinity ? "∞" : `${result.service_life_years} yr`}
            </span>
          </div>
        )}
        {result.safety_factor !== null && (
          <div className="flex justify-between border-t border-border-subtle pt-1 mt-1">
            <span className="text-text-secondary">Safety factor</span>
            <span className={`font-bold font-mono ${passColor}`}>
              {result.safety_factor === Infinity ? "∞" : result.safety_factor?.toFixed(2)}
            </span>
          </div>
        )}
        {result.below_threshold && (
          <div className="text-semantic-pass text-[10px] mt-1">
            Below endurance threshold ({result.threshold_MPa} MPa) — infinite life
          </div>
        )}
      </div>
    </div>
  );
}
