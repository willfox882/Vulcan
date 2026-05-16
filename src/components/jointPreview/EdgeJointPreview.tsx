import type { Joint, EdgeJointGeometry } from "../../types";

interface Props { joint: Joint; }

// Edge joint: two plates side-by-side with faces parallel, welded along their top edges
export function EdgeJointPreview({ joint }: Props) {
  const g = joint.geometry as EdgeJointGeometry;

  const p1W = Math.max(Math.min(g.plate1Thickness * 2.0, 30), 8);
  const p2W = Math.max(Math.min(g.plate2Thickness * 2.0, 30), 8);
  const plateH = 70;
  const weldS = Math.max(Math.min(g.weldSize * 1.2, 12), 4);
  const gap = 2; // small gap between plates

  const cx = 100;
  const topY = 18;
  const p1x = cx - gap / 2 - p1W;
  const p2x = cx + gap / 2;

  return (
    <svg viewBox="0 0 200 130" width="100%" height="130" style={{ display: "block" }}>
      {/* Plate 1 (left) */}
      <rect x={p1x} y={topY} width={p1W} height={plateH}
        fill="#1c1c1c" stroke="#52525b" strokeWidth="1.2" />
      {/* Plate 2 (right) */}
      <rect x={p2x} y={topY} width={p2W} height={plateH}
        fill="#252525" stroke="#52525b" strokeWidth="1.2" />

      {/* Edge weld — along the top edges of both plates */}
      <polygon
        points={`${p1x},${topY} ${p2x + p2W},${topY} ${cx},${topY - weldS}`}
        fill="#7c3aed" opacity="0.85" />

      {/* t₁ label */}
      <line x1="30" y1="60" x2={p1x} y2="55"
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="63" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₁={g.plate1Thickness}</text>

      {/* t₂ label */}
      <line x1="140" y1="60" x2={p2x + p2W} y2="55"
        stroke="#52525b" strokeWidth="0.8" />
      <text x="141" y="63" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₂={g.plate2Thickness}</text>

      {/* w label */}
      <line x1="90" y1="6" x2={cx - 2} y2={topY - weldS * 0.5}
        stroke="#7c3aed" strokeWidth="0.8" />
      <text x="82" y="9" fill="#7c3aed" fontSize="8" fontFamily="JetBrains Mono, monospace">w={g.weldSize}</text>

      <text x="100" y="120" fill="#52525b" fontSize="7" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        L={g.jointLength} · edge weld
      </text>
    </svg>
  );
}
