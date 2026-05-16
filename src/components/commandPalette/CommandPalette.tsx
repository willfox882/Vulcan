import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useProjectStore, useTemporalStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import { saveProject, loadProject } from "../../lib/fileIO";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const { project, addJoint, duplicateJoint, deleteJoint, setProject, setUnitSystem, activeJoint } =
    useProjectStore();
  const { undo, redo, pastStates, futureStates } = useTemporalStore((s) => s);
  const { toggleSidebar } = useUIStore();

  function run(fn: () => void) {
    fn();
    onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60" />
          <motion.div
            className="relative w-full max-w-lg"
            initial={{ scale: 0.96, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              className="bg-bg-elevated border border-border-strong rounded-xl overflow-hidden shadow-2xl"
              label="Command Palette"
            >
              <div className="border-b border-border-subtle">
                <Command.Input
                  placeholder="Type a command or search..."
                  className="w-full bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none"
                  autoFocus
                />
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-1">
                <Command.Empty className="text-text-tertiary text-sm text-center py-6">
                  No results found.
                </Command.Empty>

                <Command.Group
                  heading="Joints"
                  className="[&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
                >
                  <CmdItem label="New Joint" shortcut="⌘N" onSelect={() => run(addJoint)} />
                  {activeJoint && (
                    <CmdItem
                      label={`Duplicate ${activeJoint.name}`}
                      shortcut="⌘D"
                      onSelect={() => run(() => duplicateJoint(activeJoint.id))}
                    />
                  )}
                  {activeJoint && (
                    <CmdItem
                      label={`Delete ${activeJoint.name}`}
                      onSelect={() => run(() => deleteJoint(activeJoint.id))}
                    />
                  )}
                </Command.Group>

                <Command.Group heading="Edit">
                  <CmdItem
                    label="Undo"
                    shortcut="⌘Z"
                    onSelect={() => run(() => undo())}
                    disabled={pastStates.length === 0}
                  />
                  <CmdItem
                    label="Redo"
                    shortcut="⌘⇧Z"
                    onSelect={() => run(() => redo())}
                    disabled={futureStates.length === 0}
                  />
                </Command.Group>

                <Command.Group heading="Project">
                  <CmdItem
                    label="Save Project"
                    shortcut="⌘S"
                    onSelect={() => run(() => saveProject(project))}
                  />
                  <CmdItem
                    label="Open Project"
                    shortcut="⌘O"
                    onSelect={() => run(() => loadProject(setProject))}
                  />
                  <CmdItem label="Toggle Sidebar" onSelect={() => run(toggleSidebar)} />
                </Command.Group>

                <Command.Group heading="View">
                  <CmdItem
                    label="Switch to SI (metric)"
                    onSelect={() => run(() => setUnitSystem("metric"))}
                  />
                  <CmdItem
                    label="Switch to US (imperial)"
                    onSelect={() => run(() => setUnitSystem("imperial"))}
                  />
                </Command.Group>

                {project.joints.length > 0 && (
                  <Command.Group heading="Switch to Joint">
                    {project.joints.map((j) => (
                      <CmdItem
                        key={j.id}
                        label={`${j.name} — ${j.type.replace(/_/g, " ")}`}
                        onSelect={() =>
                          run(() => useProjectStore.getState().setActiveJointId(j.id))
                        }
                      />
                    ))}
                  </Command.Group>
                )}
              </Command.List>
              <div className="border-t border-border-subtle px-3 py-1.5 flex items-center gap-3">
                <span className="text-text-tertiary text-[10px]">↑↓ navigate</span>
                <span className="text-text-tertiary text-[10px]">↵ select</span>
                <span className="text-text-tertiary text-[10px]">esc close</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CmdItem({
  label,
  shortcut,
  onSelect,
  disabled,
}: {
  label: string;
  shortcut?: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      disabled={disabled}
      className="flex items-center justify-between px-3 py-2 rounded text-sm cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-text-primary text-text-secondary aria-disabled:opacity-40 aria-disabled:cursor-not-allowed"
    >
      <span>{label}</span>
      {shortcut && (
        <kbd className="text-[10px] text-text-tertiary bg-bg-base px-1.5 py-0.5 rounded border border-border-subtle">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
