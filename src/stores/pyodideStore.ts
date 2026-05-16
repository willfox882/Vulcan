import { create } from "zustand";
import { initializePyodide } from "../lib/pyodide";
import type { PyodideInterface } from "pyodide";

interface PyodideStore {
  status: "idle" | "loading" | "ready" | "error";
  progressMessage: string;
  instance: PyodideInterface | null;
  error: string | null;
  initialize: () => Promise<void>;
}

export const usePyodideStore = create<PyodideStore>((set, get) => ({
  status: "idle",
  progressMessage: "",
  instance: null,
  error: null,
  initialize: async () => {
    if (get().status !== "idle") return;
    set({ status: "loading", progressMessage: "Starting..." });
    try {
      const instance = await initializePyodide((msg) => {
        set({ progressMessage: msg });
      });
      set({ status: "ready", instance, progressMessage: "Ready." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ status: "error", error: msg });
    }
  },
}));
