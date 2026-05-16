import { useEffect, useCallback, useState } from "react";
import { usePyodideStore } from "./stores/pyodideStore";
import { useProjectStore, useTemporalStore } from "./stores/projectStore";
import { PyodideLoader } from "./components/loader/PyodideLoader";
import { ProjectSidebar } from "./components/projectSidebar/ProjectSidebar";
import { JointEditor } from "./components/jointEditor/JointEditor";
import { ResultsPanel } from "./components/resultsPanel/ResultsPanel";
import { CommandPalette } from "./components/commandPalette/CommandPalette";
import { OnboardingTour } from "./components/onboarding/OnboardingTour";
import { MaterialLibraryModal } from "./components/library/MaterialLibraryModal";
import { saveProject, loadProject } from "./lib/fileIO";

export default function App() {
  const { initialize } = usePyodideStore();
  const { project, setProject, unitSystem, setUnitSystem, activeJoint, updateJoint } =
    useProjectStore();
  const { undo, redo, pastStates, futureStates } = useTemporalStore((s) => s);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [autosaveRecovery, setAutosaveRecovery] = useState<{
    data: string;
    ts: string;
  } | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleSave = useCallback(() => {
    saveProject(project);
  }, [project]);

  const handleLoad = useCallback(() => {
    loadProject(setProject);
  }, [setProject]);

  // Auto-save: debounced 3s after any project change
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem("vulcan_autosave", JSON.stringify(project));
        localStorage.setItem("vulcan_autosave_ts", new Date().toISOString());
      } catch {
        /* storage full */
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [project]);

  // Auto-save recovery prompt: check on first mount
  useEffect(() => {
    const saved = localStorage.getItem("vulcan_autosave");
    const ts = localStorage.getItem("vulcan_autosave_ts");
    if (saved && ts) {
      const age = Date.now() - new Date(ts).getTime();
      if (age < 7 * 24 * 60 * 60 * 1000) {
        setAutosaveRecovery({ data: saved, ts });
      }
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        handleLoad();
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        useTemporalStore.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        useTemporalStore.getState().redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        useProjectStore.getState().addJoint();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, handleLoad]);

  const currentCodeBasis = activeJoint?.service.codeBasis ?? "ASD";

  function setCodeBasis(basis: "ASD" | "LRFD") {
    if (activeJoint) {
      updateJoint(activeJoint.id, {
        service: { ...activeJoint.service, codeBasis: basis },
      });
    }
  }

  return (
    <>
      <PyodideLoader />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <MaterialLibraryModal open={libraryOpen} onClose={() => setLibraryOpen(false)} />
      <OnboardingTour />

      <div className="h-screen flex flex-col bg-bg-base">
        {/* Header */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-border-subtle bg-bg-surface flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-accent font-bold text-lg tracking-tight">VULCAN</span>
            <span className="text-text-tertiary text-xs">Welded Joint Calculator</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Unit toggle */}
            <div className="flex gap-1 bg-bg-elevated rounded p-0.5">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnitSystem(u)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    unitSystem === u
                      ? "bg-accent/20 text-accent"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {u === "metric" ? "SI" : "US"}
                </button>
              ))}
            </div>

            {/* Code basis toggle */}
            <div className="flex gap-1 bg-bg-elevated rounded p-0.5">
              {(["ASD", "LRFD"] as const).map((basis) => (
                <button
                  key={basis}
                  onClick={() => setCodeBasis(basis)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    currentCodeBasis === basis
                      ? "bg-accent/20 text-accent"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {basis}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border-subtle mx-1" />

            {/* Undo / Redo */}
            <button
              onClick={() => undo()}
              disabled={pastStates.length === 0}
              title="Undo (⌘Z)"
              className="px-2 py-1 text-xs text-text-tertiary hover:text-text-primary border border-border-subtle rounded disabled:opacity-30 transition-colors"
            >
              ↩
            </button>
            <button
              onClick={() => redo()}
              disabled={futureStates.length === 0}
              title="Redo (⌘⇧Z)"
              className="px-2 py-1 text-xs text-text-tertiary hover:text-text-primary border border-border-subtle rounded disabled:opacity-30 transition-colors"
            >
              ↪
            </button>

            <div className="w-px h-5 bg-border-subtle mx-1" />

            {/* Material Library button */}
            <button
              onClick={() => setLibraryOpen(true)}
              className="px-2.5 py-1 text-xs text-text-tertiary hover:text-text-primary border border-border-subtle rounded transition-colors"
            >
              Materials
            </button>

            {/* Command Palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="px-2.5 py-1 text-xs text-text-tertiary hover:text-text-primary border border-border-subtle rounded transition-colors"
            >
              ⌘K
            </button>

            <div className="w-px h-5 bg-border-subtle mx-1" />

            <button
              onClick={handleLoad}
              className="px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary border border-border-subtle rounded hover:border-border-strong transition-colors"
            >
              Open <kbd className="text-text-tertiary">⌘O</kbd>
            </button>
            <button
              onClick={handleSave}
              className="px-2.5 py-1 text-xs text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
            >
              Save <kbd className="text-text-tertiary">⌘S</kbd>
            </button>
          </div>
        </header>

        {/* Main layout */}
        <div className="flex-1 flex overflow-hidden">
          <ProjectSidebar />
          <main className="flex-1 bg-bg-base overflow-hidden flex flex-col">
            <JointEditor />
          </main>
          <ResultsPanel />
        </div>
      </div>

      {/* Auto-save recovery toast */}
      {autosaveRecovery && (
        <div className="fixed bottom-4 left-4 z-50 bg-bg-elevated border border-border-strong rounded-lg p-3 flex items-center gap-3 shadow-lg max-w-sm">
          <div>
            <div className="text-text-primary text-sm font-medium">
              Unsaved changes found
            </div>
            <div className="text-text-tertiary text-xs">
              From {new Date(autosaveRecovery.ts).toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                try {
                  setProject(JSON.parse(autosaveRecovery.data));
                } catch {
                  /* invalid JSON */
                }
                setAutosaveRecovery(null);
              }}
              className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/80 transition-colors"
            >
              Recover
            </button>
            <button
              onClick={() => setAutosaveRecovery(null)}
              className="px-2 py-1 text-xs border border-border-subtle rounded text-text-secondary hover:text-text-primary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}
