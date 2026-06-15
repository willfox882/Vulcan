import type { StructuralMethodResult } from "../../types";
import { useProjectStore } from "../../stores/projectStore";
import { UNIT_LABELS, toDisplay, formatDisplay } from "../../lib/units";

interface Props {
  elastic: StructuralMethodResult;
  ic: StructuralMethodResult;
  governing: StructuralMethodResult;
}

export function MethodComparison({ elastic, ic, governing }: Props) {
  const system = useProjectStore((s) => s.unitSystem);
  const stressUnit = UNIT_LABELS[system].stress;
  const ds = (v: number) => formatDisplay(toDisplay(v, "stress", system));
  return (
    <div className="bg-bg-surface border border-border-subtle rounded p-3">
      <div className="text-text-secondary text-xs font-medium mb-2">Method Comparison</div>
      <div className="grid grid-cols-2 gap-2">
        {[elastic, ic].map((m) => (
          <div
            key={m.method}
            className={`rounded p-2 text-xs ${
              m.method === governing.method
                ? "border border-accent/40 bg-accent/5"
                : "bg-bg-elevated"
            }`}
          >
            <div className="font-medium text-text-primary">{m.method}</div>
            <div className="text-text-secondary font-mono">fR = {ds(m.f_R)} {stressUnit}</div>
            <div className="text-text-secondary font-mono">{m.utilization_pct}%</div>
            {m.method === governing.method && (
              <div className="text-accent text-[10px] mt-1">← Governs</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
