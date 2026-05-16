import type { Joint, CornerJointGeometry } from "../../types";

interface Props { joint: Joint; }

export function CornerJointPreview({ joint }: Props) {
  const g = joint.geometry as CornerJointGeometry;

  const p1W = Math.max(Math.min(g.plate1Thickness * 1.4, 24), 7);
  const p2H = Math.max(Math.min(g.plate2Thickness * 1.4, 24), 7);
  const armLen = 60;
  const weldSi = Math.max(Math.min(g.weldSizeInside  * 1.2, 14), 5);
  const weldSo = Math.max(Math.min(g.weldSizeOutside * 1.2, 14), 5);

  // Corner junction point
  const jx = 90;
  const jy = 65;

  // Plate 1 (vertical): right face at x=jx, goes UP from jy
  const p1x = jx - p1W;
  const p1y = jy - armLen;

  // Plate 2 (horizontal): top face at y=jy, goes RIGHT from jx
  const p2x = jx;
  const p2y = jy;

  const showInside  = g.weldConfig === "inside"  || g.weldConfig === "both";
  const showOutside = g.weldConfig === "outside" || g.weldConfig === "both";

  return (
    <svg viewBox="0 0 200 130" width="100%" height="130" style={{ display: "block" }}>
      {/* Plate 1 — vertical */}
      <rect x={p1x} y={p1y} width={p1W} height={armLen}
        fill="#1c1c1c" stroke="#52525b" strokeWidth="1.2" />

      {/* Plate 2 — horizontal */}
      <rect x={p2x} y={p2y} width={armLen} height={p2H}
        fill="#1c1c1c" stroke="#52525b" strokeWidth="1.2" />

      {/* Inside fillet — concave corner, fills upper-right from junction */}
      {showInside && (
        <polygon
          points={`${jx},${jy} ${jx + weldSi},${jy} ${jx},${jy - weldSi}`}
          fill="#7c3aed" opacity="0.9" />
      )}

      {/* Outside fillet — convex corner, fills lower-left from junction */}
      {showOutside && (
        <polygon
          points={`${jx},${jy} ${jx - weldSo},${jy} ${jx},${jy + weldSo}`}
          fill="#7c3aed" opacity="0.6" />
      )}

      {/* t₁ — vertical plate */}
      <line x1="30" y1="38" x2={p1x} y2={jy - armLen * 0.55}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="41" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₁</text>

      {/* t₂ — horizontal plate */}
      <line x1="30" y1="55" x2={p2x + armLen * 0.3} y2={p2y + p2H}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="58" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₂</text>

      {/* wᵢ — inside weld label */}
      {showInside && (
        <>
          <line x1="140" y1="45" x2={jx + weldSi * 0.55} y2={jy - weldSi * 0.55}
            stroke="#7c3aed" strokeWidth="0.8" />
          <text x="141" y="48" fill="#7c3aed" fontSize="8" fontFamily="JetBrains Mono, monospace">wᵢ</text>
        </>
      )}

      {/* wₒ — outside weld label */}
      {showOutside && (
        <>
          <line x1="52" y1="100" x2={jx - weldSo * 0.55} y2={jy + weldSo * 0.55}
            stroke="#7c3aed" strokeWidth="0.8" />
          <text x="4" y="103" fill="#7c3aed" fontSize="8" fontFamily="JetBrains Mono, monospace">wₒ</text>
        </>
      )}

      {/* Config annotation */}
      <text x="100" y="122" fill="#52525b" fontSize="7" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        {g.weldConfig === "both" ? "both sides" : g.weldConfig}
      </text>
    </svg>
  );
}
