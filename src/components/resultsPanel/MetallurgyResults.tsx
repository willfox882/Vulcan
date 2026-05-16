import type { MetallurgyResult } from "../../types";

interface Props { result: MetallurgyResult; loading: boolean; }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-text-secondary text-xs">{label}</span>
      <span className="text-text-primary text-xs font-mono">{value}</span>
    </div>
  );
}

export function MetallurgyResults({ result, loading }: Props) {
  const ce = result.carbon_equivalent;
  const ph = result.preheat;
  const hi = result.heat_input;
  const t85 = result.cooling_time_t85;

  return (
    <div className={`bg-bg-surface border border-border-subtle rounded p-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <div className="text-text-secondary text-xs font-medium mb-2">Metallurgical Requirements</div>
      <div className="space-y-0.5">
        <Row label="CE (IIW)" value={ce.CE_IIW.toFixed(3)} />
        <Row label="Pcm" value={ce.Pcm.toFixed(3)} />
        <Row label="CET" value={ce.CET.toFixed(3)} />
        <div className="border-t border-border-subtle my-1" />
        <Row label={`Preheat (${ph.method_governing})`} value={`${ph.required_C}°C`} />
        <Row label="Heat input range" value={`${hi.min_kJ_per_mm}–${hi.max_kJ_per_mm} kJ/mm`} />
        <Row label={`t₈/₅ (${t85.regime})`} value={`${t85.value_s} s`} />
        <Row label="Hydrogen class" value={result.hydrogen_class} />
        <Row label="PWHT" value={result.pwht_required ? "Required" : "Not required"} />
      </div>
      {result.pwht_required && (
        <div className="mt-2 text-xs text-semantic-warning border border-semantic-warning/30 bg-semantic-warning/5 rounded p-1.5">
          PWHT required — consult AWS D1.1 Clause 4.4
        </div>
      )}
    </div>
  );
}
