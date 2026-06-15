# VULCAN — Progress

## Post-ship Audit Cycle: COMPLETE (2026-06-14)

A full adversarial audit of the shipped v1.0 found defects that the prior
"Pass (logic)" smoke checks missed because the engines had only ever been
exercised directly in CPython — never across the real browser data path
(JSON transport, the unit toggle, the `Fx` input). All Critical/High/Medium
items, plus the Low-tier cleanups, are fixed, tested, and pushed.

| ID | Sev | Fix |
|----|-----|-----|
| C1 | Critical | JSON transport now survives non-finite floats (`inf`/`nan`) — fatigue infinite-life no longer crashes the engine call. Sentinel encode + `JSON.parse` reviver in `pyodide.ts`. |
| H1 | High | SI/US toggle now actually converts input values (was relabel-only); shared `NumericField` + `toDisplay/fromDisplay` in `units.ts`. Result panels also display active units. |
| H2 | High | `Fx` (along-weld longitudinal shear) was ignored by every engine (false ADEQUATE); now included in all fillet groups. |
| H3 | High | Butt CJP combined axial+bending by SRSS (unconservative); now algebraic sum, with `Fz` shear via von Mises. |
| H4 | High | Test suite was uncollectable on Windows (cp1252 vs UTF-8); fixed encoding. |
| M1 | Med | Fatigue Category F constant was unit/slope-inconsistent; corrected to AISC Eq. A-3-2 (m=6, MPa-consistent `Cf=1.61e17`). |
| M2 | Med | IC method now uses the full Lesik-Kennedy curve (directional factor + angle-dependent Δ_ult). |
| M3 | Med | `.vulcan` load now validates shape, migrates null-safely, and surfaces errors to the user. |
| M4 | Med | Fatigue load direction is user-selectable (was hardcoded "transverse"). |
| M5 | Med | T-joint engine uses `.get` defaults (was raw `KeyError`). |
| L1–L6 | Low | `Fz` in butt (via H3); dead-code removal; governing-rule docs; Pyodide offline messaging; results-panel units; docs accuracy. |

**Verification:** `python -m pytest public/python/tests/` → 36 passed (was
uncollectable on Windows). `npx tsc --noEmit` clean. `npm run build` clean.
TS conversion/validation logic verified via esbuild+Node. Each fix shipped
with a regression test.

---

## Phase 1: COMPLETE (2026-05-06)
## Phase 2: COMPLETE (2026-05-06)
## Phase 3: COMPLETE (2026-05-07)

---

## Phase 1 Scope — T-Joint Fillet Weld Calculator

### Deliverables

| Item | Status |
|------|--------|
| Vite + React 18 + TypeScript scaffold | Done |
| Tailwind CSS v4 via `@tailwindcss/vite` | Done |
| Zustand state stores (pyodide, project, results, ui) | Done |
| Pyodide 0.26 loader with progress overlay | Done |
| Python engine: `classifier.py` | Done |
| Python engine: `structural.py` (Elastic TWL method) | Done |
| Python engine: `symbol.py` (SVG weld symbol) | Done |
| Reference data JSON (AWS D1.1, AISC 360, materials, electrodes) | Done |
| Joint editor (Geometry, Material, Load, Service panels) | Done |
| T-Joint SVG preview | Done |
| Results panel (structural, weld symbol, code checks) | Done |
| Project sidebar (joint list, add joint) | Done |
| Save / Open `.vulcan` files | Done |
| Keyboard shortcuts (Ctrl+S, Ctrl+O) | Done |
| Unit system toggle (SI / Imperial) | Done |
| ASD / LRFD code basis toggle | Done |
| AWS D1.1 Table 5.7 min/max weld size checks | Done |
| Python unit tests (`test_structural.py`) | Done |
| Example project file | Done |
| Vercel deployment config | Done |

---

## Phase 2 Scope — Additional Joint Types + IC Method + Fatigue

### Deliverables

| Item | Status |
|------|--------|
| `aws_d11_annex_k.json` — S-N category data (A through F) | Done |
| `types.ts` — discriminated union geometry types (T/Lap/Butt/Corner) | Done |
| `types.ts` — discriminated union load case types (Static/Cyclic/Spectrum) | Done |
| `types.ts` — Phase 2 `AnalysisResult` (elastic + IC + governing + fatigue) | Done |
| `projectStore.ts` — migrated to `loadCases: LoadCaseItem[]` | Done |
| `fileIO.ts` — v1.0 → v1.1 migration (loads → loadCases, geometry type tag) | Done |
| `structural.py` — IC Method (`scipy.optimize.minimize`, Lesik-Kennedy curve) | Done |
| `structural.py` — Lap joint (Elastic TWL + IC) | Done |
| `structural.py` — Butt joint (CJP/PJP groove weld analysis) | Done |
| `structural.py` — Corner joint (Elastic TWL + IC) | Done |
| `fatigue.py` — constant amplitude S-N life calculation | Done |
| `fatigue.py` — variable amplitude (Miner's rule, equivalent stress range) | Done |
| `fatigue.py` — service life, safety factor, pass/fail | Done |
| `JointTypeSelector.tsx` — Lap/Butt/Corner clickable (Phase 3 disabled) | Done |
| `GeometryPanel.tsx` — dispatches to type-specific sub-panel | Done |
| `geometry/TJointGeometryPanel.tsx` | Done |
| `geometry/LapJointGeometryPanel.tsx` | Done |
| `geometry/ButtJointGeometryPanel.tsx` | Done |
| `geometry/CornerJointGeometryPanel.tsx` | Done |
| `LoadPanel.tsx` — multi load case cards (Static/Cyclic/Spectrum) | Done |
| `JointPreview.tsx` — dispatcher to type-specific SVG preview | Done |
| `LapJointPreview.tsx`, `ButtJointPreview.tsx`, `CornerJointPreview.tsx` | Done |
| `MethodComparison.tsx` — side-by-side Elastic vs IC result card | Done |
| `FatigueResults.tsx` — fatigue result card with pass/fail | Done |
| `StructuralResults.tsx` — updated for `structural_governing` result shape | Done |
| `ResultsPanel.tsx` — drives fatigue engine for cyclic/spectrum load cases | Done |
| `resultsStore.ts` — added `fatigueResults` per joint per load case | Done |
| Python tests — 17 tests, 17 pass | Done |
| `npm run build` — TypeScript clean, 0 errors | Done |

### Build Status (Phase 2)

- `npx tsc --noEmit`: 0 errors
- `npm run build`: clean, 366 kB bundle
- Python pytest: 17/17 pass

---

---

## Phase 3 Scope — Process / Metallurgy / Distortion

### Deliverables

| Item | Status |
|------|--------|
| `aws_d11_table_5_8.json` — preheat categories I–IV | Done |
| `filler_match.json` — override table (empty, fallback handles defaults) | Done |
| `materials_stainless.json` — SS304L, SS316L, SS2205 | Done |
| `materials_aluminum.json` — 5083-H321, 6061-T6, 6063-T5 | Done |
| `materials_steel.json` — updated with `type`, `chemistry`, `F_EXX`, categories | Done |
| `process.py` — decision-matrix process selector (GTAW/GMAW/FCAW/SMAW/SAW) | Done |
| `process.py` — `_select_filler()` by material type, process, and quality level | Done |
| `metallurgy.py` — CE_IIW, Pcm, CET carbon equivalents | Done |
| `metallurgy.py` — AWS Table 5.8 + Yurioka preheat, governing method | Done |
| `metallurgy.py` — heat input range per material type and thickness | Done |
| `metallurgy.py` — t₈/₅ cooling time, 2D/3D Rosenthal regime | Done |
| `metallurgy.py` — PWHT flag, hydrogen class | Done |
| `distortion.py` — angular distortion (Masubuchi model) | Done |
| `distortion.py` — transverse and longitudinal shrinkage | Done |
| `distortion.py` — mitigation list, butt-joint note | Done |
| `pyodide.ts` — 4 new data files + 3 new engines loaded | Done |
| `types.ts` — `Material.type` required, `chemistry`, `requires_pwht`, `aws_table_5_8_category` | Done |
| `types.ts` — `ServiceConditions` + 4 new fields (position, environment, productionVolume, qualityLevel) | Done |
| `types.ts` — `ProcessResult`, `MetallurgyResult`, `DistortionResult` interfaces | Done |
| `types.ts` — `AnalysisResult` extended with process/metallurgy/distortion (nullable) | Done |
| `projectStore.ts` — default service includes new Phase 3 fields, material.type = "carbon_steel" | Done |
| `projectStore.ts` — project version bumped to 1.2 | Done |
| `fileIO.ts` — v1.0→v1.1→v1.2 migration (adds missing service/material fields) | Done |
| `resultsStore.ts` — processResults, metallurgyResults, distortionResults per joint | Done |
| `ServicePanel.tsx` — welding position, environment, production volume, quality level dropdowns | Done |
| `MaterialPanel.tsx` — grouped optgroup dropdown (Carbon Steel / Stainless / Aluminum) | Done |
| `MaterialPanel.tsx` — type badge, PWHT warning, AWS category display | Done |
| `ProcessResults.tsx` — ranked process card with filler and rationale | Done |
| `MetallurgyResults.tsx` — CE table, preheat, heat input, t₈/₅, PWHT warning | Done |
| `DistortionResults.tsx` — angular/transverse/longitudinal ranges, mitigations | Done |
| `ResultsPanel.tsx` — calls 3 new engines, renders 3 new result cards | Done |
| `npx tsc --noEmit` — 0 errors | Done |
| `npm run build` — clean, 376 kB bundle | Done |

### Build Status (Phase 3)

- `npx tsc --noEmit`: 0 errors
- `npm run build`: clean, 376 kB bundle (gzip 113 kB)

### Smoke Test Results (Phase 3)

| # | Test | Result |
|---|------|--------|
| 1 | `npm run build` — TypeScript clean, 0 errors | Pass |
| 2 | Default A36 T-joint → ProcessResults card shows GMAW/FCAW ranked | Pass (logic) |
| 3 | A36 → CE_IIW=0.40, Pcm~0.23, preheat Category I lookup | Pass (logic) |
| 4 | A514 → PWHT required flag, CE>0.65, Category III preheat | Pass (logic) |
| 5 | Aluminum → GTAW top ranked, CE=0 displayed, no preheat | Pass (logic) |
| 6 | Outdoor field environment → SMAW promoted, GMAW penalized | Pass (logic) |
| 7 | Material dropdown groups steel/stainless/aluminum correctly | Pass |
| 8 | ServicePanel position/environment/volume/quality dropdowns render | Pass |
| 9 | v1.1 .vulcan file loaded → migrated to v1.2 with default service fields | Pass (logic) |

### Known Limitations (Phase 3)

- Distortion model is empirical (Masubuchi/Watanabe-Satoh); ±50% range is conservative — actual values depend heavily on fixturing and sequence
- t₈/₅ Rosenthal model uses simplified 2D/3D regime switch; multi-pass welds not modeled
- CE formulas use nominal chemistry from JSON; actual heat chemistry may vary
- No hydrogen content correction for low-H electrode variants in metallurgy engine
- Preheat Pcm formula is approximate (ISO 13916 simple form, not full iterative)

---

## Phase 4: COMPLETE (2026-05-07)

### Deliverables

| Item | Status |
|------|--------|
| `symbol.py` — full AWS A2.4 rewrite: fillet, square groove, V-groove, bevel, J-groove, U-groove, plug/slot, surfacing | Done |
| `symbol.py` — supplementary symbols: all-around circle, field weld flag, tail, contour (flush/convex/concave), finish letter | Done |
| `symbol.py` — intermittent weld length-pitch annotation | Done |
| `symbol.py` — `generate_symbol_svg()` primary function + `generate_weld_symbol_svg()` backward-compat alias | Done |
| `types.ts` — `SymbolResult` extended: `weld_type`, `all_around`, `field_weld`, `tail`, `groove_angle`, `root_opening`, `contour`, `finish`, `length`, `pitch` | Done |
| `uiStore.ts` — `reportSettings` state (companyName, engineerName, projectRef, logoDataUrl) + `setReportSettings` | Done |
| `src/styles/globals.css` — `@media print` rules with `.report-output`, `.page-break`, `.no-print` | Done |
| `npm install jspdf html2canvas` | Done |
| `WeldSymbolPreview.tsx` — calls `generate_symbol_svg` with all new params | Done |
| `reports/ReportSettings.tsx` — modal with company, engineer, project ref, logo upload | Done |
| `reports/ConciseReport.tsx` — A4 print-ready summary: letterhead, joint config, weld recommendation, pass/fail checks, AWS symbol notation | Done |
| `reports/StandardReport.tsx` — extended report: all engine sections, fatigue, metallurgy, distortion, process ranking | Done |
| `reports/CalculationSheet.ts` — jsPDF multi-page: header, structural walkthrough with formulas, metallurgy page, code references | Done |
| `reports/ReportToolbar.tsx` — Concise / Standard / Calc Sheet buttons + settings gear | Done |
| `ResultsPanel.tsx` — toolbar above scroll area, hidden `<ConciseReport>` + `<StandardReport>` in DOM | Done |
| `npx tsc --noEmit` — 0 errors | Done |
| `npm run build` — clean build | Done |

### Build Status (Phase 4)

- `npx tsc --noEmit`: 0 errors
- `npm run build`: clean, ~1 MB bundle (gzip 297 kB) — jsPDF + html2canvas account for ~600 kB raw

### Smoke Test Results (Phase 4)

| # | Test | Result |
|---|------|--------|
| 1 | `npm run build` — TypeScript clean, 0 errors | Pass |
| 2 | `generate_symbol_svg` fillet both-sides → valid SVG with two triangles | Pass (logic) |
| 3 | V-groove with groove_angle=60 → polyline + angle label in SVG | Pass (logic) |
| 4 | `all_around=True` → circle at (55,50) present in SVG | Pass (logic) |
| 5 | `field_weld=True` → filled triangle at (185,50) present | Pass (logic) |
| 6 | Backward-compat `generate_weld_symbol_svg` returns same shape | Pass (logic) |
| 7 | Report toolbar renders above results scroll area when joint active | Pass |
| 8 | Concise/Standard buttons call `window.print()` with correct `.report-output` shown | Pass (logic) |
| 9 | Calc Sheet generates jsPDF 4-page PDF and triggers download | Pass (logic) |
| 10 | ReportSettings modal stores to Zustand `reportSettings` | Pass (logic) |

---

## Phase 5: COMPLETE (2026-05-07) — v1.0 SHIPPED

### Deliverables

| Item | Status |
|---|---|
| `npm install cmdk zundo react-hotkeys-hook` | Done |
| `types.ts` — `CustomMaterial`, `LibraryLoadCase`, `VulcanProject.customMaterials`, `VulcanProject.loadCaseLibrary` | Done |
| `projectStore.ts` — wrapped with `zundo` `temporal` middleware (50-step history) | Done |
| `projectStore.ts` — `duplicateJoint`, `deleteJoint`, `setProjectName`, `addCustomMaterial`, `removeCustomMaterial`, `addLibraryLoadCase`, `removeLibraryLoadCase` | Done |
| `projectStore.ts` — `useTemporalStore` hook exported via `useStore(useProjectStore.temporal, selector)` | Done |
| `fileIO.ts` — v1.x → v2.0 migration (adds `customMaterials`, `loadCaseLibrary`) | Done |
| `App.tsx` — auto-save debounced 3s to `localStorage["vulcan_autosave"]` | Done |
| `App.tsx` — auto-save recovery toast on first mount (7-day window) | Done |
| `App.tsx` — ⌘Z / ⌘⇧Z undo/redo, ⌘K palette, ⌘N new joint keyboard shortcuts | Done |
| `App.tsx` — undo ↩ / redo ↪ buttons in header | Done |
| `App.tsx` — Materials library button in header | Done |
| `App.tsx` — ⌘K palette trigger button in header | Done |
| `ProjectSidebar.tsx` — editable project name, status icons (✓/⚠/✗/○) per joint | Done |
| `ProjectSidebar.tsx` — joint count display, delete joint button (hover reveal) | Done |
| `commandPalette/CommandPalette.tsx` — cmdk palette: joints, edit, project, view, switch-to-joint groups | Done |
| `library/MaterialLibraryModal.tsx` — built-in materials (read-only) + custom materials (add/delete) | Done |
| `onboarding/OnboardingTour.tsx` — 4-step first-launch tour, skippable, stored in localStorage | Done |
| `globals.css` — `prefers-reduced-motion` override, `:focus-visible` 2px accent ring | Done |
| `examples/simple_t_joint_static.vulcan` | Done |
| `examples/shaker_frame_assembly.vulcan` | Done |
| `examples/lifting_lug_design.vulcan` | Done |
| `README.md` — full architecture table, keyboard shortcuts, performance benchmarks, file format | Done |
| `npx tsc --noEmit` — 0 errors (fixed `useTemporalStore` StoreApi → useStore wrapper) | Done |
| `npm run build` — clean build | Done |

### Build Status (Phase 5)

- `npx tsc --noEmit`: 0 errors
- `npm run build`: clean, 1071 kB raw / 317 kB gzip
- Bundle note: jsPDF + html2canvas account for ~600 kB raw; lazy import these in a future pass to reduce initial load

### Known Limitations (Phase 5)

- Load case library modal (define once, reference by ID) deferred — planned for v1.1
- Project summary multi-joint report deferred — planned for v1.1
- `@tanstack/react-virtual` not added — sidebar is fast enough for typical project sizes (<50 joints)
- jsPDF + html2canvas not lazy-loaded — initial bundle larger than ideal; add dynamic `import()` in v1.1

---

## v1.0 STATUS: SHIPPED ✓

All five phases complete. Vulcan is a fully functional browser-based welded joint design calculator.

**Capabilities:**
- T-joint, Lap, Butt, and Corner joint structural analysis (Elastic TWL + IC method)
- Fatigue assessment (AWS D1.1 Annex K, Miner's rule, variable amplitude)
- Process and filler metal recommendation (GTAW/GMAW/FCAW/SMAW/SAW decision matrix)
- Metallurgical analysis (CE_IIW/Pcm/CET, preheat per AWS Table 5.8 + Yurioka, t₈/₅ cooling time)
- Distortion prediction (angular, transverse, longitudinal with mitigation guidance)
- Full AWS A2.4 weld symbol generator (SVG, all weld types)
- Three report levels: Concise (print), Standard (print), Calculation Sheet (jsPDF)
- Project file format v2.0 with embedded custom material library
- Undo/redo (50 steps), command palette (⌘K), auto-save to localStorage
- Zero installation — visit URL, Python runs via Pyodide in the browser

**Deploy:** `npm run build && vercel --prod`

---

## Future Phases (Planned)

- Material library browser (stainless, aluminum)
- Undo / redo
- Pyodide in Web Worker (unblock main thread during heavy computation)
- Ship-quality v1

## Smoke Test Results (Phase 1)

| # | Test | Result |
|---|------|--------|
| 1 | `npm install && npm run dev` — no errors | Pass |
| 2 | Loading screen shows 4-stage progress, fades out | Pass |
| 3 | App interactive after load, no console errors | Pass |
| 4 | Default joint "WLD-001" opens T-joint editor | Pass |
| 5 | t₁=12, t₂=16, L=400, w=8, Fy=-10 kN, Mz=500 kN·mm → results in range | Pass |
| 6 | w=3mm → AWS minimum warning (fail, 5mm min for 16mm material) | Pass |
| 7 | Large Fy → utilization >100%, w_required shown | Pass |
| 8 | Unit toggle SI ↔ US — labels update | Pass |
| 9 | ASD ↔ LRFD toggle — allowable and utilization update | Pass |
| 10 | ⌘S → downloads `project.vulcan`, valid JSON | Pass |
| 11 | Reload → ⌘O → joint state restored | Pass |
| 12 | `npm run build` — TypeScript clean, build succeeds | Pass |

## Known Limitations (Phase 2)

- IC method uses 2D in-plane formulation only (out-of-plane loads degrade to elastic TWL)
- Butt joint: joint length must be set manually in geometry (no auto-derive from plate width)
- Spectrum fatigue uses simplified Miner's rule (no mean stress correction)
- Unit display labels only — all calculations internally in SI (mm, N, MPa)
- Pyodide runs on main thread; heavy IC optimization may briefly block UI (Web Worker planned for Phase 5)
