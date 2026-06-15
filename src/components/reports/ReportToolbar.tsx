import { useState } from "react";
import type { Joint, AnalysisResult } from "../../types";
import { useUIStore } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import { generateCalculationSheet } from "./CalculationSheet";
import { ReportSettings } from "./ReportSettings";

interface Props {
  joint: Joint;
  results: AnalysisResult;
}

export function ReportToolbar({ joint, results }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);

  function printReport(selector: string) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    el.style.display = "block";
    window.print();
    el.style.display = "none";
  }

  async function handleCalcSheet() {
    const settings = useUIStore.getState().reportSettings;
    const system = useProjectStore.getState().unitSystem;
    setCalcLoading(true);
    try {
      await generateCalculationSheet(joint, results, settings, system);
    } finally {
      setCalcLoading(false);
    }
  }

  return (
    <>
      {settingsOpen && <ReportSettings onClose={() => setSettingsOpen(false)} />}
      <div className="flex gap-2 px-3 py-2 border-b border-border-subtle flex-wrap">
        <span className="text-text-tertiary text-xs self-center">Reports:</span>
        <button
          onClick={() => printReport(".report-concise")}
          className="px-2 py-1 text-xs border border-border-subtle rounded hover:border-accent/50 text-text-secondary hover:text-text-primary transition-colors"
        >
          Concise
        </button>
        <button
          onClick={() => printReport(".report-standard")}
          className="px-2 py-1 text-xs border border-border-subtle rounded hover:border-accent/50 text-text-secondary hover:text-text-primary transition-colors"
        >
          Standard
        </button>
        <button
          onClick={handleCalcSheet}
          disabled={calcLoading}
          className="px-2 py-1 text-xs bg-accent/10 border border-accent/30 text-accent rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          {calcLoading ? "Generating…" : "Calc Sheet"}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="ml-auto px-2 py-1 text-xs border border-border-subtle rounded hover:border-border-strong text-text-tertiary hover:text-text-secondary transition-colors"
          title="Report settings"
        >
          ⚙
        </button>
      </div>
    </>
  );
}
