import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Joint, AnalysisResult } from "../../types";
import type { ReportSettings } from "../../stores/uiStore";

export async function generateCalculationSheet(
  joint: Joint,
  results: AnalysisResult,
  settings: ReportSettings
): Promise<void> {
  // Find or create the render target div
  let el = document.getElementById("calc-sheet-render");
  if (!el) {
    el = document.createElement("div");
    el.id = "calc-sheet-render";
    el.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:794px;background:white;padding:40px;font-family:Arial,sans-serif;font-size:10pt;color:#000;";
    document.body.appendChild(el);
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pdfW = pdf.internal.pageSize.getWidth() - 30; // 30 mm margins
  let firstPage = true;

  async function renderAndAddPage(html: string) {
    el!.innerHTML = html;
    await new Promise<void>((r) => setTimeout(r, 50));
    const canvas = await html2canvas(el!, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const imgData = canvas.toDataURL("image/png");
    if (!firstPage) pdf.addPage();
    firstPage = false;
    const imgProps = pdf.getImageProperties(imgData);
    const imgH = (imgProps.height * pdfW) / imgProps.width;
    pdf.addImage(imgData, "PNG", 15, 15, pdfW, Math.min(imgH, 257));
  }

  const geom = joint.geometry as unknown as Record<string, unknown>;
  const t1 = (geom.webThickness ?? geom.plate1Thickness ?? 12) as number;
  const t2 = (geom.flangeThickness ?? geom.plate2Thickness ?? 16) as number;
  const L = (geom.jointLength ?? 200) as number;
  const w = (geom.weldSize ?? 8) as number;
  const s = results.structural_governing;

  // Page 1: Header + Joint Configuration
  await renderAndAddPage(`
    <div style="border-bottom:2pt solid black;padding-bottom:8px;margin-bottom:16px;">
      <div style="font-size:14pt;font-weight:bold;">WELD CALCULATION SHEET</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;">
        <div>${settings.companyName || "Vulcan Engineering"}</div>
        <div style="text-align:right;font-size:9pt;">
          Joint: ${joint.name}<br>
          Engineer: ${settings.engineerName || "—"}<br>
          Date: ${new Date().toLocaleDateString()}<br>
          Code: AWS D1.1:2020 / AISC 360-22
        </div>
      </div>
    </div>
    <div style="font-weight:bold;margin-bottom:4px;">JOINT CONFIGURATION</div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:12px;">
      <tr>
        <td style="border:1px solid #ccc;padding:3px 6px;">Type</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">${joint.type.replace(/_/g, " ")}</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">Material</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">${joint.material.name}</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc;padding:3px 6px;">Thickness (t&#x2081;)</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">${t1} mm</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">Thickness (t&#x2082;)</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">${t2} mm</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc;padding:3px 6px;">Joint Length</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">${L} mm</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">Weld Size</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">${w} mm</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc;padding:3px 6px;">Fy</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">${joint.material.Fy} MPa</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">F_EXX</td>
        <td style="border:1px solid #ccc;padding:3px 6px;">${joint.material.F_EXX} MPa</td>
      </tr>
    </table>
  `);

  // Page 2: Structural calculation walkthrough
  const L_total = s.L_total ?? 2 * L;
  const I_ux = s.I_ux ?? 0;
  const J_u = s.J_u ?? 0;
  const a = (0.707 * w).toFixed(2);

  await renderAndAddPage(`
    <div style="font-weight:bold;margin-bottom:8px;">STRUCTURAL ANALYSIS — ${s.method}</div>
    <div style="font-family:monospace;font-size:9pt;line-height:1.8;">
      <b>Weld Group Properties (Treating Weld as Line)</b><br>
      Total weld length:  L_total = 2L = ${L_total} mm<br>
      Effective throat:   a = 0.707 &times; ${w} = ${a} mm<br><br>

      <b>Linear Unit Moments of Inertia</b><br>
      I_ux = 2 &middot; L &middot; (t&#x2081;/2)&sup2; = 2(${L})(${t1 / 2})&sup2; = ${I_ux.toFixed(0)} mm&sup3;<br>
      I_uy = 2 &middot; L&sup3;/12 = 2(${L})&sup3;/12 = ${((2 * L * L * L) / 12).toFixed(0)} mm&sup3;<br>
      J_u  = I_ux + I_uy = ${J_u.toFixed(0)} mm&sup3;<br><br>

      <b>Stress Components</b><br>
      Direct shear:   f_v = ${s.f_v} MPa<br>
      Torsion:        f_t = ${s.f_t} MPa<br>
      Bending:        f_b = ${s.f_b} MPa<br>
      Resultant:      f_R = &radic;(f_v&sup2; + f_t&sup2; + f_b&sup2;) &asymp; ${s.f_R} MPa<br><br>

      <b>Allowable Stress (${joint.service.codeBasis})</b><br>
      F_w = ${joint.service.codeBasis === "ASD" ? "0.30" : "0.45"} &times; F_EXX
          = ${joint.service.codeBasis === "ASD" ? "0.30" : "0.45"} &times; ${joint.material.F_EXX}
          = ${s.F_w_allow} MPa<br><br>

      <b>Utilization</b><br>
      U = f_R / F_w = ${s.f_R} / ${s.F_w_allow} = ${s.utilization_pct}%
          ${s.utilization_pct <= 100 ? "&#10003; PASS" : "&#10007; FAIL"}<br><br>

      <b>Required Leg Size</b><br>
      w_req  = ${s.w_required} mm<br>
      w_prov = ${s.w_provided} mm
               ${s.w_provided >= s.w_required ? "&#10003; ADEQUATE" : "&#10007; INADEQUATE"}<br>
    </div>
  `);

  // Page 3: Metallurgy (if available)
  if (results.metallurgy) {
    const m = results.metallurgy;
    const ce = m.carbon_equivalent;
    await renderAndAddPage(`
      <div style="font-weight:bold;margin-bottom:8px;">METALLURGICAL ANALYSIS</div>
      <div style="font-family:monospace;font-size:9pt;line-height:1.8;">
        <b>Carbon Equivalents</b><br>
        CE_IIW = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15 = ${ce.CE_IIW}<br>
        Pcm    = C + Si/30 + Mn/20 + Cu/20 + Ni/60 + Cr/20 + Mo/15 + V/10 + 5B = ${ce.Pcm}<br>
        CET    = C + (Mn+Mo)/10 + (Cr+Cu)/20 + Ni/40 = ${ce.CET}<br><br>

        <b>Preheat Requirements</b><br>
        AWS D1.1 Table 5.8: T_p = ${m.preheat.aws_table_C}&#176;C<br>
        Yurioka method:     T_p = ${m.preheat.yurioka_C}&#176;C<br>
        Governing:          T_p = ${m.preheat.required_C}&#176;C  (${m.preheat.method_governing})<br><br>

        <b>Heat Input &amp; Cooling</b><br>
        Recommended heat input: ${m.heat_input.min_kJ_per_mm}&#8211;${m.heat_input.max_kJ_per_mm} kJ/mm<br>
        Cooling time t&#8328;&#8327;&#8325;: ${m.cooling_time_t85.value_s} s  (${m.cooling_time_t85.regime})<br>
        Recommended range: ${m.cooling_time_t85.recommended_range_s[0]}&#8211;${m.cooling_time_t85.recommended_range_s[1]} s<br><br>

        <b>Other Requirements</b><br>
        PWHT: ${m.pwht_required ? "REQUIRED — see AWS D1.1 Clause 4.4" : "Not required"}<br>
        Hydrogen class: ${m.hydrogen_class}<br>
      </div>
    `);
  }

  // Last page: Code References
  await renderAndAddPage(`
    <div style="font-weight:bold;margin-bottom:8px;">CODE REFERENCES</div>
    <div style="font-size:9pt;line-height:2.0;">
      AWS D1.1:2020 Clause 2.4    — Effective area of welds<br>
      AWS D1.1:2020 Table 5.7     — Minimum fillet weld size by base metal thickness<br>
      AWS D1.1:2020 Clause 2.4.5  — Maximum fillet weld size along edges<br>
      AWS D1.1:2020 Table 5.8     — Preheat and interpass temperature<br>
      AWS D1.1:2020 Annex K       — Fatigue design provisions<br>
      AISC 360-22 Section J2.4    — Design strength of welds<br>
      AISC 360-22 Eq. J2-5        — Direction-of-loading multiplier<br>
      IIW Doc IIW-1823-07         — Carbon equivalent (CE_IIW)<br>
      Yurioka et al. (1983)       — Preheat prediction formula (CET method)<br>
      Lesik &amp; Kennedy (1990)  — Load-deformation curve for IC method<br>
      Masubuchi (1980)            — Distortion prediction correlations<br>
    </div>
    <div style="margin-top:24px;border-top:1pt solid #ccc;padding-top:8px;font-size:8pt;color:#666;">
      Generated by Vulcan Welded Joint Calculator &middot; ${new Date().toLocaleDateString()} &middot;
      Results are engineering estimates. Verify against applicable codes and standards before fabrication.
    </div>
  `);

  pdf.save(`${joint.name.replace(/\s+/g, "_")}_calculation_sheet.pdf`);
}
