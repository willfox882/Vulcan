import { create } from "zustand";
import type { AnalysisResult, FatigueResult, ProcessResult, MetallurgyResult, DistortionResult } from "../types";

interface ResultsStore {
  results: Record<string, AnalysisResult>;
  fatigueResults: Record<string, Record<string, FatigueResult>>;
  processResults: Record<string, ProcessResult>;
  metallurgyResults: Record<string, MetallurgyResult>;
  distortionResults: Record<string, DistortionResult>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  setResult: (jointId: string, result: AnalysisResult) => void;
  setFatigueResult: (jointId: string, loadCaseId: string, result: FatigueResult) => void;
  setProcessResult: (jointId: string, r: ProcessResult) => void;
  setMetallurgyResult: (jointId: string, r: MetallurgyResult) => void;
  setDistortionResult: (jointId: string, r: DistortionResult) => void;
  setLoading: (jointId: string, loading: boolean) => void;
  setError: (jointId: string, error: string | null) => void;
}

export const useResultsStore = create<ResultsStore>((set) => ({
  results: {},
  fatigueResults: {},
  processResults: {},
  metallurgyResults: {},
  distortionResults: {},
  loading: {},
  errors: {},
  setResult: (jointId, result) =>
    set((s) => ({ results: { ...s.results, [jointId]: result } })),
  setFatigueResult: (jointId, loadCaseId, result) =>
    set((s) => ({
      fatigueResults: {
        ...s.fatigueResults,
        [jointId]: { ...(s.fatigueResults[jointId] ?? {}), [loadCaseId]: result },
      },
    })),
  setProcessResult: (jointId, r) =>
    set((s) => ({ processResults: { ...s.processResults, [jointId]: r } })),
  setMetallurgyResult: (jointId, r) =>
    set((s) => ({ metallurgyResults: { ...s.metallurgyResults, [jointId]: r } })),
  setDistortionResult: (jointId, r) =>
    set((s) => ({ distortionResults: { ...s.distortionResults, [jointId]: r } })),
  setLoading: (jointId, loading) =>
    set((s) => ({ loading: { ...s.loading, [jointId]: loading } })),
  setError: (jointId, error) =>
    set((s) => ({ errors: { ...s.errors, [jointId]: error } })),
}));
