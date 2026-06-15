import { useProjectStore } from "../../../stores/projectStore";
import { NumericField } from "../NumericField";
import type { ButtJointGeometry } from "../../../types";

const GROOVE_TYPES: Array<{ value: ButtJointGeometry["grooveType"]; label: string }> = [
  { value: "square",   label: "Square" },
  { value: "v_groove", label: "V-Groove" },
  { value: "double_v", label: "Double-V" },
  { value: "j_groove", label: "J-Groove" },
  { value: "u_groove", label: "U-Groove" },
];

export function ButtJointGeometryPanel() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const g = activeJoint.geometry as ButtJointGeometry;

  function update(key: keyof ButtJointGeometry, val: number | string | undefined) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumericField label="Plate 1 Thickness (t₁)" value={g.plate1Thickness} onChange={(v) => update("plate1Thickness", v)} min={0.1} />
        <NumericField label="Plate 2 Thickness (t₂)" value={g.plate2Thickness} onChange={(v) => update("plate2Thickness", v)} min={0.1} />
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Groove Type</label>
        <select
          value={g.grooveType}
          onChange={(e) => update("grooveType", e.target.value)}
          className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/60 transition-colors"
        >
          {GROOVE_TYPES.map((gt) => (
            <option key={gt.value} value={gt.value}>{gt.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumericField label="Groove Angle (α)" value={g.grooveAngle} onChange={(v) => update("grooveAngle", v)} dimension="angle" />
        <NumericField label="Root Opening (r)" value={g.rootOpening} onChange={(v) => update("rootOpening", v)} min={0} />
        <NumericField label="Root Face (f)" value={g.rootFace} onChange={(v) => update("rootFace", v)} min={0} />
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Penetration</label>
        <div className="flex gap-2">
          {(["full", "partial"] as const).map((pen) => (
            <button
              key={pen}
              onClick={() => update("penetration", pen)}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                g.penetration === pen
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border-subtle text-text-secondary hover:border-border-strong"
              }`}
            >
              {pen === "full" ? "Full (CJP)" : "Partial (PJP)"}
            </button>
          ))}
        </div>
      </div>
      {g.penetration === "partial" && (
        <NumericField
          label="Effective Throat Depth"
          value={g.partialPenetrationDepth ?? Math.min(g.plate1Thickness, g.plate2Thickness) * 0.6}
          onChange={(v) => update("partialPenetrationDepth", v)}
          min={0.1}
        />
      )}
    </div>
  );
}
