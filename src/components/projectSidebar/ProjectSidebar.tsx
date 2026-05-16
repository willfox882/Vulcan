import { useState, useEffect } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useResultsStore } from "../../stores/resultsStore";

function getJointStatus(jointId: string): "pass" | "warn" | "fail" | "pending" {
  const { results, errors, loading } = useResultsStore.getState();
  if (loading[jointId]) return "pending";
  if (errors[jointId]) return "fail";
  const r = results[jointId];
  if (!r) return "pending";
  const pct =
    r.structural_governing?.utilization_pct ??
    (r as unknown as Record<string, { utilization_pct?: number }>).structural?.utilization_pct ??
    0;
  const hasErrors = r.validation?.warnings?.some((w) => w.severity === "error");
  if (hasErrors || pct > 100) return "fail";
  if (pct > 80) return "warn";
  return "pass";
}

const STATUS_ICON = {
  pass: { icon: "✓", color: "text-green-400" },
  warn: { icon: "⚠", color: "text-yellow-400" },
  fail: { icon: "✗", color: "text-red-400" },
  pending: { icon: "○", color: "text-text-tertiary" },
};

export function ProjectSidebar() {
  const { project, setActiveJointId, addJoint, deleteJoint, setProjectName } =
    useProjectStore();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(project.metadata.name);

  useEffect(() => {
    setNameVal(project.metadata.name);
  }, [project.metadata.name]);

  return (
    <aside className="w-60 flex-shrink-0 bg-bg-surface border-r border-border-subtle flex flex-col">
      {/* Project name */}
      <div className="px-3 py-2.5 border-b border-border-subtle">
        {editingName ? (
          <input
            value={nameVal}
            autoFocus
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => {
              setProjectName(nameVal);
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setProjectName(nameVal);
                setEditingName(false);
              }
              if (e.key === "Escape") {
                setNameVal(project.metadata.name);
                setEditingName(false);
              }
            }}
            className="w-full bg-transparent border-b border-accent text-text-primary text-xs font-medium outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-text-secondary text-xs font-medium hover:text-text-primary w-full text-left truncate"
            title="Click to rename project"
          >
            {project.metadata.name || "Untitled Project"}
          </button>
        )}
      </div>

      {/* Section label */}
      <div className="px-3 py-1.5 border-b border-border-subtle">
        <span className="text-text-tertiary text-[10px] uppercase tracking-widest">
          Joints ({project.joints.length})
        </span>
      </div>

      {/* Joint list */}
      <div className="flex-1 overflow-y-auto py-1">
        {project.joints.length === 0 ? (
          <p className="text-text-tertiary text-xs px-3 py-4 text-center">No joints yet</p>
        ) : (
          project.joints.map((joint) => {
            const status = getJointStatus(joint.id);
            const { icon, color } = STATUS_ICON[status];
            return (
              <div
                key={joint.id}
                className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                  project.activeJointId === joint.id
                    ? "bg-accent/10 border-l-2 border-accent"
                    : "border-l-2 border-transparent hover:bg-white/5"
                }`}
                onClick={() => setActiveJointId(joint.id)}
              >
                <span className={`text-xs w-3 flex-shrink-0 ${color}`}>{icon}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-mono truncate ${
                      project.activeJointId === joint.id
                        ? "text-text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {joint.name}
                  </div>
                  <div className="text-text-tertiary text-[10px] truncate capitalize">
                    {joint.type.replace(/_/g, " ")}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteJoint(joint.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 text-xs transition-opacity"
                  aria-label="Delete joint"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="p-2 border-t border-border-subtle flex flex-col gap-1">
        <button
          onClick={addJoint}
          className="w-full px-3 py-1.5 text-xs text-text-secondary border border-border-strong rounded hover:text-text-primary hover:border-accent/50 transition-colors"
        >
          + Add Joint
        </button>
      </div>
    </aside>
  );
}
