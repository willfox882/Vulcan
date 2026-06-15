import { useProjectStore } from "../../../stores/projectStore";
import { NumericField } from "../NumericField";
import type { TJointGeometry } from "../../../types";

export function TJointGeometryPanel() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const g = activeJoint.geometry as TJointGeometry;

  function update(key: keyof TJointGeometry, val: number) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <NumericField label="Web Thickness (t₁)" value={g.webThickness} onChange={(v) => update("webThickness", v)} />
      <NumericField label="Flange Thickness (t₂)" value={g.flangeThickness} onChange={(v) => update("flangeThickness", v)} />
      <NumericField label="Joint Length (L)" value={g.jointLength} onChange={(v) => update("jointLength", v)} />
      <NumericField label="Weld Leg Size (w)" value={g.weldSize} onChange={(v) => update("weldSize", v)} />
    </div>
  );
}
