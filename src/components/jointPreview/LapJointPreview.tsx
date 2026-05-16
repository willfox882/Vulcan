import type { Joint, LapJointGeometry } from "../../types";

interface Props { joint: Joint; }

export function LapJointPreview({ joint }: Props) {
  const g = joint.geometry as LapJointGeometry;

  const p1H = Math.max(Math.min(g.plate1Thickness * 1.3, 18), 6);
  const p2H = Math.max(Math.min(g.plate2Thickness * 1.3, 18), 6);
  const weldS = Math.max(Math.min(g.weldSize * 1.2, 14), 5);

  // Layout: plate 2 (bottom) extends left-to-center, plate 1 (top) extends center-to-right
  // Overlap is in the middle. End welds at left edge of top plate and right edge of bottom plate.
  const overlapW = 60;   // fixed display overlap width
  const armW = 55;       // non-overlap arm length

  // Plate 2 (bottom): x from 10 to 10+armW+overlapW, centered vertically lower
  const p2x = 10;
  const p2w = armW + overlapW;
  const p2y = 62;

  // Plate 1 (top): x from 10+armW to 10+armW+overlapW+armW, above p2
  const p1x = p2x + armW;
  const p1w = overlapW + armW;
  const p1y = p2y - p1H;

  // End weld at right end of plate 2 (where plate 1's top face meets plate 2's right edge)
  const weld1x = p2x + p2w;  // right end of plate 2
  // End weld at left end of plate 1 (where plate 2's top face meets plate 1's left edge)
  const weld2x = p1x;        // left end of plate 1

  return (
    <svg viewBox="0 0 200 130" width="100%" height="130" style={{ display: "block" }}>
      {/* Plate 2 (bottom) */}
      <rect x={p2x} y={p2y} width={p2w} height={p2H}
        fill="#1c1c1c" stroke="#52525b" strokeWidth="1.2" />
      {/* Plate 1 (top) */}
      <rect x={p1x} y={p1y} width={p1w} height={p1H}
        fill="#252525" stroke="#52525b" strokeWidth="1.2" />

      {/* Weld at left end of plate 1 on top face of plate 2 */}
      <polygon
        points={`${weld2x},${p2y} ${weld2x - weldS},${p2y} ${weld2x},${p2y - weldS}`}
        fill="#7c3aed" opacity="0.9" />
      {/* Weld at right end of plate 2 on bottom face of plate 1 (if both_sides) */}
      {g.weldConfig === "both_sides" && (
        <polygon
          points={`${weld1x},${p1y + p1H} ${weld1x + weldS},${p1y + p1H} ${weld1x},${p1y + p1H + weldS}`}
          fill="#7c3aed" opacity="0.9" />
      )}

      {/* Overlap brace lines */}
      <line x1={p1x} y1={p2y + p2H + 4} x2={weld1x} y2={p2y + p2H + 4}
        stroke="#3f3f46" strokeWidth="0.8" strokeDasharray="3,2" />

      {/* t₁ label — plate 1 (top) */}
      <line x1="52" y1="44" x2={p1x + 10} y2={p1y}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="47" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₁</text>

      {/* t₂ label — plate 2 (bottom) */}
      <line x1="52" y1="84" x2={p2x + 10} y2={p2y + p2H}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="87" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₂</text>

      {/* w label */}
      <line x1="148" y1="50" x2={weld2x - weldS * 0.4} y2={p2y - weldS * 0.6}
        stroke="#7c3aed" strokeWidth="0.8" />
      <text x="149" y="53" fill="#7c3aed" fontSize="8" fontFamily="JetBrains Mono, monospace">w</text>

      {/* Overlap annotation */}
      <text x="100" y="120" fill="#52525b" fontSize="7" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        Lap · L
      </text>
    </svg>
  );
}
