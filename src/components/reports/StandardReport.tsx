import type { Joint, AnalysisResult } from "../../types";
import type { ReportSettings } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import { formatQty, toDisplay, formatDisplay, unitLabel } from "../../lib/units";

interface Props {
  joint: Joint;
  results: AnalysisResult;
  settings: ReportSettings;
  fatigueResults?: Record<string, import("../../types").FatigueResult>;
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

const sectionHeadStyle: React.CSSProperties = {
  fontSize: "11pt",
  fontWeight: "bold",
  marginBottom: 6,
  marginTop: 0,
  borderBottom: "1pt solid #ccc",
  paddingBottom: 3,
};

export function StandardReport({ joint, results, settings, fatigueResults, className }: Props) {
  const s = results.structural_governing;
  const se = results.structural_elastic;
  const sic = results.structural_ic;
  const m = results.metallurgy;
  const d = results.distortion;
  const p = results.process;
  const geom = joint.geometry as unknown as Record<string, unknown>;
  const system = useProjectStore((st) => st.unitSystem);
  // Engine values are stored in SI; render them in the active unit system.
  const len = (v: unknown) => formatQty(Number(v), "length", system);
  const stress = (v: number) => formatQty(v, "stress", system);
  // Number-only length formatter for columns whose header already carries the unit.
  const dl = (v: number) => formatDisplay(toDisplay(v, "length", system));
  const stressU = unitLabel("stress", system);
  const lenU = unitLabel("length", system);

  const hasCyclic = fatigueResults && Object.keys(fatigueResults).length > 0;

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
        <img src={settings.logoDataUrl} style={{ height: 40, marginBottom: 8 }} alt="logo" />
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
          <div style={{ fontSize: "14pt", fontWeight: "bold" }}>WELD DESIGN REPORT</div>
          <div style={{ fontSize: "9pt" }}>{settings.companyName || "Vulcan Engineering"}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "9pt" }}>
          <div>Project: {settings.projectRef || joint.name}</div>
          <div>Engineer: {settings.engineerName}</div>
          <div>Date: {new Date().toLocaleDateString()}</div>
          <div>Code: AWS D1.1:2020 / AISC 360-22</div>
        </div>
      </div>

      {/* Section 1: Joint Configuration */}
      <p style={sectionHeadStyle}>1. Joint Configuration</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}>
        <thead>
          <tr>
            <th style={thStyle} colSpan={4}>{joint.name}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Type</td>
            <td style={tdStyle}>{joint.type.replace(/_/g, " ").toUpperCase()}</td>
            <td style={tdStyle}>Material</td>
            <td style={tdStyle}>{joint.material.name}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Fy</td>
            <td style={tdStyle}>{stress(joint.material.Fy)}</td>
            <td style={tdStyle}>Fu</td>
            <td style={tdStyle}>{stress(joint.material.Fu)}</td>
          </tr>
          <tr>
            <td style={tdStyle}>F_EXX</td>
            <td style={tdStyle}>{stress(joint.material.F_EXX)}</td>
            <td style={tdStyle}>Code Basis</td>
            <td style={tdStyle}>{joint.service.codeBasis}</td>
          </tr>
          {geom.webThickness !== undefined && (
            <>
              <tr>
                <td style={tdStyle}>Web Thickness</td>
                <td style={tdStyle}>{len(geom.webThickness)}</td>
                <td style={tdStyle}>Flange Thickness</td>
                <td style={tdStyle}>{len(geom.flangeThickness)}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Joint Length</td>
                <td style={tdStyle}>{len(geom.jointLength)}</td>
                <td style={tdStyle}>Weld Size</td>
                <td style={tdStyle}>{len(geom.weldSize)}</td>
              </tr>
            </>
          )}
          {geom.plate1Thickness !== undefined && (
            <tr>
              <td style={tdStyle}>Plate 1</td>
              <td style={tdStyle}>{len(geom.plate1Thickness)}</td>
              <td style={tdStyle}>Plate 2</td>
              <td style={tdStyle}>{len(geom.plate2Thickness)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Section 2: Structural Analysis */}
      <p style={sectionHeadStyle}>2. Structural Analysis</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}>
        <thead>
          <tr>
            <th style={thStyle}>Parameter</th>
            <th style={thStyle}>Elastic (TWL)</th>
            {sic && <th style={thStyle}>IC Method</th>}
            <th style={thStyle}>Governing</th>
          </tr>
        </thead>
        <tbody>
          {(
            [
              ["Method", "method", "raw"],
              [`Direct Shear f_v (${stressU})`, "f_v", "stress"],
              [`Torsion f_t (${stressU})`, "f_t", "stress"],
              [`Bending f_b (${stressU})`, "f_b", "stress"],
              [`Resultant f_R (${stressU})`, "f_R", "stress"],
              [`Allowable F_w (${stressU})`, "F_w_allow", "stress"],
              ["Utilization (%)", "utilization_pct", "raw"],
              [`Required Size (${lenU})`, "w_required", "length"],
              [`Provided Size (${lenU})`, "w_provided", "length"],
            ] as [string, keyof typeof se, "raw" | "stress" | "length"][]
          ).map(([label, key, kind]) => {
            const fmt = (val: unknown) => {
              if (val === undefined || val === null) return "—";
              if (kind === "raw") return String(val);
              return formatDisplay(toDisplay(Number(val), kind, system));
            };
            return (
              <tr key={key}>
                <td style={tdStyle}>{label}</td>
                <td style={tdStyle}>{fmt(se[key])}</td>
                {sic && <td style={tdStyle}>{fmt(sic[key])}</td>}
                <td style={{ ...tdStyle, fontWeight: "bold" }}>{fmt(s[key])}</td>
              </tr>
            );
          })}
          <tr>
            <td style={tdStyle}>Adequate</td>
            <td style={{ ...tdStyle, color: se.adequate ? "green" : "red" }}>
              {se.adequate ? "PASS ✓" : "FAIL ✗"}
            </td>
            {sic && (
              <td style={{ ...tdStyle, color: sic.adequate ? "green" : "red" }}>
                {sic.adequate ? "PASS ✓" : "FAIL ✗"}
              </td>
            )}
            <td style={{ ...tdStyle, fontWeight: "bold", color: s.adequate ? "green" : "red" }}>
              {s.adequate ? "PASS ✓" : "FAIL ✗"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section 3: Validation */}
      <p style={sectionHeadStyle}>3. Code Validation</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}>
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
            <td style={tdStyle}>AWS Min Fillet Size</td>
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
          <tr>
            <td style={tdStyle}>AWS Max Fillet Size</td>
            <td style={tdStyle}>{len(s.w_provided)}</td>
            <td style={tdStyle}>≤ {len(results.validation.w_max_aws)}</td>
            <td
              style={{
                ...tdStyle,
                color: s.w_provided <= results.validation.w_max_aws ? "green" : "red",
              }}
            >
              {s.w_provided <= results.validation.w_max_aws ? "PASS ✓" : "FAIL ✗"}
            </td>
          </tr>
          {results.validation.warnings.map((w, i) => (
            <tr key={i}>
              <td style={tdStyle} colSpan={2}>{w.message}</td>
              <td style={tdStyle}>{w.code_clause}</td>
              <td style={{ ...tdStyle, color: w.severity === "error" ? "red" : w.severity === "warning" ? "orange" : "#666" }}>
                {w.severity.toUpperCase()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section 4: Fatigue */}
      {hasCyclic && (
        <>
          <div className="page-break" />
          <p style={sectionHeadStyle}>4. Fatigue Analysis</p>
          {Object.entries(fatigueResults!).map(([lcId, fat]) => (
            <table
              key={lcId}
              style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}
            >
              <thead>
                <tr>
                  <th style={thStyle} colSpan={2}>Load Case: {lcId}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={tdStyle}>Category</td><td style={tdStyle}>{fat.category}</td></tr>
                <tr><td style={tdStyle}>Description</td><td style={tdStyle}>{fat.category_description}</td></tr>
                <tr><td style={tdStyle}>Stress Range</td><td style={tdStyle}>{fat.stress_range_MPa != null ? stress(fat.stress_range_MPa) : "—"}</td></tr>
                <tr><td style={tdStyle}>Threshold</td><td style={tdStyle}>{stress(fat.threshold_MPa)}</td></tr>
                <tr><td style={tdStyle}>Below Threshold</td><td style={{ ...tdStyle, color: fat.below_threshold ? "green" : "#000" }}>{fat.below_threshold ? "Yes — infinite life" : "No"}</td></tr>
                {fat.cycles_to_failure !== null && (
                  <tr><td style={tdStyle}>Cycles to Failure</td><td style={tdStyle}>{fat.cycles_to_failure?.toExponential(3)}</td></tr>
                )}
                {fat.service_life_years !== null && (
                  <tr><td style={tdStyle}>Service Life</td><td style={tdStyle}>{fat.service_life_years?.toFixed(1)} years</td></tr>
                )}
                <tr>
                  <td style={tdStyle}>Result</td>
                  <td style={{ ...tdStyle, color: fat.passes !== false ? "green" : "red" }}>
                    {fat.passes !== false ? "PASS ✓" : "FAIL ✗"}
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </>
      )}

      {/* Section 5: Metallurgy */}
      {m && (
        <>
          <div className="page-break" />
          <p style={sectionHeadStyle}>5. Metallurgical Analysis</p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}>
            <thead>
              <tr>
                <th style={thStyle} colSpan={4}>Carbon Equivalents</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>CE_IIW</td>
                <td style={tdStyle}>{m.carbon_equivalent.CE_IIW}</td>
                <td style={tdStyle}>Pcm</td>
                <td style={tdStyle}>{m.carbon_equivalent.Pcm}</td>
              </tr>
              <tr>
                <td style={tdStyle}>CET</td>
                <td style={tdStyle}>{m.carbon_equivalent.CET}</td>
                <td style={tdStyle}>Hydrogen Class</td>
                <td style={tdStyle}>{m.hydrogen_class}</td>
              </tr>
            </tbody>
          </table>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}>
            <thead>
              <tr><th style={thStyle} colSpan={4}>Preheat Requirements</th></tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>AWS D1.1 Table 5.8</td>
                <td style={tdStyle}>{m.preheat.aws_table_C}°C</td>
                <td style={tdStyle}>Yurioka Method</td>
                <td style={tdStyle}>{m.preheat.yurioka_C}°C</td>
              </tr>
              <tr>
                <td style={tdStyle}>Governing</td>
                <td style={tdStyle}>{m.preheat.required_C}°C ({m.preheat.method_governing})</td>
                <td style={tdStyle}>PWHT</td>
                <td style={tdStyle}>{m.pwht_required ? "REQUIRED" : "Not required"}</td>
              </tr>
            </tbody>
          </table>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}>
            <thead>
              <tr><th style={thStyle} colSpan={4}>Heat Input &amp; Cooling</th></tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Min Heat Input</td>
                <td style={tdStyle}>{m.heat_input.min_kJ_per_mm} kJ/mm</td>
                <td style={tdStyle}>Max Heat Input</td>
                <td style={tdStyle}>{m.heat_input.max_kJ_per_mm} kJ/mm</td>
              </tr>
              <tr>
                <td style={tdStyle}>Cooling Time t₈/₅</td>
                <td style={tdStyle}>{m.cooling_time_t85.value_s} s ({m.cooling_time_t85.regime})</td>
                <td style={tdStyle}>Recommended Range</td>
                <td style={tdStyle}>{m.cooling_time_t85.recommended_range_s[0]}–{m.cooling_time_t85.recommended_range_s[1]} s</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Section 6: Distortion */}
      {d && (
        <>
          <p style={sectionHeadStyle}>6. Distortion Prediction</p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Min</th>
                <th style={thStyle}>Expected</th>
                <th style={thStyle}>Max</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Angular (°)</td>
                <td style={tdStyle}>{d.angular_deg.min}</td>
                <td style={tdStyle}>{d.angular_deg.expected}</td>
                <td style={tdStyle}>{d.angular_deg.max}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Transverse Shrinkage ({lenU})</td>
                <td style={tdStyle}>{dl(d.transverse_shrinkage_mm.min)}</td>
                <td style={tdStyle}>{dl(d.transverse_shrinkage_mm.expected)}</td>
                <td style={tdStyle}>{dl(d.transverse_shrinkage_mm.max)}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Longitudinal Shrinkage ({lenU})</td>
                <td style={tdStyle}>{dl(d.longitudinal_shrinkage_mm.min)}</td>
                <td style={tdStyle}>{dl(d.longitudinal_shrinkage_mm.expected)}</td>
                <td style={tdStyle}>{dl(d.longitudinal_shrinkage_mm.max)}</td>
              </tr>
            </tbody>
          </table>
          {d.mitigations.length > 0 && (
            <div style={{ fontSize: "9pt", marginBottom: 12 }}>
              <strong>Mitigations: </strong>
              {d.mitigations.join("; ")}
            </div>
          )}
        </>
      )}

      {/* Section 7: Process */}
      {p && (
        <>
          <p style={sectionHeadStyle}>7. Process Selection</p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "9pt" }}>
            <thead>
              <tr>
                <th style={thStyle}>Rank</th>
                <th style={thStyle}>Process</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {p.ranked_processes.slice(0, 5).map((rp, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{rp.process}</td>
                  <td style={tdStyle}>{rp.score}</td>
                  <td style={tdStyle}>{rp.rationale.slice(0, 3).join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: "9pt", marginBottom: 8 }}>
            <strong>Recommended: </strong>{p.primary} — Filler: {p.filler.classification} ({p.filler.comment})
          </div>
        </>
      )}

      {/* AWS Symbol */}
      <div style={{ fontSize: "9pt", marginBottom: 8 }}>
        <strong>AWS Symbol: </strong>{results.symbol.notation}
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
        References: AWS D1.1:2020 Clauses 2.4, 2.4.5, Table 5.7, Table 5.8, Annex K · AISC 360-22
        Section J2 · IIW Doc IIW-1823-07 · Yurioka et al. (1983) · Lesik &amp; Kennedy (1990) ·
        Masubuchi (1980)
      </div>
    </div>
  );
}
