import type { Joint, ButtJointGeometry } from "../../types";

interface Props { joint: Joint; }

export function ButtJointPreview({ joint }: Props) {
  const g = joint.geometry as ButtJointGeometry;

  const p1H = Math.max(Math.min(g.plate1Thickness * 2.2, 50), 16);
  const p2H = Math.max(Math.min(g.plate2Thickness * 2.2, 50), 16);
  const plateW = 68;
  const gap = Math.max(Math.min(g.rootOpening * 3, 12), 4);
  const grooveHalfAngle = Math.min((g.grooveAngle / 2) * (Math.PI / 180), Math.PI / 3.5);
  const grooveDepth = Math.min(p1H * 0.55, 22);
  const grooveSpread = grooveDepth * Math.tan(grooveHalfAngle);

  const cx = 100;
  const midY = 62;
  const topY = midY - Math.max(p1H, p2H) / 2;

  const lx = cx - gap / 2;  // right edge of left plate
  const rx = cx + gap / 2;  // left edge of right plate

  return (
    <svg viewBox="0 0 200 130" width="100%" height="130" style={{ display: "block" }}>
      {/* Left plate */}
      <rect x={lx - plateW} y={topY} width={plateW} height={p1H}
        fill="#1c1c1c" stroke="#52525b" strokeWidth="1.2" />
      {/* Right plate */}
      <rect x={rx} y={topY} width={plateW} height={p2H}
        fill="#252525" stroke="#52525b" strokeWidth="1.2" />

      {/* Groove bevels (not square) */}
      {g.grooveType !== "square" && (
        <>
          <polygon
            points={`${lx},${topY} ${lx - grooveSpread},${topY + grooveDepth} ${lx},${topY + grooveDepth}`}
            fill="#7c3aed" opacity="0.5" />
          <polygon
            points={`${rx},${topY} ${rx + grooveSpread},${topY + grooveDepth} ${rx},${topY + grooveDepth}`}
            fill="#7c3aed" opacity="0.5" />
          {/* Root opening dashes */}
          <line x1={lx - grooveSpread} y1={topY + grooveDepth} x2={rx + grooveSpread} y2={topY + grooveDepth}
            stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3,2" />
          {/* Groove angle arc indicator */}
          <path d={`M ${lx} ${topY + 8} L ${lx - 8} ${topY + 2}`}
            stroke="#52525b" strokeWidth="0.8" fill="none" />
        </>
      )}

      {/* Gap line for square groove */}
      {g.grooveType === "square" && (
        <line x1={lx} y1={topY} x2={rx} y2={topY + p1H}
          stroke="#7c3aed" strokeWidth="1" strokeDasharray="3,2" />
      )}

      {/* t₁ label — left plate with leader line */}
      <line x1="28" y1="44" x2={lx - plateW + 10} y2={topY}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="47" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₁</text>

      {/* t₂ label — right plate with leader line */}
      <line x1="28" y1="57" x2={rx + 10} y2={topY + p2H}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="60" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₂</text>

      {/* Penetration type */}
      <text x="164" y={topY + 10} fill="#7c3aed" fontSize="8" fontFamily="JetBrains Mono, monospace">
        {g.penetration === "full" ? "CJP" : "PJP"}
      </text>
      {/* Groove angle marker — label only */}
      {g.grooveType !== "square" && (
        <text x="164" y={topY + 22} fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">
          θ
        </text>
      )}
    </svg>
  );
}
