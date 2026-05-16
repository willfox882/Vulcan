import type { AnalysisResult, StructuralMethodResult } from "../../types";
import { MethodComparison } from "./MethodComparison";

interface Props {
  result: AnalysisResult;
  loading: boolean;
}

function Row({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-text-secondary text-xs">{label}</span>
      <span className="text-text-primary text-xs font-mono">
        {value}{unit ? <span className="text-text-tertiary ml-0.5">{unit}</span> : null}
      </span>
    </div>
  );
}

export function StructuralResults({ result, loading }: Props) {
  const s: StructuralMethodResult = result.structural_governing;
  const v = result.validation;

  const pct = s.utilization_pct;
  const utilColor = pct > 100 ? "text-semantic-fail" : pct > 80 ? "text-semantic-warning" : "text-semantic-pass";
  const adequacyColor = s.adequate && s.w_provided >= v.w_min_aws ? "text-semantic-pass" : "text-semantic-fail";
  const adequacyText = s.adequate && s.w_provided >= v.w_min_aws ? "ADEQUATE" : "INADEQUATE";

  return (
    <div className={`bg-bg-surface border rounded p-3 transition-opacity ${loading ? "opacity-60" : "opacity-100"} ${pct > 100 ? "border-semantic-fail/40" : "border-border-subtle"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-secondary text-xs font-medium">Recommendation</span>
        <span className={`text-xs font-semibold ${adequacyColor}`}>{adequacyText}</span>
      </div>
      <div className="mb-3 pb-3 border-b border-border-subtle">
        <p className="text-text-primary text-sm">{s.method === "Groove Weld" ? "Groove weld" : "Fillet weld"}</p>
        <p className="text-text-secondary text-xs">
          Required: <span className="text-text-primary font-mono">{s.w_required} mm</span>
          {" · "}Provided: <span className="text-text-primary font-mono">{s.w_provided} mm</span>
        </p>
        <p className="text-text-secondary text-xs">
          AWS min: <span className="font-mono">{v.w_min_aws} mm</span>
          {" · "}AWS max: <span className="font-mono">{v.w_max_aws} mm</span>
        </p>
      </div>

      {result.structural_ic && (
        <div className="mb-3">
          <MethodComparison
            elastic={result.structural_elastic}
            ic={result.structural_ic}
            governing={result.structural_governing}
          />
        </div>
      )}

      <div className="space-y-0.5">
        <div className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1">{s.method}</div>
        <Row label="Direct shear fᵥ" value={s.f_v} unit=" MPa" />
        <Row label="Torsion fₜ" value={s.f_t} unit=" MPa" />
        <Row label="Bending f_b" value={s.f_b} unit=" MPa" />
        <Row label="Resultant fᵣ" value={s.f_R} unit=" MPa" />
        <Row label="Allowable Fᵥᵥ" value={s.F_w_allow} unit=" MPa" />
        <div className="flex justify-between items-center pt-1 border-t border-border-subtle mt-1">
          <span className="text-text-secondary text-xs">Utilization</span>
          <span className={`text-sm font-bold font-mono ${utilColor}`}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
