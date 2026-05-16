import { useProjectStore } from "../../stores/projectStore";
import { TJointGeometryPanel } from "./geometry/TJointGeometryPanel";
import { LapJointGeometryPanel } from "./geometry/LapJointGeometryPanel";
import { ButtJointGeometryPanel } from "./geometry/ButtJointGeometryPanel";
import { CornerJointGeometryPanel } from "./geometry/CornerJointGeometryPanel";
import { EdgeJointGeometryPanel } from "./geometry/EdgeJointGeometryPanel";
import { CruciformJointGeometryPanel } from "./geometry/CruciformJointGeometryPanel";

export function GeometryPanel() {
  const { activeJoint } = useProjectStore();
  if (!activeJoint) return null;

  switch (activeJoint.type) {
    case "t_joint":      return <TJointGeometryPanel />;
    case "lap_joint":    return <LapJointGeometryPanel />;
    case "butt_joint":   return <ButtJointGeometryPanel />;
    case "corner_joint": return <CornerJointGeometryPanel />;
    case "edge":         return <EdgeJointGeometryPanel />;
    case "cruciform":    return <CruciformJointGeometryPanel />;
    default:             return null;
  }
}
