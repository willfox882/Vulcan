import type { Joint, TJointGeometry } from "../../types";

interface Props { joint: Joint; }

export function TJointPreview({ joint }: Props) {
  const g = joint.geometry as TJointGeometry;

  // Fixed layout in 200×130 viewBox — scale only weld triangles
  const webW  = Math.max(Math.min(g.webThickness * 1.5, 28), 8);
  const webH  = 60;
  const flangeH = Math.max(Math.min(g.flangeThickness * 1.2, 20), 6);
  const flangeW = 140;
  const weldS = Math.max(Math.min(g.weldSize * 1.2, 14), 5);

  const cx = 100;
  const flangeTop = 82;
  const webX  = cx - webW / 2;
  const webTop = flangeTop - webH;

  return (
    <svg viewBox="0 0 200 130" width="100%" height="130" style={{ display: "block" }}>
      {/* Flange */}
      <rect x={cx - flangeW / 2} y={flangeTop} width={flangeW} height={flangeH}
        fill="#1c1c1c" stroke="#52525b" strokeWidth="1.2" />
      {/* Web */}
      <rect x={webX} y={webTop} width={webW} height={webH}
        fill="#1c1c1c" stroke="#52525b" strokeWidth="1.2" />
      {/* Left fillet weld */}
      <polygon points={`${webX},${flangeTop} ${webX - weldS},${flangeTop} ${webX},${flangeTop - weldS}`}
        fill="#7c3aed" opacity="0.85" />
      {/* Right fillet weld */}
      <polygon points={`${webX + webW},${flangeTop} ${webX + webW + weldS},${flangeTop} ${webX + webW},${flangeTop - weldS}`}
        fill="#7c3aed" opacity="0.85" />

      {/* t₁ label with leader line to web */}
      <line x1="28" y1="52" x2={webX} y2={webTop + webH * 0.4}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="55" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₁</text>

      {/* t₂ label with leader line to flange */}
      <line x1="28" y1="98" x2={cx - flangeW / 2} y2={flangeTop + flangeH / 2}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y="101" fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t₂</text>

      {/* w label with leader line to right weld */}
      <line x1="158" y1="72" x2={webX + webW + weldS * 0.5} y2={flangeTop - weldS * 0.5}
        stroke="#7c3aed" strokeWidth="0.8" />
      <text x="159" y="75" fill="#7c3aed" fontSize="8" fontFamily="JetBrains Mono, monospace">w</text>

      {/* L dimension arrow along bottom of flange */}
      <line x1={cx - flangeW / 2} y1="108" x2={cx + flangeW / 2} y2="108"
        stroke="#52525b" strokeWidth="0.8" markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x="97" y="120" fill="#71717a" fontSize="7" fontFamily="JetBrains Mono, monospace" textAnchor="middle">L</text>

      <defs>
        <marker id="arr" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4" fill="none" stroke="#52525b" strokeWidth="0.8" />
        </marker>
      </defs>
    </svg>
  );
}
