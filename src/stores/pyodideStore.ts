import { create } from "zustand";
import { initializePyodide } from "../lib/pyodide";

interface PyodideStore {
  status: "idle" | "loading" | "ready" | "error";
  progressMessage: string;
  // Pyodide now lives in a Web Worker; the main thread holds no instance, only
  // readiness. Engine calls go through callEngine() in lib/pyodide.ts.
  ready: boolean;
  error: string | null;
  initialize: () => Promise<void>;
}

export const usePyodideStore = create<PyodideStore>((set, get) => ({
  status: "idle",
  progressMessage: "",
  ready: false,
  error: null,
  initialize: async () => {
    if (get().status !== "idle") return;
    set({ status: "loading", progressMessage: "Starting..." });
    try {
      await initializePyodide((msg) => {
        set({ progressMessage: msg });
      });
      set({ status: "ready", ready: true, progressMessage: "Ready." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ status: "error", error: msg });
    }
  },
}));
