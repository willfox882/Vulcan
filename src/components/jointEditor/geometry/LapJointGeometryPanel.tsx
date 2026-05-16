import { useProjectStore } from "../../../stores/projectStore";
import { UNIT_LABELS } from "../../../lib/units";
import type { LapJointGeometry } from "../../../types";

interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min?: number;
}

function NumericField({ label, value, onChange, unit, min = 0.1 }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-text-tertiary text-xs">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          min={min}
          step="0.5"
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors"
        />
        <span className="text-text-tertiary text-xs w-8">{unit}</span>
      </div>
    </div>
  );
}

export function LapJointGeometryPanel() {
  const { activeJoint, unitSystem, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const units = UNIT_LABELS[unitSystem];
  const g = activeJoint.geometry as LapJointGeometry;

  function update(key: keyof LapJointGeometry, val: number | string) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumericField label="Plate 1 Thickness (t₁)" value={g.plate1Thickness} onChange={(v) => update("plate1Thickness", v)} unit={units.length} />
        <NumericField label="Plate 2 Thickness (t₂)" value={g.plate2Thickness} onChange={(v) => update("plate2Thickness", v)} unit={units.length} />
        <NumericField label="Overlap Length (a)" value={g.overlapLength} onChange={(v) => update("overlapLength", v)} unit={units.length} />
        <NumericField label="Weld Length (L)" value={g.jointLength} onChange={(v) => update("jointLength", v)} unit={units.length} />
        <NumericField label="Weld Leg Size (w)" value={g.weldSize} onChange={(v) => update("weldSize", v)} unit={units.length} />
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Weld Configuration</label>
        <div className="flex gap-2">
          {(["both_sides", "one_side"] as const).map((cfg) => (
            <button
              key={cfg}
              onClick={() => update("weldConfig", cfg)}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                g.weldConfig === cfg
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border-subtle text-text-secondary hover:border-border-strong"
              }`}
            >
              {cfg === "both_sides" ? "Both Sides" : "One Side"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
