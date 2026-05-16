import type { Joint, CruciformJointGeometry } from "../../types";

interface Props { joint: Joint; }

export function CruciformJointPreview({ joint }: Props) {
  const g = joint.geometry as CruciformJointGeometry;

  const cx = 100;
  const flangeW = 130;
  // Clamp flange and web display sizes
  const flangeH = Math.max(Math.min(g.flangeThickness * 1.2, 16), 5);
  const webW    = Math.max(Math.min(g.webThickness  * 1.5, 22), 7);
  const weldS   = Math.max(Math.min(g.weldSize      * 1.2, 11), 4);

  // Dynamic layout: fit both flanges and web within viewBox height 160
  const viewBoxH = 160;
  const padTop  = 8;
  const padBot  = 18;  // room for footer label
  const webH    = Math.max(viewBoxH - 2 * flangeH - padTop - padBot, 60);

  const flangeTopY = padTop;
  const webY       = flangeTopY + flangeH;
  const flangeBotY = webY + webH;
  const webX       = cx - webW / 2;
  const labelY     = flangeBotY + flangeH + 12;

  return (
    <svg viewBox={`0 0 200 ${viewBoxH}`} width="100%" height={viewBoxH} style={{ display: "block" }}>
      {/* Top flange */}
      <rect x={cx - flangeW / 2} y={flangeTopY} width={flangeW} height={flangeH}
        fill="#252525" stroke="#52525b" strokeWidth="1.2" />
      {/* Bottom flange — same rect width/height as top */}
      <rect x={cx - flangeW / 2} y={flangeBotY} width={flangeW} height={flangeH}
        fill="#252525" stroke="#52525b" strokeWidth="1.2" />
      {/* Web */}
      <rect x={webX} y={webY} width={webW} height={webH}
        fill="#1c1c1c" stroke="#52525b" strokeWidth="1.2" />

      {/* Top-left weld */}
      <polygon points={`${webX},${webY} ${webX - weldS},${webY} ${webX},${webY + weldS}`}
        fill="#7c3aed" opacity="0.85" />
      {/* Top-right weld */}
      <polygon points={`${webX + webW},${webY} ${webX + webW + weldS},${webY} ${webX + webW},${webY + weldS}`}
        fill="#7c3aed" opacity="0.85" />
      {/* Bottom-left weld */}
      <polygon points={`${webX},${flangeBotY} ${webX - weldS},${flangeBotY} ${webX},${flangeBotY - weldS}`}
        fill="#7c3aed" opacity="0.85" />
      {/* Bottom-right weld */}
      <polygon points={`${webX + webW},${flangeBotY} ${webX + webW + weldS},${flangeBotY} ${webX + webW},${flangeBotY - weldS}`}
        fill="#7c3aed" opacity="0.85" />

      {/* t_f label — top flange */}
      <line x1="33" y1={flangeTopY + flangeH / 2 + 2} x2={cx - flangeW / 2 + 4} y2={flangeTopY + flangeH / 2}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y={flangeTopY + flangeH / 2 + 5} fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t_f</text>

      {/* t_w label — web */}
      <line x1="33" y1={webY + webH / 2} x2={webX} y2={webY + webH / 2}
        stroke="#52525b" strokeWidth="0.8" />
      <text x="4" y={webY + webH / 2 + 3} fill="#71717a" fontSize="8" fontFamily="JetBrains Mono, monospace">t_w</text>

      {/* w label — top-right weld */}
      <line x1="148" y1={webY + weldS * 0.4 + 2} x2={webX + webW + weldS * 0.4} y2={webY + weldS * 0.4}
        stroke="#7c3aed" strokeWidth="0.8" />
      <text x="149" y={webY + weldS * 0.4 + 5} fill="#7c3aed" fontSize="8" fontFamily="JetBrains Mono, monospace">w</text>

      {/* Footer */}
      <text x="100" y={labelY} fill="#52525b" fontSize="7" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        L · 4 welds
      </text>
    </svg>
  );
}
