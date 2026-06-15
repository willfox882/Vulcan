import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { NumericField } from "./NumericField";
import type { LoadCaseItem, StaticLoadCase, CyclicLoadCase, SpectrumLoadCase, SpectrumEntry } from "../../types";

let _lcCounter = 2;
function newLcId(): string {
  return `lc-${String(_lcCounter++).padStart(3, "0")}`;
}

function StaticFields({ lc, onChange }: { lc: StaticLoadCase; onChange: (updated: StaticLoadCase) => void }) {
  const f = lc.forces;

  function updateForce(key: keyof typeof f, val: number) {
    onChange({ ...lc, forces: { ...f, [key]: val } });
  }

  const forceKeys = ["Fx", "Fy", "Fz"] as const;
  const momentKeys = ["Mx", "My", "Mz"] as const;

  return (
    <div className="flex flex-col gap-3 mt-2">
      <div>
        <p className="text-text-tertiary text-xs mb-1">Forces at joint centroid</p>
        <div className="grid grid-cols-3 gap-2">
          {forceKeys.map((k) => (
            <NumericField key={k} label={k} value={f[k]} onChange={(v) => updateForce(k, v)} dimension="force" />
          ))}
        </div>
      </div>
      <div>
        <p className="text-text-tertiary text-xs mb-1">Moments at joint centroid</p>
        <div className="grid grid-cols-3 gap-2">
          {momentKeys.map((k) => (
            <NumericField key={k} label={k} value={f[k]} onChange={(v) => updateForce(k, v)} dimension="moment" />
          ))}
        </div>
      </div>
    </div>
  );
}

function CyclicFields({ lc, onChange }: { lc: CyclicLoadCase; onChange: (updated: CyclicLoadCase) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-2">
      {([
        { key: "stressRangeMPa", label: "Stress Range", unit: "MPa", step: "1" },
        { key: "frequencyHz",    label: "Frequency",    unit: "Hz",  step: "0.1" },
        { key: "hoursPerDay",    label: "Hours / Day",  unit: "hr",  step: "1" },
        { key: "daysPerYear",    label: "Days / Year",  unit: "day", step: "1" },
      ] as const).map(({ key, label, unit, step }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-text-tertiary text-xs">{label}</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={lc[key]}
              step={step}
              min={0}
              onChange={(e) => onChange({ ...lc, [key]: parseFloat(e.target.value) || 0 })}
              className="flex-1 bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors"
            />
            <span className="text-text-tertiary text-xs w-8">{unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SpectrumFields({ lc, onChange }: { lc: SpectrumLoadCase; onChange: (updated: SpectrumLoadCase) => void }) {
  function updateEntry(i: number, key: keyof SpectrumEntry, val: number) {
    const spectrum = lc.spectrum.map((e, idx) => idx === i ? { ...e, [key]: val } : e);
    onChange({ ...lc, spectrum });
  }
  function addRow() {
    onChange({ ...lc, spectrum: [...lc.spectrum, { stressRangeMPa: 50, cycles: 10000 }] });
  }
  function removeRow(i: number) {
    onChange({ ...lc, spectrum: lc.spectrum.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="flex flex-col gap-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        {([
          { key: "frequencyHz", label: "Frequency", unit: "Hz", step: "0.1" },
          { key: "hoursPerDay", label: "Hours / Day", unit: "hr", step: "1" },
          { key: "daysPerYear", label: "Days / Year", unit: "day", step: "1" },
        ] as const).map(({ key, label, unit, step }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-text-tertiary text-xs">{label}</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={lc[key]}
                step={step}
                min={0}
                onChange={(e) => onChange({ ...lc, [key]: parseFloat(e.target.value) || 0 })}
                className="flex-1 bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors"
              />
              <span className="text-text-tertiary text-xs w-8">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <p className="text-text-tertiary text-xs">Stress Spectrum</p>
          <button
            onClick={addRow}
            className="text-accent text-xs hover:underline"
          >
            + Add row
          </button>
        </div>
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-text-tertiary text-[10px] px-1">
            <span>Range (MPa)</span>
            <span>Cycles</span>
            <span />
          </div>
          {lc.spectrum.map((entry, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input
                type="number"
                value={entry.stressRangeMPa}
                min={0}
                step="1"
                onChange={(e) => updateEntry(i, "stressRangeMPa", parseFloat(e.target.value) || 0)}
                className="bg-bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-accent/60"
              />
              <input
                type="number"
                value={entry.cycles}
                min={0}
                step="1000"
                onChange={(e) => updateEntry(i, "cycles", parseInt(e.target.value) || 0)}
                className="bg-bg-elevated border border-border-subtle rounded px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-accent/60"
              />
              <button
                onClick={() => removeRow(i)}
                className="text-text-tertiary text-xs hover:text-semantic-fail transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface LoadCaseCardProps {
  lc: LoadCaseItem;
  onChange: (updated: LoadCaseItem) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function LoadCaseCard({ lc, onChange, onDelete, canDelete }: LoadCaseCardProps) {
  const [expanded, setExpanded] = useState(true);

  const typeColor =
    lc.type === "static" ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
    : lc.type === "cyclic" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : "bg-purple-500/10 text-purple-400 border-purple-500/20";

  return (
    <div className="border border-border-subtle rounded">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-text-tertiary text-xs"
        >
          {expanded ? "▾" : "▸"}
        </button>
        <input
          value={lc.name}
          onChange={(e) => onChange({ ...lc, name: e.target.value })}
          className="flex-1 bg-transparent text-xs text-text-primary focus:outline-none"
        />
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${typeColor}`}>
          {lc.type}
        </span>
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-text-tertiary text-xs hover:text-semantic-fail transition-colors ml-1"
          >
            ×
          </button>
        )}
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-border-subtle pt-2">
          {lc.type === "static" && (
            <StaticFields lc={lc} onChange={(u) => onChange(u)} />
          )}
          {lc.type === "cyclic" && (
            <CyclicFields lc={lc} onChange={(u) => onChange(u)} />
          )}
          {lc.type === "spectrum" && (
            <SpectrumFields lc={lc} onChange={(u) => onChange(u)} />
          )}
        </div>
      )}
    </div>
  );
}

export function LoadPanel() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const loadCases = activeJoint.loadCases;

  function updateCase(id: string, updated: LoadCaseItem) {
    updateJoint(activeJoint!.id, {
      loadCases: loadCases.map((lc) => (lc.id === id ? updated : lc)),
    });
  }

  function deleteCase(id: string) {
    updateJoint(activeJoint!.id, {
      loadCases: loadCases.filter((lc) => lc.id !== id),
    });
  }

  function addCase(type: "static" | "cyclic" | "spectrum") {
    const id = newLcId();
    let newCase: LoadCaseItem;
    if (type === "static") {
      newCase = { id, name: "Static Load", type: "static", category: "O",
        forces: { Fx: 0, Fy: 0, Fz: 0, Mx: 0, My: 0, Mz: 0 } } as StaticLoadCase;
    } else if (type === "cyclic") {
      newCase = { id, name: "Cyclic Load", type: "cyclic",
        stressRangeMPa: 50, frequencyHz: 1, hoursPerDay: 8, daysPerYear: 250 } as CyclicLoadCase;
    } else {
      newCase = { id, name: "Spectrum Load", type: "spectrum",
        spectrum: [{ stressRangeMPa: 80, cycles: 50000 }, { stressRangeMPa: 50, cycles: 150000 }],
        frequencyHz: 1, hoursPerDay: 8, daysPerYear: 250 } as SpectrumLoadCase;
    }
    updateJoint(activeJoint!.id, { loadCases: [...loadCases, newCase] });
  }

  return (
    <div className="flex flex-col gap-3">
      {loadCases.map((lc) => (
        <LoadCaseCard
          key={lc.id}
          lc={lc}
          onChange={(updated) => updateCase(lc.id, updated)}
          onDelete={() => deleteCase(lc.id)}
          canDelete={loadCases.length > 1}
        />
      ))}
      <div className="flex gap-2">
        <span className="text-text-tertiary text-xs self-center">Add:</span>
        {(["static", "cyclic", "spectrum"] as const).map((t) => (
          <button
            key={t}
            onClick={() => addCase(t)}
            className="px-2 py-1 text-xs rounded border border-border-subtle text-text-secondary hover:border-accent/40 hover:text-accent transition-colors capitalize"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
