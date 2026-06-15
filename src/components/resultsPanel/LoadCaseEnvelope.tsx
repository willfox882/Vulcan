import type { LoadCaseUtilization } from "../../types";

interface Props {
  envelope: LoadCaseUtilization[];
}

/**
 * Per-static-case utilization summary. The structural panels above show the
 * governing (worst) case; this card lists every static case so the engineer
 * can see the full envelope and which one governs.
 */
export function LoadCaseEnvelope({ envelope }: Props) {
  if (envelope.length < 2) return null;

  return (
    <div className="bg-bg-surface border border-border-subtle rounded p-3">
      <div className="text-text-secondary text-xs font-medium mb-2">
        Load Case Envelope
      </div>
      <div className="space-y-1">
        {envelope.map((e) => {
          const color =
            e.utilization_pct > 100
              ? "text-semantic-fail"
              : e.utilization_pct > 80
              ? "text-semantic-warning"
              : "text-semantic-pass";
          return (
            <div
              key={e.id}
              className={`flex items-center justify-between text-xs rounded px-2 py-1 ${
                e.governs ? "border border-accent/40 bg-accent/5" : "bg-bg-elevated"
              }`}
            >
              <span className="text-text-secondary truncate mr-2">
                {e.name}
                {e.category ? (
                  <span className="text-text-tertiary ml-1">({e.category})</span>
                ) : null}
                {e.governs ? (
                  <span className="text-accent ml-1">← governs</span>
                ) : null}
              </span>
              <span className={`font-mono font-medium ${color}`}>
                {e.utilization_pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
