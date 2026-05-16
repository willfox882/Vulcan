import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JointTypeSelector } from "./JointTypeSelector";
import { GeometryPanel } from "./GeometryPanel";
import { MaterialPanel } from "./MaterialPanel";
import { LoadPanel } from "./LoadPanel";
import { ServicePanel } from "./ServicePanel";
import { JointPreview } from "../jointPreview/JointPreview";
import { useProjectStore } from "../../stores/projectStore";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        {title}
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ stiffness: 400, damping: 30 }}
          className="text-text-tertiary"
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function JointEditor() {
  const { activeJoint } = useProjectStore();

  if (!activeJoint) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-tertiary text-sm">
          Add a joint from the sidebar to begin
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h2 className="text-text-primary font-medium font-mono">{activeJoint.name}</h2>
        <p className="text-text-tertiary text-xs capitalize">{activeJoint.type.replace("_", " ")}</p>
      </div>

      <div className="px-4 py-3 border-b border-border-subtle">
        <JointPreview joint={activeJoint} />
      </div>

      <Section title="Joint Type">
        <JointTypeSelector />
      </Section>
      <Section title="Geometry">
        <GeometryPanel />
      </Section>
      <Section title="Material">
        <MaterialPanel />
      </Section>
      <Section title="Loads">
        <LoadPanel />
      </Section>
      <Section title="Service Conditions">
        <ServicePanel />
      </Section>
    </div>
  );
}
