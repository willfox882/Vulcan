import { useProjectStore } from "../../../stores/projectStore";
import { UNIT_LABELS } from "../../../lib/units";
import type { TJointGeometry } from "../../../types";

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

export function TJointGeometryPanel() {
  const { activeJoint, unitSystem, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const units = UNIT_LABELS[unitSystem];
  const g = activeJoint.geometry as TJointGeometry;

  function update(key: keyof TJointGeometry, val: number) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <NumericField label="Web Thickness (t₁)" value={g.webThickness} onChange={(v) => update("webThickness", v)} unit={units.length} />
      <NumericField label="Flange Thickness (t₂)" value={g.flangeThickness} onChange={(v) => update("flangeThickness", v)} unit={units.length} />
      <NumericField label="Joint Length (L)" value={g.jointLength} onChange={(v) => update("jointLength", v)} unit={units.length} />
      <NumericField label="Weld Leg Size (w)" value={g.weldSize} onChange={(v) => update("weldSize", v)} unit={units.length} />
    </div>
  );
}
