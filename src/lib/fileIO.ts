import type { VulcanProject, Joint, LoadCaseItem, StaticLoadValues, TJointGeometry } from "../types";

function defaultStaticLoadCase(): LoadCaseItem {
  return {
    id: "lc-001",
    name: "Default Static",
    type: "static",
    category: "O",
    forces: { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 },
  };
}

function migrateProject(raw: Record<string, unknown>): VulcanProject {
  const version = (raw.metadata as Record<string, string>)?.version;

  let project = raw as unknown as VulcanProject;

  if (version === "1.0") {
    const joints = (raw.joints as Array<Record<string, unknown>>);
    const migrated: Joint[] = joints.map((j) => {
      // Phase 1 joint had loads:{Fx,Fy,Fz,Mx,My,Mz} instead of loadCases[]
      const legacyLoads = j.loads as StaticLoadValues | undefined;
      const loadCases: LoadCaseItem[] = legacyLoads
        ? [{ id: "lc-001", name: "Default Static", type: "static", category: "O", forces: legacyLoads }]
        : [defaultStaticLoadCase()];
      // Phase 1 geometry had no type discriminator
      const geom = j.geometry as Record<string, unknown>;
      const geometry: TJointGeometry = {
        type: "t_joint",
        webThickness: geom.webThickness as number,
        flangeThickness: geom.flangeThickness as number,
        jointLength: geom.jointLength as number,
        weldSize: geom.weldSize as number,
      };
      return { ...(j as unknown as Joint), loadCases, geometry };
    });
    project = {
      ...(raw as unknown as VulcanProject),
      joints: migrated,
      metadata: { ...(raw.metadata as VulcanProject["metadata"]), version: "1.1" },
    };
  }

  // v1.1 → v1.2: add Phase 3 service fields and material.type if missing
  if (project.metadata.version === "1.1") {
    const joints = project.joints.map((j) => {
      const svc = j.service as unknown as Record<string, unknown>;
      const updatedService = {
        ...svc,
        position: svc.position ?? "1F",
        environment: svc.environment ?? "shop",
        productionVolume: svc.productionVolume ?? "repeat",
        qualityLevel: svc.qualityLevel ?? "structural",
      };
      const mat = j.material as unknown as Record<string, unknown>;
      const updatedMaterial = {
        ...mat,
        type: mat.type ?? "carbon_steel",
      };
      return { ...j, service: updatedService, material: updatedMaterial } as Joint;
    });
    project = {
      ...project,
      joints,
      metadata: { ...project.metadata, version: "1.2" },
    };
  }

  // v1.2 → v2.0: add customMaterials and loadCaseLibrary
  if (project.metadata.version === "1.2") {
    const raw2 = project as unknown as Record<string, unknown>;
    project = {
      ...project,
      customMaterials: Array.isArray(raw2.customMaterials) ? (raw2.customMaterials as VulcanProject["customMaterials"]) : [],
      loadCaseLibrary: Array.isArray(raw2.loadCaseLibrary) ? (raw2.loadCaseLibrary as VulcanProject["loadCaseLibrary"]) : [],
      metadata: { ...project.metadata, version: "2.0" },
    };
  }

  return project;
}

export function saveProject(project: VulcanProject): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.metadata.name ?? "project"}.vulcan`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function loadProject(onLoad: (p: VulcanProject) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".vulcan";
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as Record<string, unknown>;
      const project = migrateProject(raw);
      onLoad(project);
    } catch {
      console.error("Failed to parse .vulcan file");
    }
  };
  input.click();
}
