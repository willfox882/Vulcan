import type { Joint } from "../../types";
import { TJointPreview } from "./TJointPreview";
import { LapJointPreview } from "./LapJointPreview";
import { ButtJointPreview } from "./ButtJointPreview";
import { CornerJointPreview } from "./CornerJointPreview";
import { EdgeJointPreview } from "./EdgeJointPreview";
import { CruciformJointPreview } from "./CruciformJointPreview";

interface Props { joint: Joint; }

export function JointPreview({ joint }: Props) {
  switch (joint.type) {
    case "t_joint":      return <TJointPreview joint={joint} />;
    case "lap_joint":    return <LapJointPreview joint={joint} />;
    case "butt_joint":   return <ButtJointPreview joint={joint} />;
    case "corner_joint": return <CornerJointPreview joint={joint} />;
    case "edge":         return <EdgeJointPreview joint={joint} />;
    case "cruciform":    return <CruciformJointPreview joint={joint} />;
    default:             return null;
  }
}
