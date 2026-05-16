import { useEffect, useRef } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useResultsStore } from "../../stores/resultsStore";
import { usePyodideStore } from "../../stores/pyodideStore";
import { callEngine } from "../../lib/pyodide";
import type {
  AnalysisResult,
  FatigueResult,
  ProcessResult,
  MetallurgyResult,
  DistortionResult,
  StaticLoadCase,
  CyclicLoadCase,
  SpectrumLoadCase,
} from "../../types";
import { StructuralResults } from "./StructuralResults";
import { WeldSymbolPreview } from "./WeldSymbolPreview";
import { WarningsList } from "./WarningsList";
import { FatigueResults } from "./FatigueResults";
import { ProcessResults } from "./ProcessResults";
import { MetallurgyResults } from "./MetallurgyResults";
import { DistortionResults } from "./DistortionResults";
import { ReportToolbar } from "../reports/ReportToolbar";
import { ConciseReport } from "../reports/ConciseReport";
import { StandardReport } from "../reports/StandardReport";
import { useUIStore } from "../../stores/uiStore";

function SkeletonCard() {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded p-3 animate-pulse">
      <div className="h-3 w-24 bg-bg-elevated rounded mb-3" />
      <div className="space-y-2">
        <div className="h-2.5 w-full bg-bg-elevated rounded" />
        <div className="h-2.5 w-3/4 bg-bg-elevated rounded" />
        <div className="h-2.5 w-5/6 bg-bg-elevated rounded" />
      </div>
    </div>
  );
}

export function ResultsPanel() {
  const { activeJoint } = useProjectStore();
  const { instance: pyodide } = usePyodideStore();
  const { reportSettings } = useUIStore();
  const {
    results,
    fatigueResults,
    processResults,
    metallurgyResults,
    distortionResults,
    loading,
    errors,
    setResult,
    setFatigueResult,
    setProcessResult,
    setMetallurgyResult,
    setDistortionResult,
    setLoading,
    setError,
  } = useResultsStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const jointId = activeJoint?.id ?? null;
  const result = jointId ? results[jointId] : undefined;
  const jointFatigueResults = jointId ? (fatigueResults[jointId] ?? {}) : {};
  const procResult = jointId ? processResults[jointId] : undefined;
  const metResult = jointId ? metallurgyResults[jointId] : undefined;
  const distResult = jointId ? distortionResults[jointId] : undefined;
  const isLoading = jointId ? (loading[jointId] ?? false) : false;
  const error = jointId ? errors[jointId] : null;

  useEffect(() => {
    if (!activeJoint || !pyodide) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const ac = new AbortController();
    const signal = ac.signal;

    debounceRef.current = setTimeout(async () => {
      if (signal.aborted) return;
      setLoading(activeJoint.id, true);
      setError(activeJoint.id, null);
      try {
        // Find the first static load case for structural analysis
        const staticCase = activeJoint.loadCases.find((lc) => lc.type === "static") as StaticLoadCase | undefined;
        const loads = staticCase?.forces ?? { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 };

        const res = await callEngine<AnalysisResult>(pyodide, "analyze_joint", {
          joint: { ...activeJoint.geometry, type: activeJoint.type },
          material: activeJoint.material,
          loads,
          service: activeJoint.service,
        }, signal);
        if (signal.aborted) return;
        setResult(activeJoint.id, res);

        // For each cyclic/spectrum load case, call fatigue engine
        const cyclicCases = activeJoint.loadCases.filter(
          (lc) => lc.type === "cyclic" || lc.type === "spectrum"
        );
        for (const lc of cyclicCases) {
          // Skip fatigue call if required inputs are missing — don't block structural results
          const cyclic = lc as CyclicLoadCase;
          const spectrum = lc as SpectrumLoadCase;
          if (lc.type === "cyclic" && (!cyclic.stressRangeMPa || cyclic.stressRangeMPa <= 0)) continue;
          if (lc.type === "spectrum" && (!spectrum.spectrum?.length)) continue;

          const fatigueInput =
            lc.type === "cyclic"
              ? {
                  type: "constant_amplitude",
                  stress_range_MPa: cyclic.stressRangeMPa,
                  frequency_Hz: cyclic.frequencyHz ?? 0,
                  duty_cycle: {
                    hours_per_day: cyclic.hoursPerDay ?? 8,
                    days_per_year: cyclic.daysPerYear ?? 250,
                  },
                  design_life_years: activeJoint.service.designLife,
                }
              : {
                  type: "variable_amplitude",
                  spectrum: spectrum.spectrum,
                  frequency_Hz: spectrum.frequencyHz ?? 0,
                  duty_cycle: {
                    hours_per_day: spectrum.hoursPerDay ?? 8,
                    days_per_year: spectrum.daysPerYear ?? 250,
                  },
                  design_life_years: activeJoint.service.designLife,
                };

          const fatRes = await callEngine<FatigueResult>(pyodide, "analyze_fatigue", {
            joint: { ...activeJoint.geometry, type: activeJoint.type },
            structural: { load_direction: "transverse" },
            fatigue: fatigueInput,
          }, signal);
          if (signal.aborted) return;
          setFatigueResult(activeJoint.id, lc.id, fatRes);
        }

        // Process selector
        const procRes = await callEngine<ProcessResult>(pyodide, "select_process", {
          material: { ...activeJoint.material },
          joint: {
            ...activeJoint.geometry,
            type: activeJoint.type,
            position: activeJoint.service.position ?? "1F",
          },
          environment: activeJoint.service.environment ?? "shop",
          production_volume: activeJoint.service.productionVolume ?? "repeat",
          quality_level: activeJoint.service.qualityLevel ?? "structural",
        }, signal);
        if (signal.aborted) return;
        setProcessResult(activeJoint.id, procRes);

        // Metallurgy
        const metRes = await callEngine<MetallurgyResult>(pyodide, "analyze_metallurgy", {
          material: { ...activeJoint.material },
          joint: { ...activeJoint.geometry, type: activeJoint.type },
          process: procRes.primary,
          heat_input_kJ_per_mm: 1.5,
        }, signal);
        if (signal.aborted) return;
        setMetallurgyResult(activeJoint.id, metRes);

        // Distortion
        const distRes = await callEngine<DistortionResult>(pyodide, "predict_distortion", {
          joint: { ...activeJoint.geometry, type: activeJoint.type },
        }, signal);
        if (signal.aborted) return;
        setDistortionResult(activeJoint.id, distRes);
      } catch (e) {
        if (signal.aborted || (e instanceof Error && e.name === "AbortError")) return;
        setError(activeJoint.id, e instanceof Error ? e.message : String(e));
      } finally {
        if (!signal.aborted) setLoading(activeJoint.id, false);
      }
    }, 100);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      ac.abort();
    };
  }, [activeJoint, pyodide]);

  if (!activeJoint) {
    return (
      <aside className="w-[360px] flex-shrink-0 bg-bg-surface border-l border-border-subtle flex items-center justify-center">
        <p className="text-text-tertiary text-sm text-center px-4">
          Select a joint to view analysis results
        </p>
      </aside>
    );
  }

  // Cyclic/spectrum cases for fatigue display
  const cyclicCases = activeJoint.loadCases.filter(
    (lc) => lc.type === "cyclic" || lc.type === "spectrum"
  );

  return (
    <aside className="w-[360px] flex-shrink-0 bg-bg-surface border-l border-border-subtle flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border-subtle">
        <span className="text-text-tertiary text-xs uppercase tracking-widest font-medium">
          Analysis Results
        </span>
      </div>
      {result && (
        <ReportToolbar joint={activeJoint} results={result} />
      )}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {error && (
          <div className="bg-semantic-fail/10 border border-semantic-fail/30 rounded p-3">
            <p className="text-semantic-fail text-xs font-mono">{error}</p>
          </div>
        )}
        {isLoading && !result && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
        {result && (
          <>
            <StructuralResults result={result} loading={isLoading} />
            <WeldSymbolPreview result={result} />
            <WarningsList result={result} />
            {cyclicCases.map((lc) => {
              const fatResult = jointFatigueResults[lc.id];
              if (!fatResult) return null;
              return (
                <FatigueResults key={lc.id} result={fatResult} loadCaseName={lc.name} />
              );
            })}
            {procResult && <ProcessResults result={procResult} loading={isLoading} />}
            {metResult && <MetallurgyResults result={metResult} loading={isLoading} />}
            {distResult && <DistortionResults result={distResult} loading={isLoading} />}

            {/* Hidden report components rendered in DOM for print/PDF */}
            <ConciseReport
              joint={activeJoint}
              results={result}
              settings={reportSettings}
              className="report-concise"
            />
            <StandardReport
              joint={activeJoint}
              results={result}
              settings={reportSettings}
              fatigueResults={jointFatigueResults}
              className="report-standard"
            />
          </>
        )}
        {!result && !isLoading && !error && (
          <div className="flex items-center justify-center flex-1">
            <p className="text-text-tertiary text-xs">Waiting for Python runtime...</p>
          </div>
        )}
      </div>
    </aside>
  );
}
