import type { ProcessResult } from "../../types";

interface Props { result: ProcessResult; loading: boolean; }

export function ProcessResults({ result, loading }: Props) {
  const top3 = result.ranked_processes.slice(0, 3);
  return (
    <div className={`bg-bg-surface border border-border-subtle rounded p-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <div className="text-text-secondary text-xs font-medium mb-2">Process & Filler</div>
      <div className="mb-2">
        <span className="text-text-primary text-sm font-medium">{result.primary}</span>
        <span className="text-text-tertiary text-xs ml-2">recommended</span>
      </div>
      <div className="text-text-secondary text-xs mb-1">
        Filler: <span className="text-text-primary font-mono">{result.filler.classification}</span>
        <span className="text-text-tertiary ml-1">— {result.filler.comment}</span>
      </div>
      <div className="mt-2 space-y-0.5">
        {result.ranked_processes[0]?.rationale.map((r, i) => (
          <div key={i} className="text-text-tertiary text-xs">• {r}</div>
        ))}
      </div>
      {top3.length > 1 && (
        <div className="mt-2 pt-2 border-t border-border-subtle">
          <span className="text-text-tertiary text-xs">Alternatives: </span>
          <span className="text-text-secondary text-xs">{top3.slice(1).map(p => p.process).join(", ")}</span>
        </div>
      )}
    </div>
  );
}
