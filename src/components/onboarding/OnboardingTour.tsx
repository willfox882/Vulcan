import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    title: "Welcome to Vulcan",
    body: "A welded joint design calculator that runs entirely in your browser. Your data never leaves your device.",
  },
  {
    title: "Define a Joint",
    body: "Select joint type, geometry, material, and loads in the center panel. Changes update live.",
  },
  {
    title: "Live Analysis",
    body: "Structural utilization, fatigue life, metallurgical requirements, and distortion estimates — all calculated in Python, right here in the browser.",
  },
  {
    title: "Generate Reports",
    body: "When you're ready, generate a code-referenced PDF report: Concise summary, Standard analysis, or full Calculation Sheet.",
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(
    () => !localStorage.getItem("vulcan_seen_onboarding")
  );

  function dismiss() {
    localStorage.setItem("vulcan_seen_onboarding", "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-start p-6 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="pointer-events-auto bg-bg-elevated border border-border-strong rounded-xl p-4 max-w-xs shadow-2xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-text-tertiary text-[10px] uppercase tracking-widest">
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={dismiss}
              className="text-text-tertiary hover:text-text-secondary text-xs"
            >
              Skip
            </button>
          </div>
          <div className="text-text-primary font-medium text-sm mb-1">
            {current.title}
          </div>
          <div className="text-text-secondary text-xs leading-relaxed mb-3">
            {current.body}
          </div>
          <div className="flex justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-xs text-text-tertiary hover:text-text-secondary"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="text-xs bg-accent/10 text-accent border border-accent/30 px-3 py-1 rounded hover:bg-accent/20 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={dismiss}
                className="text-xs bg-accent text-white px-3 py-1 rounded hover:bg-accent/80 transition-colors"
              >
                Get started
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
