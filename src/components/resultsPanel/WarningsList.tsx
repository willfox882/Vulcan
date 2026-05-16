import type { AnalysisResult } from "../../types";

interface Props {
  result: AnalysisResult;
}

export function WarningsList({ result }: Props) {
  const warnings = result.validation.warnings;

  return (
    <div className="bg-bg-surface border border-border-subtle rounded p-3">
      <div className="text-text-secondary text-xs font-medium mb-2">Code Checks</div>
      {warnings.length === 0 ? (
        <p className="text-semantic-pass text-xs">✓ All AWS D1.1 constraints satisfied</p>
      ) : (
        <div className="flex flex-col gap-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`text-xs rounded p-2 border ${
                w.severity === "error"
                  ? "text-semantic-fail border-semantic-fail/30 bg-semantic-fail/5"
                  : "text-semantic-warning border-semantic-warning/30 bg-semantic-warning/5"
              }`}
            >
              <p>{w.message}</p>
              <p className="text-text-tertiary mt-0.5 font-mono">{w.code_clause}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
