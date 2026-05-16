import { useProjectStore } from "../../../stores/projectStore";
import { UNIT_LABELS } from "../../../lib/units";
import type { CornerJointGeometry } from "../../../types";

interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min?: number;
  step?: string;
}

function NumericField({ label, value, onChange, unit, min = 0.1, step = "0.5" }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-text-tertiary text-xs">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors"
        />
        <span className="text-text-tertiary text-xs w-8">{unit}</span>
      </div>
    </div>
  );
}

export function CornerJointGeometryPanel() {
  const { activeJoint, unitSystem, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const units = UNIT_LABELS[unitSystem];
  const g = activeJoint.geometry as CornerJointGeometry;

  function update(key: keyof CornerJointGeometry, val: number | string) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumericField label="Plate 1 Thickness (t₁)" value={g.plate1Thickness} onChange={(v) => update("plate1Thickness", v)} unit={units.length} />
        <NumericField label="Plate 2 Thickness (t₂)" value={g.plate2Thickness} onChange={(v) => update("plate2Thickness", v)} unit={units.length} />
        <NumericField label="Joint Length (L)" value={g.jointLength} onChange={(v) => update("jointLength", v)} unit={units.length} />
        <NumericField label="Corner Angle (θ)" value={g.cornerAngle} onChange={(v) => update("cornerAngle", v)} unit="°" step="5" />
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Weld Configuration</label>
        <div className="flex gap-2">
          {(["inside", "outside", "both"] as const).map((cfg) => (
            <button
              key={cfg}
              onClick={() => update("weldConfig", cfg)}
              className={`px-3 py-1.5 text-xs rounded border transition-colors capitalize ${
                g.weldConfig === cfg
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border-subtle text-text-secondary hover:border-border-strong"
              }`}
            >
              {cfg}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(g.weldConfig === "inside" || g.weldConfig === "both") && (
          <NumericField label="Inside Weld Leg (w_i)" value={g.weldSizeInside} onChange={(v) => update("weldSizeInside", v)} unit={units.length} />
        )}
        {(g.weldConfig === "outside" || g.weldConfig === "both") && (
          <NumericField label="Outside Weld Leg (w_o)" value={g.weldSizeOutside} onChange={(v) => update("weldSizeOutside", v)} unit={units.length} />
        )}
      </div>
    </div>
  );
}
