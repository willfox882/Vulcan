import { useEffect, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import type { CustomMaterial, Material } from "../../types";

interface RawMaterial {
  id: string;
  name: string;
  type: "carbon_steel" | "stainless" | "aluminum";
  Fy: number;
  Fu: number;
  F_EXX?: number;
  unit: string;
  recommended_electrode?: string;
  chemistry?: Record<string, number>;
  requires_pwht?: boolean;
  aws_table_5_8_category?: string;
}

interface MaterialFileData {
  materials: RawMaterial[];
}

interface ElectrodeData {
  electrodes: Array<{
    classification: string;
    F_EXX_MPa: number;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  carbon_steel: "Carbon Steel",
  stainless: "Stainless Steel",
  aluminum: "Aluminum",
};

const TYPE_ORDER = ["carbon_steel", "stainless", "aluminum"] as const;

const PROP_DESCRIPTIONS: Record<string, string> = {
  Fy:    "Yield strength",
  Fu:    "Ultimate tensile strength",
  F_EXX: "Electrode strength",
};

const EMPTY_CUSTOM = { name: "", type: "carbon_steel" as Material["type"], Fy: 250, Fu: 400, F_EXX: 483 };

export function MaterialPanel() {
  const { activeJoint, updateJoint, project, addCustomMaterial } = useProjectStore();
  const [materialsByType, setMaterialsByType] = useState<Record<string, RawMaterial[]>>({});
  const [electrodes, setElectrodes] = useState<ElectrodeData["electrodes"]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ ...EMPTY_CUSTOM });
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    const files = [
      "/python/data/materials_steel.json",
      "/python/data/materials_stainless.json",
      "/python/data/materials_aluminum.json",
    ];
    Promise.all(files.map((f) => fetch(f).then((r) => r.json() as Promise<MaterialFileData>))).then(
      (datasets) => {
        const grouped: Record<string, RawMaterial[]> = {};
        for (const ds of datasets) {
          for (const m of ds.materials) {
            if (!grouped[m.type]) grouped[m.type] = [];
            grouped[m.type].push(m);
          }
        }
        setMaterialsByType(grouped);
      }
    );
    fetch("/python/data/electrodes_aws_a5.json")
      .then((r) => r.json())
      .then((d: ElectrodeData) => setElectrodes(d.electrodes));
  }, []);

  // Component-level guard
  if (!activeJoint) return null;

  const joint = activeJoint;
  const selected = joint.material;
  const customMaterials = project.customMaterials ?? [];
  const allBuiltIns = TYPE_ORDER.flatMap((t) => materialsByType[t] ?? []);

  function selectMaterial(id: string) {
    // Narrowing the type for TypeScript
    const currentJoint = activeJoint;
    if (!currentJoint) return;

    const custom = customMaterials.find((m) => m.id === id);
    if (custom) {
      updateJoint(currentJoint.id, { material: custom });
      return;
    }

    const mat = allBuiltIns.find((m) => m.id === id);
    if (!mat) return;

    const electrode = electrodes.find((e) => e.classification === (mat.recommended_electrode ?? ""));
    const material: Material = {
      id: mat.id,
      name: mat.name,
      type: mat.type,
      Fy: mat.Fy,
      Fu: mat.Fu,
      F_EXX: mat.F_EXX ?? electrode?.F_EXX_MPa ?? 483,
      unit: mat.unit,
      chemistry: mat.chemistry,
      requires_pwht: mat.requires_pwht,
      aws_table_5_8_category: mat.aws_table_5_8_category,
    };
    updateJoint(currentJoint.id, { material });
  }

  function handleAddCustom() {
    // Narrowing the type for TypeScript
    const currentJoint = activeJoint;
    if (!currentJoint) return;

    setCustomError(null);
    if (!customForm.name.trim()) { setCustomError("Name is required."); return; }
    if (customForm.Fy <= 0 || customForm.Fu <= 0 || customForm.F_EXX <= 0) {
      setCustomError("Fy, Fu, and F_EXX must be > 0.");
      return;
    }

    const id = "custom-" + customForm.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const mat: CustomMaterial = {
      id,
      name: customForm.name.trim(),
      type: customForm.type,
      Fy: customForm.Fy,
      Fu: customForm.Fu,
      F_EXX: customForm.F_EXX,
      unit: "MPa",
      isCustom: true,
    };

    addCustomMaterial(mat);
    updateJoint(currentJoint.id, { material: mat });
    setCustomForm({ ...EMPTY_CUSTOM });
    setShowCustomForm(false);
  }

  const typeBadgeColor: Record<string, string> = {
    carbon_steel: "text-text-secondary",
    stainless:    "text-semantic-pass",
    aluminum:      "text-accent",
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Base Material</label>
        <select
          value={selected.id}
          onChange={(e) => selectMaterial(e.target.value)}
          className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/60 transition-colors"
        >
          {TYPE_ORDER.map((t) => {
            const group = materialsByType[t];
            if (!group || group.length === 0) return null;
            return (
              <optgroup key={t} label={`─── ${TYPE_LABELS[t]} ───`}>
                {group.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
            );
          })}
          {customMaterials.length > 0 && (
            <optgroup label="─── Custom ───">
              {customMaterials.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {(["Fy", "Fu", "F_EXX"] as const).map((prop) => (
          <div key={prop} className="bg-bg-elevated rounded p-2">
            <div className="text-text-tertiary text-[10px]">{prop}</div>
            <div className="text-text-tertiary text-[9px] leading-tight">{PROP_DESCRIPTIONS[prop]}</div>
            <div className="text-text-primary font-mono text-xs mt-1">{selected[prop]} <span className="text-text-tertiary text-[10px]">MPa</span></div>
          </div>
        ))}
      </div>

      <div className="bg-bg-elevated rounded p-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-text-tertiary">Type:</span>
          <span className={`font-medium ${typeBadgeColor[selected.type] ?? "text-text-secondary"}`}>
            {TYPE_LABELS[selected.type] ?? selected.type}
          </span>
          {(selected as CustomMaterial).isCustom && (
            <span className="ml-auto text-accent text-[10px] border border-accent/30 bg-accent/10 rounded px-1.5 py-0.5">
              custom
            </span>
          )}
          {selected.requires_pwht && (
            <span className="ml-auto text-semantic-warning text-[10px] border border-semantic-warning/40 bg-semantic-warning/10 rounded px-1.5 py-0.5">
              PWHT req.
            </span>
          )}
        </div>
        {selected.aws_table_5_8_category && (
          <div className="text-text-tertiary">
            AWS Cat.: <span className="text-text-secondary">{selected.aws_table_5_8_category}</span>
          </div>
        )}
      </div>

      {!showCustomForm ? (
        <button
          onClick={() => setShowCustomForm(true)}
          className="text-xs text-text-tertiary hover:text-text-secondary border border-border-subtle rounded px-2 py-1.5 text-left transition-colors hover:border-border-strong"
        >
          + Define custom material
        </button>
      ) : (
        <div className="border border-border-strong rounded p-3 flex flex-col gap-2 bg-bg-elevated">
          <div className="text-text-secondary text-xs font-medium">Custom Material</div>
          <p className="text-text-tertiary text-[10px] leading-snug">
            <span className="text-text-secondary">Fy</span> = yield strength,{" "}
            <span className="text-text-secondary">Fu</span> = ultimate tensile,{" "}
            <span className="text-text-secondary">F_EXX</span> = electrode filler strength.
            All values in MPa.
          </p>
          {customError && (
            <p className="text-semantic-fail text-[10px]">{customError}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-0.5">
              <label className="text-text-tertiary text-[10px]">Name</label>
              <input
                type="text"
                value={customForm.name}
                onChange={(e) => setCustomForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. A572 Gr.50"
                className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-text-tertiary text-[10px]">Type</label>
              <select
                value={customForm.type}
                onChange={(e) => setCustomForm((f) => ({ ...f, type: e.target.value as Material["type"] }))}
                className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none"
              >
                <option value="carbon_steel">Carbon Steel</option>
                <option value="stainless">Stainless Steel</option>
                <option value="aluminum">Aluminum</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["Fy", "Fu", "F_EXX"] as const).map((prop) => (
                <div key={prop} className="flex flex-col gap-0.5">
                  <label className="text-text-tertiary text-[10px]">{prop} (MPa)</label>
                  <input
                    type="number"
                    min="1"
                    value={customForm[prop]}
                    onChange={(e) => setCustomForm((f) => ({ ...f, [prop]: Number(e.target.value) }))}
                    className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent/50"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleAddCustom}
              className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent/80 transition-colors"
            >
              Add &amp; select
            </button>
            <button
              onClick={() => { setShowCustomForm(false); setCustomError(null); setCustomForm({ ...EMPTY_CUSTOM }); }}
              className="px-3 py-1 text-xs text-text-secondary border border-border-subtle rounded hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
