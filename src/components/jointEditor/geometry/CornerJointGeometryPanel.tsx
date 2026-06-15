import { useProjectStore } from "../../../stores/projectStore";
import { NumericField } from "../NumericField";
import type { CornerJointGeometry } from "../../../types";

export function CornerJointGeometryPanel() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const g = activeJoint.geometry as CornerJointGeometry;

  function update(key: keyof CornerJointGeometry, val: number | string) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumericField label="Plate 1 Thickness (t₁)" value={g.plate1Thickness} onChange={(v) => update("plate1Thickness", v)} />
        <NumericField label="Plate 2 Thickness (t₂)" value={g.plate2Thickness} onChange={(v) => update("plate2Thickness", v)} />
        <NumericField label="Joint Length (L)" value={g.jointLength} onChange={(v) => update("jointLength", v)} />
        <NumericField label="Corner Angle (θ)" value={g.cornerAngle} onChange={(v) => update("cornerAngle", v)} dimension="angle" />
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
          <NumericField label="Inside Weld Leg (w_i)" value={g.weldSizeInside} onChange={(v) => update("weldSizeInside", v)} />
        )}
        {(g.weldConfig === "outside" || g.weldConfig === "both") && (
          <NumericField label="Outside Weld Leg (w_o)" value={g.weldSizeOutside} onChange={(v) => update("weldSizeOutside", v)} />
        )}
      </div>
    </div>
  );
}
