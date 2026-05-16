import { useProjectStore } from "../../stores/projectStore";

export function ServicePanel() {
  const { activeJoint, updateJoint } = useProjectStore();
  if (!activeJoint) return null;

  const svc = activeJoint.service;

  function update<K extends keyof typeof svc>(key: K, val: (typeof svc)[K]) {
    updateJoint(activeJoint!.id, { service: { ...svc, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Code Basis</label>
        <div className="flex gap-2">
          {(["ASD", "LRFD"] as const).map((basis) => (
            <button
              key={basis}
              onClick={() => update("codeBasis", basis)}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                svc.codeBasis === basis
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border-subtle text-text-secondary hover:border-border-strong"
              }`}
            >
              {basis}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Design Life (years)</label>
        <input
          type="number"
          value={svc.designLife}
          min={1}
          onChange={(e) => update("designLife", parseInt(e.target.value) || 25)}
          className="w-24 bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors"
        />
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Operating Frequency (Hz)</label>
        <input
          type="number"
          value={svc.operatingFrequency}
          min={0}
          step="0.1"
          onChange={(e) => update("operatingFrequency", parseFloat(e.target.value) || 0)}
          className="w-24 bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent/60 transition-colors"
        />
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Welding Position</label>
        <select
          value={svc.position ?? "1F"}
          onChange={(e) => update("position", e.target.value as typeof svc.position)}
          className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/60 transition-colors"
        >
          <option value="1F">1F — Flat (fillet)</option>
          <option value="2F">2F — Horizontal (fillet)</option>
          <option value="3F">3F — Vertical (fillet)</option>
          <option value="4F">4F — Overhead (fillet)</option>
          <option value="1G">1G — Flat (groove)</option>
          <option value="2G">2G — Horizontal (groove)</option>
          <option value="3G">3G — Vertical (groove)</option>
          <option value="4G">4G — Overhead (groove)</option>
        </select>
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Environment</label>
        <select
          value={svc.environment ?? "shop"}
          onChange={(e) => update("environment", e.target.value as typeof svc.environment)}
          className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/60 transition-colors"
        >
          <option value="shop">Shop / Indoor</option>
          <option value="outdoor">Outdoor / Exposed</option>
          <option value="field">Field / Remote</option>
        </select>
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Production Volume</label>
        <select
          value={svc.productionVolume ?? "repeat"}
          onChange={(e) => update("productionVolume", e.target.value as typeof svc.productionVolume)}
          className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/60 transition-colors"
        >
          <option value="one_off">One-off</option>
          <option value="repeat">Repeat Production</option>
          <option value="mass">Mass Production</option>
        </select>
      </div>
      <div>
        <label className="text-text-tertiary text-xs block mb-1">Quality Level</label>
        <select
          value={svc.qualityLevel ?? "structural"}
          onChange={(e) => update("qualityLevel", e.target.value as typeof svc.qualityLevel)}
          className="w-full bg-bg-elevated border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/60 transition-colors"
        >
          <option value="cosmetic">Cosmetic</option>
          <option value="structural">Structural</option>
          <option value="code">Code-Quality</option>
          <option value="radiographic">Radiographic</option>
        </select>
      </div>
    </div>
  );
}
