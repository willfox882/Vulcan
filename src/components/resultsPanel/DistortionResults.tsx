import type { DistortionResult } from "../../types";

interface Props { result: DistortionResult; loading: boolean; }

function Range({ label, r, unit }: { label: string; r: { min: number; expected: number; max: number }; unit: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-text-secondary text-xs">{label}</span>
      <span className="text-text-primary text-xs font-mono">
        {r.expected}{unit} <span className="text-text-tertiary">({r.min}–{r.max})</span>
      </span>
    </div>
  );
}

export function DistortionResults({ result, loading }: Props) {
  return (
    <div className={`bg-bg-surface border border-border-subtle rounded p-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <div className="text-text-secondary text-xs font-medium mb-2">Distortion Estimate</div>
      <div className="space-y-0.5 mb-2">
        <Range label="Angular (°)" r={result.angular_deg} unit="°" />
        <Range label="Transverse (mm)" r={result.transverse_shrinkage_mm} unit=" mm" />
        <Range label="Longitudinal (mm)" r={result.longitudinal_shrinkage_mm} unit=" mm" />
      </div>
      <div className="border-t border-border-subtle pt-2 space-y-0.5">
        {result.mitigations.slice(0, 3).map((m, i) => (
          <div key={i} className="text-text-tertiary text-xs">• {m}</div>
        ))}
      </div>
      <div className="mt-2 text-text-tertiary text-[10px]">{result.note}</div>
    </div>
  );
}
