import { describe, it, expect } from "vitest";
import { validateProject, migrateProject } from "./fileIO";

const legacyV1 = {
  joints: [
    {
      id: "j1",
      name: "W1",
      geometry: { webThickness: 12, flangeThickness: 16, jointLength: 400, weldSize: 8 },
      loads: { Fx: 0, Fy: -10000, Fz: 0, Mx: 0, My: 0, Mz: 500000 },
      material: { id: "A36" },
      service: {},
    },
  ],
};

const modernV2 = {
  metadata: { name: "p", version: "2.0", createdAt: "t", modifiedAt: "t" },
  joints: [
    {
      id: "j1",
      name: "W1",
      type: "t_joint",
      geometry: { type: "t_joint", webThickness: 12, flangeThickness: 16, jointLength: 400, weldSize: 8 },
      material: { id: "A36", type: "carbon_steel" },
      loadCases: [{ id: "lc1", type: "static", forces: { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 } }],
      service: { codeBasis: "ASD" },
    },
  ],
  activeJointId: "j1",
  customMaterials: [],
  loadCaseLibrary: [],
};

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

describe("validateProject", () => {
  it("rejects non-objects", () => {
    expect(validateProject(null)).not.toBeNull();
    expect(validateProject("nope")).not.toBeNull();
    expect(validateProject(42)).not.toBeNull();
    expect(validateProject([])).not.toBeNull();
  });

  it("rejects missing/empty/malformed joints", () => {
    expect(validateProject({ metadata: {} })).toMatch(/joints/);
    expect(validateProject({ joints: [] })).toMatch(/no joints/);
    expect(validateProject({ joints: [null] })).toMatch(/malformed/);
    expect(validateProject({ joints: [{ loadCases: [] }] })).toMatch(/geometry/);
    expect(validateProject({ joints: [{ geometry: {} }] })).toMatch(/no load data/);
  });

  it("accepts legacy v1.0 (loads) and modern v2.0 (loadCases)", () => {
    expect(validateProject(legacyV1)).toBeNull();
    expect(validateProject(modernV2)).toBeNull();
  });
});

describe("migrateProject", () => {
  it("upgrades v1.0 legacy -> v2.0", () => {
    const m = migrateProject(clone(legacyV1));
    expect(m.metadata.version).toBe("2.0");
    expect(m.joints[0].loadCases[0].type).toBe("static");
    expect((m.joints[0].loadCases[0] as { forces: { Fy: number } }).forces.Fy).toBe(-10000);
    expect(m.joints[0].geometry.type).toBe("t_joint");
    expect(m.joints[0].service.position).toBe("1F");
    expect(m.joints[0].service.codeBasis).toBe("ASD");
    expect(m.joints[0].material.type).toBe("carbon_steel");
    expect(Array.isArray(m.customMaterials)).toBe(true);
    expect(typeof m.metadata.name).toBe("string");
  });

  it("does not throw on missing metadata (former TypeError) and reaches v2.0", () => {
    const noMeta = clone(modernV2) as Record<string, unknown>;
    delete noMeta.metadata;
    const m = migrateProject(noMeta);
    expect(m.metadata.version).toBe("2.0");
    expect(m.joints[0].loadCases.length).toBe(1);
    expect(Array.isArray(m.customMaterials)).toBe(true);
    expect(Array.isArray(m.loadCaseLibrary)).toBe(true);
  });

  it("is idempotent for v2.0", () => {
    const m = migrateProject(clone(modernV2));
    expect(m.metadata.version).toBe("2.0");
    expect(m.joints.length).toBe(1);
    expect(m.joints[0].id).toBe("j1");
  });
});
