import { create } from "zustand";

export interface ReportSettings {
  companyName: string;
  engineerName: string;
  projectRef: string;
  logoDataUrl: string | null;
}

interface UIStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  reportSettings: ReportSettings;
  setReportSettings: (s: Partial<ReportSettings>) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  reportSettings: {
    companyName: "",
    engineerName: "",
    projectRef: "",
    logoDataUrl: null,
  },
  setReportSettings: (s) =>
    set((state) => ({ reportSettings: { ...state.reportSettings, ...s } })),
}));
