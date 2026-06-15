import { useProjectStore } from "../../../stores/projectStore";
import { NumericField } from "../NumericField";
import type { CruciformJointGeometry } from "../../../types";

export function CruciformJointGeometryPanel() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const g = activeJoint.geometry as CruciformJointGeometry;

  function update(key: keyof CruciformJointGeometry, val: number) {
    updateJoint(activeJoint!.id, { geometry: { ...g, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <NumericField label="Web Thickness (t_w)" value={g.webThickness} onChange={(v) => update("webThickness", v)} />
        <NumericField label="Flange Thickness (t_f)" value={g.flangeThickness} onChange={(v) => update("flangeThickness", v)} />
        <NumericField label="Joint Length (L)" value={g.jointLength} onChange={(v) => update("jointLength", v)} />
        <NumericField label="Weld Leg Size (w)" value={g.weldSize} onChange={(v) => update("weldSize", v)} />
      </div>
      <p className="text-text-tertiary text-[10px]">
        4 fillet welds — both sides of web at both flanges
      </p>
    </div>
  );
}
