import { useEffect, useState } from "react";
import { usePyodideStore } from "../../stores/pyodideStore";
import { callEngine } from "../../lib/pyodide";
import type { AnalysisResult } from "../../types";

interface SymbolResponse {
  svg: string;
  notation: string;
}

interface Props {
  result: AnalysisResult;
}

export function WeldSymbolPreview({ result }: Props) {
  const ready = usePyodideStore((s) => s.status === "ready");
  const [symbolData, setSymbolData] = useState<SymbolResponse | null>(null);

  const sym = result.symbol;

  useEffect(() => {
    if (!ready) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      if (ac.signal.aborted) return;
      callEngine<SymbolResponse>("generate_symbol_svg", {
        weld_type: sym.weld_type ?? "fillet",
        size: sym.size,
        configuration: sym.configuration,
        all_around: sym.all_around ?? false,
        field_weld: sym.field_weld ?? false,
        tail: sym.tail ?? null,
        groove_angle: sym.groove_angle ?? null,
        root_opening: sym.root_opening ?? null,
        contour: sym.contour ?? null,
        finish: sym.finish ?? null,
        length: sym.length ?? null,
        pitch: sym.pitch ?? null,
      }, ac.signal).then((data) => {
        if (!ac.signal.aborted) setSymbolData(data);
      }).catch((e) => {
        if (ac.signal.aborted || (e instanceof Error && e.name === "AbortError")) return;
        console.error(e);
      });
    }, 100);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [
    ready,
    sym.weld_type,
    sym.size,
    sym.configuration,
    sym.all_around,
    sym.field_weld,
    sym.tail,
    sym.groove_angle,
    sym.root_opening,
    sym.contour,
    sym.finish,
    sym.length,
    sym.pitch,
  ]);

  return (
    <div className="bg-bg-surface border border-border-subtle rounded p-3">
      <div className="text-text-secondary text-xs font-medium mb-2">AWS Weld Symbol</div>
      {symbolData ? (
        <>
          <div
            className="flex justify-center bg-bg-elevated rounded p-3"
            dangerouslySetInnerHTML={{ __html: symbolData.svg }}
          />
          <p className="text-text-secondary text-xs font-mono text-center mt-2">
            {symbolData.notation}
          </p>
        </>
      ) : (
        <div className="h-20 bg-bg-elevated rounded animate-pulse" />
      )}
    </div>
  );
}
