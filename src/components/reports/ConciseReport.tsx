import type { Joint, AnalysisResult } from "../../types";
import type { ReportSettings } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import { formatQty } from "../../lib/units";

interface Props {
  joint: Joint;
  results: AnalysisResult;
  settings: ReportSettings;
  className?: string;
}

const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "3px 6px",
};

const thStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "3px 6px",
  textAlign: "left",
  background: "#f0f0f0",
};

export function ConciseReport({ joint, results, settings, className }: Props) {
  const s = results.structural_governing;
  const geom = joint.geometry as unknown as Record<string, unknown>;
  const system = useProjectStore((st) => st.unitSystem);
  // All engine values are stored in SI; render them in the active unit system.
  const len = (v: unknown) => formatQty(Number(v), "length", system);
  const stress = (v: number) => formatQty(v, "stress", system);

  return (
    <div
      className={`report-output ${className ?? ""}`}
      style={{
        display: "none",
        fontFamily: "Arial, sans-serif",
        fontSize: "10pt",
        color: "#000",
        background: "#fff",
      }}
    >
      {/* Letterhead */}
      {settings.logoDataUrl && (
        <img
          src={settings.logoDataUrl}
          style={{ height: 40, marginBottom: 8 }}
          alt="logo"
        />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "2pt solid #000",
          paddingBottom: 6,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: "14pt", fontWeight: "bold" }}>WELD DESIGN SUMMARY</div>
          <div>{settings.companyName || "Vulcan Engineering"}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "9pt" }}>
          <div>Project: {settings.projectRef || joint.name}</div>
          <div>Engineer: {settings.engineerName}</div>
          <div>Date: {new Date().toLocaleDateString()}</div>
          <div>Code: AWS D1.1:2020 / AISC 360-22</div>
        </div>
      </div>

      {/* Joint configuration */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "9pt" }}>
        <thead>
          <tr>
            <th style={thStyle} colSpan={4}>
              Joint Configuration — {joint.name}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Type</td>
            <td style={tdStyle}>{joint.type.replace("_", " ").toUpperCase()}</td>
            <td style={tdStyle}>Material</td>
            <td style={tdStyle}>{joint.material.name}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Fy</td>
            <td style={tdStyle}>{stress(joint.material.Fy)}</td>
            <td style={tdStyle}>Fu</td>
            <td style={tdStyle}>{stress(joint.material.Fu)}</td>
          </tr>
          {geom.webThickness !== undefined && (
            <tr>
              <td style={tdStyle}>Web Thickness</td>
              <td style={tdStyle}>{len(geom.webThickness)}</td>
              <td style={tdStyle}>Flange Thickness</td>
              <td style={tdStyle}>{len(geom.flangeThickness)}</td>
            </tr>
          )}
          {geom.plate1Thickness !== undefined && (
            <tr>
              <td style={tdStyle}>Plate 1 Thickness</td>
              <td style={tdStyle}>{len(geom.plate1Thickness)}</td>
              <td style={tdStyle}>Plate 2 Thickness</td>
              <td style={tdStyle}>{len(geom.plate2Thickness)}</td>
            </tr>
          )}
          {geom.jointLength !== undefined && (
            <tr>
              <td style={tdStyle}>Joint Length</td>
              <td style={tdStyle}>{len(geom.jointLength)}</td>
              <td style={tdStyle}>Weld Size</td>
              <td style={tdStyle}>{geom.weldSize !== undefined ? len(geom.weldSize) : "—"}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Recommendation block */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "9pt" }}>
        <thead>
          <tr>
            <th style={thStyle} colSpan={4}>
              Weld Recommendation
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Weld Type</td>
            <td style={tdStyle}>{s.method}</td>
            <td style={tdStyle}>Required Size</td>
            <td style={tdStyle}>{len(s.w_required)}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Process</td>
            <td style={tdStyle}>{results.process?.primary ?? "—"}</td>
            <td style={tdStyle}>Filler</td>
            <td style={tdStyle}>{results.process?.filler.classification ?? "—"}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Preheat</td>
            <td style={tdStyle}>{results.metallurgy?.preheat.required_C ?? "—"}°C</td>
            <td style={tdStyle}>PWHT</td>
            <td style={tdStyle}>
              {results.metallurgy?.pwht_required ? "Required" : "Not required"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Pass/fail summary */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: "9pt" }}>
        <thead>
          <tr>
            <th style={thStyle}>Check</th>
            <th style={thStyle}>Value</th>
            <th style={thStyle}>Limit</th>
            <th style={thStyle}>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Weld Utilization</td>
            <td style={tdStyle}>{s.utilization_pct}%</td>
            <td style={tdStyle}>≤ 100%</td>
            <td style={{ ...tdStyle, color: s.utilization_pct <= 100 ? "green" : "red" }}>
              {s.utilization_pct <= 100 ? "PASS ✓" : "FAIL ✗"}
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>AWS Min Size</td>
            <td style={tdStyle}>{len(s.w_provided)}</td>
            <td style={tdStyle}>≥ {len(results.validation.w_min_aws)}</td>
            <td
              style={{
                ...tdStyle,
                color: s.w_provided >= results.validation.w_min_aws ? "green" : "red",
              }}
            >
              {s.w_provided >= results.validation.w_min_aws ? "PASS ✓" : "FAIL ✗"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* AWS Symbol notation */}
      <div style={{ fontSize: "9pt", marginBottom: 8 }}>
        <strong>AWS Symbol: </strong>
        {results.symbol.notation}
      </div>

      {/* Code references footer */}
      <div
        style={{
          borderTop: "1pt solid #ccc",
          marginTop: 16,
          paddingTop: 6,
          fontSize: "8pt",
          color: "#666",
        }}
      >
        References: AWS D1.1:2020 Clauses 2.4, 2.4.5, Table 5.7 · AISC 360-22 Section J2 ·
        Calculated per elastic TWL method
      </div>
    </div>
  );
}
