import { useEffect, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import {
  UNIT_LABELS,
  toDisplay,
  fromDisplay,
  formatDisplay,
  type Dimension,
} from "../../lib/units";

interface NumericFieldProps {
  label: string;
  /** Stored value, always in SI (mm, N, N·mm, MPa, deg). */
  value: number;
  /** Receives the new value in SI. */
  onChange: (siValue: number) => void;
  /** Physical dimension; drives unit label + conversion. Default "length". */
  dimension?: Dimension;
  /** Minimum, expressed in SI. */
  min?: number;
  /** Spinner increment, in display units. Sensible per-dimension default. */
  step?: number | string;
}

function defaultStep(dim: Dimension, metric: boolean): number {
  switch (dim) {
    case "length": return metric ? 0.5 : 0.05;
    case "force": return metric ? 100 : 25;
    case "moment": return metric ? 1000 : 250;
    case "stress": return metric ? 1 : 0.1;
    case "angle": return 5;
  }
}

/**
 * Numeric input that displays/edits in the active unit system while always
 * reading and writing SI through `value`/`onChange`. Uses local text state so
 * conversion round-tripping never fights the user mid-keystroke; it re-syncs
 * only when the SI value or unit system changes from outside this field.
 */
export function NumericField({
  label,
  value,
  onChange,
  dimension = "length",
  min,
  step,
}: NumericFieldProps) {
  const unitSystem = useProjectStore((s) => s.unitSystem);
  const metric = unitSystem === "metric";
  const unitLabel = UNIT_LABELS[unitSystem][dimension];

  const [text, setText] = useState(() =>
    formatDisplay(toDisplay(value, dimension, unitSystem))
  );

  // Re-format when the incoming SI value or the unit system changes from
  // outside (undo/redo, file load, joint switch, unit toggle). We detect an
  // external change by comparing the field's own text-as-SI against `value`;
  // if they match, the change originated here and we leave the text alone.
  useEffect(() => {
    const textAsSI = fromDisplay(parseFloat(text), dimension, unitSystem);
    const tol = 1e-6 * Math.max(1, Math.abs(value));
    if (!Number.isFinite(textAsSI) || Math.abs(textAsSI - value) > tol) {
      setText(formatDisplay(toDisplay(value, dimension, unitSystem)));
    }
    // `text` is intentionally excluded: this effect responds only to external
    // changes, not to the user's own typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, unitSystem, dimension]);

  function handleChange(raw: string) {
    setText(raw);
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      onChange(fromDisplay(parsed, dimension, unitSystem));
    }
  }

  const displayMin = min !== undefined ? toDisplay(min, dimension, unitSystem) : undefined;
  const displayStep = step ?? defaultStep(dimension, metric);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-text-tertiary text-xs">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={text}
          min={displayMin}
          step={displayStep}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors"
        />
        <span className="text-text-tertiary text-xs w-8">{unitLabel}</span>
      </div>
    </div>
  );
}
