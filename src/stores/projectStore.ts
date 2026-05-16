import { create } from "zustand";
import { temporal } from "zundo";
import type { VulcanProject, Joint, Material, StaticLoadCase, TJointGeometry, CustomMaterial, LibraryLoadCase } from "../types";

const DEFAULT_MATERIAL: Material = {
  id: "A36",
  name: "ASTM A36",
  type: "carbon_steel",
  Fy: 250,
  Fu: 400,
  F_EXX: 483,
  unit: "MPa",
};

const DEFAULT_GEOMETRY: TJointGeometry = {
  type: "t_joint",
  webThickness: 12,
  flangeThickness: 16,
  jointLength: 400,
  weldSize: 8,
};

function makeDefaultStaticLoad(): StaticLoadCase {
  return {
    id: "lc-001",
    name: "Operating Load",
    type: "static",
    category: "O",
    forces: { Fx: 0, Fy: -10000, Fz: 0, Mx: 0, My: 0, Mz: 500000 },
  };
}

function makeDefaultJoint(id: string, name: string): Joint {
  return {
    id,
    name,
    type: "t_joint",
    geometry: { ...DEFAULT_GEOMETRY },
    material: DEFAULT_MATERIAL,
    loadCases: [makeDefaultStaticLoad()],
    service: {
      codeBasis: "ASD",
      designLife: 25,
      operatingFrequency: 0,
      position: "1F",
      environment: "shop",
      productionVolume: "repeat",
      qualityLevel: "structural",
    },
  };
}

function makeDefaultProject(): VulcanProject {
  const now = new Date().toISOString();
  const joint = makeDefaultJoint("j-001", "WLD-001");
  return {
    metadata: { name: "project", version: "2.0", createdAt: now, modifiedAt: now },
    joints: [joint],
    activeJointId: joint.id,
    customMaterials: [],
    loadCaseLibrary: [],
  };
}

function migrateProjectState(raw: VulcanProject): VulcanProject {
  const r = raw as unknown as Record<string, unknown>;
  return {
    ...raw,
    customMaterials: Array.isArray(r.customMaterials)
      ? (r.customMaterials as VulcanProject["customMaterials"])
      : [],
    loadCaseLibrary: Array.isArray(r.loadCaseLibrary)
      ? (r.loadCaseLibrary as VulcanProject["loadCaseLibrary"])
      : [],
    metadata: { ...raw.metadata, version: "2.0" },
  };
}

interface ProjectStore {
  project: VulcanProject;
  activeJoint: Joint | null;
  unitSystem: "metric" | "imperial";
  setProject: (project: VulcanProject) => void;
  setActiveJointId: (id: string) => void;
  updateJoint: (id: string, updates: Partial<Joint>) => void;
  addJoint: () => void;
  duplicateJoint: (id: string) => void;
  deleteJoint: (id: string) => void;
  setUnitSystem: (u: "metric" | "imperial") => void;
  setProjectName: (name: string) => void;
  addCustomMaterial: (mat: CustomMaterial) => void;
  removeCustomMaterial: (id: string) => void;
  addLibraryLoadCase: (lc: LibraryLoadCase) => void;
  removeLibraryLoadCase: (id: string) => void;
}

const _defaultProject = makeDefaultProject();

export const useProjectStore = create<ProjectStore>()(
  temporal(
    (set, get) => ({
      project: _defaultProject,
      activeJoint: _defaultProject.joints[0],
      unitSystem: "metric",

      setProject: (project) => {
        const p = migrateProjectState(project);
        const activeJoint =
          p.joints.find((j: Joint) => j.id === p.activeJointId) ??
          p.joints[0] ??
          null;
        set({ project: p, activeJoint });
      },

      setActiveJointId: (id) => {
        const joint = get().project.joints.find((j) => j.id === id) ?? null;
        set((s) => ({
          project: { ...s.project, activeJointId: id },
          activeJoint: joint,
        }));
      },

      updateJoint: (id, updates) => {
        set((s) => {
          const joints = s.project.joints.map((j) =>
            j.id === id ? { ...j, ...updates } : j
          );
          const project = {
            ...s.project,
            joints,
            metadata: {
              ...s.project.metadata,
              modifiedAt: new Date().toISOString(),
            },
          };
          const activeJoint =
            joints.find((j) => j.id === s.project.activeJointId) ?? null;
          return { project, activeJoint };
        });
      },

      addJoint: () => {
        set((s) => {
          const idx = s.project.joints.length + 1;
          const id = `j-${String(idx).padStart(3, "0")}`;
          const name = `WLD-${String(idx).padStart(3, "0")}`;
          const joint = makeDefaultJoint(id, name);
          const joints = [...s.project.joints, joint];
          return {
            project: { ...s.project, joints, activeJointId: joint.id },
            activeJoint: joint,
          };
        });
      },

      duplicateJoint: (id) => {
        set((s) => {
          const src = s.project.joints.find((j) => j.id === id);
          if (!src) return s;
          const newId = `j-${Date.now()}`;
          const dup = { ...src, id: newId, name: `${src.name}-copy` };
          const joints = [...s.project.joints, dup];
          return {
            project: { ...s.project, joints, activeJointId: newId },
            activeJoint: dup,
          };
        });
      },

      deleteJoint: (id) => {
        set((s) => {
          const joints = s.project.joints.filter((j) => j.id !== id);
          const activeJointId =
            s.project.activeJointId === id
              ? (joints[0]?.id ?? null)
              : s.project.activeJointId;
          const activeJoint =
            joints.find((j) => j.id === activeJointId) ?? null;
          return {
            project: { ...s.project, joints, activeJointId },
            activeJoint,
          };
        });
      },

      setUnitSystem: (unitSystem) => set({ unitSystem }),

      setProjectName: (name) => {
        set((s) => ({
          project: {
            ...s.project,
            metadata: { ...s.project.metadata, name },
          },
        }));
      },

      addCustomMaterial: (mat) => {
        set((s) => ({
          project: {
            ...s.project,
            customMaterials: [
              ...(s.project.customMaterials ?? []),
              mat,
            ],
          },
        }));
      },

      removeCustomMaterial: (id) => {
        set((s) => ({
          project: {
            ...s.project,
            customMaterials: (s.project.customMaterials ?? []).filter(
              (m) => m.id !== id
            ),
          },
        }));
      },

      addLibraryLoadCase: (lc) => {
        set((s) => ({
          project: {
            ...s.project,
            loadCaseLibrary: [
              ...(s.project.loadCaseLibrary ?? []),
              lc,
            ],
          },
        }));
      },

      removeLibraryLoadCase: (id) => {
        set((s) => ({
          project: {
            ...s.project,
            loadCaseLibrary: (s.project.loadCaseLibrary ?? []).filter(
              (l) => l.id !== id
            ),
          },
        }));
      },
    }),
    {
      limit: 50,
      partialize: (state) => ({ project: state.project }),
    }
  )
);

// Export temporal store as a proper React hook using useStore
import { useStore } from "zustand";
import type { TemporalState } from "zundo";

export const useTemporalStore = <T>(
  selector: (state: TemporalState<{ project: VulcanProject }>) => T
): T => useStore(useProjectStore.temporal, selector);

// Also expose getState for use outside React components
useTemporalStore.getState = () => useProjectStore.temporal.getState();
