import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "../../stores/projectStore";
import type { CustomMaterial, Material } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface RawMaterialFile {
  materials: Material[];
}

const MATERIAL_FILES = [
  "/python/data/materials_steel.json",
  "/python/data/materials_stainless.json",
  "/python/data/materials_aluminum.json",
];

const TYPE_LABELS: Record<string, string> = {
  carbon_steel: "Carbon Steel",
  stainless: "Stainless Steel",
  aluminum: "Aluminum",
};

const EMPTY_FORM: Omit<CustomMaterial, "isCustom"> = {
  id: "",
  name: "",
  type: "carbon_steel",
  Fy: 250,
  Fu: 400,
  F_EXX: 483,
  unit: "MPa",
  notes: "",
};

export function MaterialLibraryModal({ open, onClose }: Props) {
  const { project, addCustomMaterial, removeCustomMaterial } = useProjectStore();
  const [builtIns, setBuiltIns] = useState<Material[]>([]);
  const [form, setForm] = useState<Omit<CustomMaterial, "isCustom">>({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all(
      MATERIAL_FILES.map((url) => fetch(url).then((r) => r.json() as Promise<RawMaterialFile>))
    )
      .then((files) => {
        setBuiltIns(files.flatMap((f) => f.materials ?? []));
      })
      .catch(() => {/* ignore fetch errors */});
  }, [open]);

  function handleAdd() {
    setFormError(null);
    if (!form.id.trim()) { setFormError("ID is required"); return; }
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (form.Fy <= 0 || form.Fu <= 0) { setFormError("Fy and Fu must be > 0"); return; }
    const mat: CustomMaterial = { ...form, isCustom: true };
    addCustomMaterial(mat);
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
  }

  const grouped = builtIns.reduce<Record<string, Material[]>>((acc, m) => {
    const key = m.type ?? "carbon_steel";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const customMaterials = project.customMaterials ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70" />
          <motion.div
            className="relative bg-bg-elevated border border-border-strong rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            initial={{ scale: 0.96, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
              <h2 className="text-text-primary font-semibold text-sm">Material Library</h2>
              <button
                onClick={onClose}
                className="text-text-tertiary hover:text-text-primary text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Built-in materials */}
              <div className="px-5 pt-4 pb-2">
                <h3 className="text-text-tertiary text-[10px] uppercase tracking-widest mb-2">
                  Built-in Materials (read-only)
                </h3>
                {Object.entries(grouped).map(([type, mats]) => (
                  <div key={type} className="mb-3">
                    <div className="text-text-secondary text-xs font-medium mb-1">
                      {TYPE_LABELS[type] ?? type}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {mats.map((m) => (
                        <div
                          key={m.id}
                          className="bg-bg-base rounded px-3 py-1.5 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-text-secondary text-xs font-mono">{m.name}</div>
                            <div className="text-text-tertiary text-[10px]">
                              Fy {m.Fy} / Fu {m.Fu} {m.unit}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {builtIns.length === 0 && (
                  <p className="text-text-tertiary text-xs">Loading materials...</p>
                )}
              </div>

              {/* Custom materials */}
              <div className="px-5 py-2 border-t border-border-subtle">
                <h3 className="text-text-tertiary text-[10px] uppercase tracking-widest mb-2">
                  Custom Materials ({customMaterials.length})
                </h3>
                {customMaterials.length === 0 ? (
                  <p className="text-text-tertiary text-xs mb-2">No custom materials yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {customMaterials.map((m) => (
                      <div
                        key={m.id}
                        className="bg-bg-base border border-accent/20 rounded px-3 py-1.5 flex items-center justify-between group"
                      >
                        <div>
                          <div className="text-text-primary text-xs font-mono">{m.name}</div>
                          <div className="text-text-tertiary text-[10px]">
                            Fy {m.Fy} / Fu {m.Fu} {m.unit}
                          </div>
                          {m.notes && (
                            <div className="text-text-tertiary text-[10px] italic">{m.notes}</div>
                          )}
                        </div>
                        <button
                          onClick={() => removeCustomMaterial(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 text-sm transition-opacity ml-2"
                          aria-label="Delete custom material"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add form */}
                {showForm ? (
                  <div className="bg-bg-base rounded-lg p-3 border border-border-subtle">
                    <h4 className="text-text-secondary text-xs font-medium mb-2">Add Custom Material</h4>
                    {formError && (
                      <p className="text-red-400 text-xs mb-2">{formError}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Field
                        label="ID"
                        value={form.id}
                        onChange={(v) => setForm((f) => ({ ...f, id: v }))}
                        placeholder="e.g. MY-STEEL"
                      />
                      <Field
                        label="Name"
                        value={form.name}
                        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                        placeholder="e.g. My Custom Steel"
                      />
                      <div className="flex flex-col gap-0.5">
                        <label className="text-text-tertiary text-[10px] uppercase tracking-widest">Type</label>
                        <select
                          value={form.type}
                          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Material["type"] }))}
                          className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none"
                        >
                          <option value="carbon_steel">Carbon Steel</option>
                          <option value="stainless">Stainless Steel</option>
                          <option value="aluminum">Aluminum</option>
                        </select>
                      </div>
                      <Field
                        label="Unit"
                        value={form.unit}
                        onChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                        placeholder="MPa"
                      />
                      <NumField
                        label="Fy (yield)"
                        value={form.Fy}
                        onChange={(v) => setForm((f) => ({ ...f, Fy: v }))}
                      />
                      <NumField
                        label="Fu (ultimate)"
                        value={form.Fu}
                        onChange={(v) => setForm((f) => ({ ...f, Fu: v }))}
                      />
                      <NumField
                        label="F_EXX (electrode)"
                        value={form.F_EXX}
                        onChange={(v) => setForm((f) => ({ ...f, F_EXX: v }))}
                      />
                      <Field
                        label="Notes (optional)"
                        value={form.notes ?? ""}
                        onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
                        placeholder="Any notes"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleAdd}
                        className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 transition-colors"
                      >
                        Add Material
                      </button>
                      <button
                        onClick={() => { setShowForm(false); setFormError(null); }}
                        className="px-3 py-1.5 text-xs text-text-secondary border border-border-subtle rounded hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-3 py-1.5 text-xs text-text-secondary border border-border-strong rounded hover:text-text-primary hover:border-accent/50 transition-colors"
                  >
                    + Add Custom Material
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-text-tertiary text-[10px] uppercase tracking-widest">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent/50"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-text-tertiary text-[10px] uppercase tracking-widest">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-bg-surface border border-border-subtle rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent/50"
      />
    </div>
  );
}
