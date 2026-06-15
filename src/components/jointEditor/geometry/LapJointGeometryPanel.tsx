import { useProjectStore } from "../../../stores/projectStore";
import { NumericField } from "../NumericField";
import type { LapJointGeometry } from "../../../types";

export function LapJointGeometryPanel() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const g = activeJoint.geometry as LapJointGeometry;

  function update(key: keyof LapJointGeometry, val: number | string) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumericField label="Plate 1 Thickness (t₁)" value={g.plate1Thickness} onChange={(v) => update("plate1Thickness", v)} />
        <NumericField label="Plate 2 Thickness (t₂)" value={g.plate2Thickness} onChange={(v) => update("plate2Thickness", v)} />
        <NumericField label="Overlap Length (a)" value={g.overlapLength} onChange={(v) => update("overlapLength", v)} />
        <NumericField label="Weld Length (L)" value={g.jointLength} onChange={(v) => update("jointLength", v)} />
        <NumericField label="Weld Leg Size (w)" value={g.weldSize} onChange={(v) => update("weldSize", v)} />
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
