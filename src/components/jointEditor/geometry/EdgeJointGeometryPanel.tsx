import { useProjectStore } from "../../../stores/projectStore";
import { NumericField } from "../NumericField";
import type { EdgeJointGeometry } from "../../../types";

export function EdgeJointGeometryPanel() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const g = activeJoint.geometry as EdgeJointGeometry;

  function update(key: keyof EdgeJointGeometry, val: number) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <NumericField label="Plate 1 Thickness (t₁)" value={g.plate1Thickness} onChange={(v) => update("plate1Thickness", v)} />
      <NumericField label="Plate 2 Thickness (t₂)" value={g.plate2Thickness} onChange={(v) => update("plate2Thickness", v)} />
      <NumericField label="Joint Length (L)" value={g.jointLength} onChange={(v) => update("jointLength", v)} />
      <NumericField label="Weld Leg Size (w)" value={g.weldSize} onChange={(v) => update("weldSize", v)} />
    </div>
  );
}
