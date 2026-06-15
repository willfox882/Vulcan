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

/**
 * Validate the minimum shape of a parsed .vulcan object before migration.
 * Returns a human-readable error string, or null if the object is usable.
 * Lenient enough to accept every historical version (legacy `loads` or
 * modern `loadCases`); strict enough to reject non-project JSON.
 */
export function validateProject(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return "Not a valid Vulcan project file (expected a JSON object).";
  }
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.joints)) {
    return "Invalid .vulcan file: missing 'joints' array.";
  }
  if (r.joints.length === 0) {
    return "Invalid .vulcan file: the project contains no joints.";
  }
  for (let i = 0; i < r.joints.length; i++) {
    const j = r.joints[i];
    if (!j || typeof j !== "object") {
      return `Invalid .vulcan file: joint ${i + 1} is malformed.`;
    }
    const jr = j as Record<string, unknown>;
    if (!jr.geometry || typeof jr.geometry !== "object") {
      return `Invalid .vulcan file: joint ${i + 1} is missing geometry.`;
    }
    const hasLoadCases = Array.isArray(jr.loadCases);
    const hasLegacyLoads = !!jr.loads && typeof jr.loads === "object";
    if (!hasLoadCases && !hasLegacyLoads) {
      return `Invalid .vulcan file: joint ${i + 1} has no load data.`;
    }
  }
  return null;
}

function detectVersion(raw: Record<string, unknown>): string {
  const first = Array.isArray(raw.joints) ? raw.joints[0] : undefined;
  if (first && typeof first === "object") {
    // A loadCases-bearing joint predates only the service/material + v2
    // fields; start the chain at 1.1 (those steps are idempotent). A joint
    // with the legacy `loads` map is a Phase 1 (v1.0) file.
    if ("loadCases" in (first as Record<string, unknown>)) return "1.1";
    if ("loads" in (first as Record<string, unknown>)) return "1.0";
  }
  return "1.0";
}

function migrateProject(raw: Record<string, unknown>): VulcanProject {
  const rawMeta =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};
  const startVersion =
    typeof rawMeta.version === "string" ? rawMeta.version : detectVersion(raw);
  const now = new Date().toISOString();

  // Always normalise metadata so later steps can read .version safely.
  let project = {
    ...(raw as unknown as VulcanProject),
    metadata: {
      name: typeof rawMeta.name === "string" ? rawMeta.name : "project",
      version: startVersion,
      createdAt: typeof rawMeta.createdAt === "string" ? rawMeta.createdAt : now,
      modifiedAt: typeof rawMeta.modifiedAt === "string" ? rawMeta.modifiedAt : now,
    },
  };

  if (project.metadata.version === "1.0") {
    const joints = raw.joints as Array<Record<string, unknown>>;
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
      ...project,
      joints: migrated,
      metadata: { ...project.metadata, version: "1.1" },
    };
  }

  // v1.1 → v1.2: add Phase 3 service fields and material.type if missing
  if (project.metadata.version === "1.1") {
    const joints = project.joints.map((j) => {
      const svc = (j.service ?? {}) as unknown as Record<string, unknown>;
      const updatedService = {
        ...svc,
        codeBasis: svc.codeBasis ?? "ASD",
        designLife: svc.designLife ?? 25,
        operatingFrequency: svc.operatingFrequency ?? 0,
        position: svc.position ?? "1F",
        environment: svc.environment ?? "shop",
        productionVolume: svc.productionVolume ?? "repeat",
        qualityLevel: svc.qualityLevel ?? "structural",
      };
      const mat = (j.material ?? {}) as unknown as Record<string, unknown>;
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

  // Guarantee the v2 collections exist even if the file declared version 2.0
  // but omitted them.
  if (!Array.isArray((project as VulcanProject).customMaterials)) {
    project = { ...project, customMaterials: [] };
  }
  if (!Array.isArray((project as VulcanProject).loadCaseLibrary)) {
    project = { ...project, loadCaseLibrary: [] };
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

export function loadProject(
  onLoad: (p: VulcanProject) => void,
  onError?: (message: string) => void
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".vulcan";
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        onError?.("Could not open file: it is not valid JSON.");
        return;
      }
      const err = validateProject(raw);
      if (err) {
        onError?.(err);
        return;
      }
      const project = migrateProject(raw as Record<string, unknown>);
      onLoad(project);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to load .vulcan file.");
    }
  };
  input.click();
}

// Exposed for testing the migration chain without a DOM.
export { migrateProject };
