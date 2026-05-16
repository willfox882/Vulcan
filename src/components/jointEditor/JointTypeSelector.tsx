import { useProjectStore } from "../../stores/projectStore";
import type { Joint, TJointGeometry, LapJointGeometry, ButtJointGeometry, CornerJointGeometry, EdgeJointGeometry, CruciformJointGeometry } from "../../types";

const JOINT_TYPES = [
  { id: "t_joint",      label: "T-Joint",   phase: 1 },
  { id: "lap_joint",    label: "Lap",       phase: 2 },
  { id: "butt_joint",   label: "Butt",      phase: 2 },
  { id: "corner_joint", label: "Corner",    phase: 2 },
  { id: "edge",         label: "Edge",      phase: 2 },
  { id: "cruciform",    label: "Cruciform", phase: 2 },
] as const;

function defaultGeometryForType(type: string): Joint["geometry"] {
  switch (type) {
    case "t_joint":
      return {
        type: "t_joint", webThickness: 12, flangeThickness: 16,
        jointLength: 400, weldSize: 8,
      } as TJointGeometry;
    case "lap_joint":
      return {
        type: "lap_joint", plate1Thickness: 12, plate2Thickness: 12,
        overlapLength: 150, jointLength: 300, weldSize: 8, weldConfig: "both_sides",
      } as LapJointGeometry;
    case "butt_joint":
      return {
        type: "butt_joint", plate1Thickness: 12, plate2Thickness: 12,
        grooveType: "v_groove", grooveAngle: 60, rootOpening: 3, rootFace: 2,
        penetration: "full",
      } as ButtJointGeometry;
    case "corner_joint":
      return {
        type: "corner_joint", plate1Thickness: 12, plate2Thickness: 12,
        jointLength: 300, cornerAngle: 90, weldConfig: "both",
        weldSizeInside: 8, weldSizeOutside: 6,
      } as CornerJointGeometry;
    case "edge":
      return {
        type: "edge", plate1Thickness: 8, plate2Thickness: 8,
        jointLength: 200, weldSize: 6,
      } as EdgeJointGeometry;
    case "cruciform":
      return {
        type: "cruciform", webThickness: 12, flangeThickness: 16,
        jointLength: 400, weldSize: 8,
      } as CruciformJointGeometry;
    default:
      return {
        type: "t_joint", webThickness: 12, flangeThickness: 16,
        jointLength: 400, weldSize: 8,
      } as TJointGeometry;
  }
}

export function JointTypeSelector() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  function selectType(type: string) {
    if (!activeJoint) return;
    updateJoint(activeJoint.id, {
      type: type as Joint["type"],
      geometry: defaultGeometryForType(type),
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {JOINT_TYPES.map((jt) => (
        <button
          key={jt.id}
          onClick={() => selectType(jt.id)}
          disabled={false}
          className={`relative p-2 rounded border text-center text-xs transition-colors ${
            activeJoint.type === jt.id
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-subtle text-text-secondary hover:border-border-strong hover:text-text-primary"
          }`}
        >
          {jt.label}
        </button>
      ))}
    </div>
  );
}
