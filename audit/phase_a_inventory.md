# Phase A — Codebase Inventory

## A.1 — File Map

### Frontend (src/)
| Path | Purpose | LOC |
|---|---|---|
| `src/App.tsx` | App shell, header, layout, keyboard shortcuts, autosave | 254 |
| `src/main.tsx` | React entry | ~10 |
| `src/types.ts` | All TS types: geometry (T/Lap/Butt/Corner/Edge/Cruciform), loads (Static/Cyclic/Spectrum), Material, Service, AnalysisResult | 261 |
| `src/lib/pyodide.ts` | `initializePyodide` + `callEngine` IPC | 71 |
| `src/lib/fileIO.ts` | Save/load `.vulcan`; v1.0→1.1→1.2→2.0 migrations | 113 |
| `src/lib/units.ts` | mm↔in, N↔lbf, MPa↔ksi conversions | 70 |
| `src/stores/projectStore.ts` | Zustand + zundo temporal; project CRUD; **owns `activeJoint` derivation** | 259 |
| `src/stores/resultsStore.ts` | Per-jointId result caches: structural, fatigue, process, metallurgy, distortion, loading, errors | 48 |
| `src/stores/pyodideStore.ts` | Pyodide instance, status, progress | 31 |
| `src/stores/uiStore.ts` | Sidebar, report settings | 30 |
| `src/components/jointEditor/JointEditor.tsx` | Tabs: type, geometry, material, loads, service | 92 |
| `src/components/jointEditor/GeometryPanel.tsx` | Switch by joint type → child geometry panel | 22 |
| `src/components/jointEditor/geometry/{T,Lap,Butt,Corner,Edge,Cruciform}JointGeometryPanel.tsx` | Per-type input fields | (not read in detail) |
| `src/components/resultsPanel/ResultsPanel.tsx` | **The reactive trigger**: useEffect runs 5+ `callEngine` on `[activeJoint, pyodide]` change with 100 ms debounce | 252 |
| `src/components/resultsPanel/WeldSymbolPreview.tsx` | Independent `callEngine("generate_symbol_svg")` on symbol-field changes | 71 |
| `src/components/resultsPanel/{Structural,Fatigue,Process,Metallurgy,Distortion}Results.tsx`, `WarningsList.tsx`, `MethodComparison.tsx` | Pure display | (not read) |
| `src/components/jointPreview/*` | SVG joint preview | (not read) |
| `src/components/projectSidebar/*`, `commandPalette/*`, `library/*`, `loader/*`, `onboarding/*`, `reports/*` | Misc UI | (not read) |

### Python engines (public/python/engines/)
| File | Functions | LOC |
|---|---|---|
| `classifier.py` | `classify_joint` — joint-type lookup table only (not used by results pipeline) | 19 |
| `structural.py` | `analyze_joint` (entry); `_elastic_twl_t_joint`, `_ic_method_t_joint`, `_elastic_twl_lap`, `_ic_method_lap`, `_butt_joint_analysis`, `_elastic_twl_corner`, `_ic_method_corner`, `_elastic_twl_edge`, `_elastic_twl_cruciform`; helpers `_weld_element_force`, `_delta_ult_fn`, `_allowable_stress`, `_lookup_min_fillet`, `_check_aws_constraints_generic`, `_generate_symbol_data`, `_generate_groove_symbol`, `_zero_result` | 825 |
| `fatigue.py` | `analyze_fatigue`, `_classify_fatigue_category` | 108 |
| `process.py` | `select_process`, `_select_filler`, `_extract_thicknesses` | 277 |
| `metallurgy.py` | `analyze_metallurgy`, `_aws_table_5_8_lookup`, `_recommended_heat_input`, `_extract_thicknesses` | 270 |
| `distortion.py` | `predict_distortion`, `_extract_thicknesses` | 156 |
| `symbol.py` | `generate_symbol_svg`, `generate_weld_symbol_svg` (alias) | 190 |

### Reference data (public/python/data/)
| File | Source / Purpose |
|---|---|
| `aws_d11_table_5_7.json` | Min fillet sizes vs thicker-part thickness |
| `aws_d11_table_5_8.json` | Preheat by CE category × combined thickness |
| `aws_d11_annex_k.json` | Fatigue categories A, B, B′, C, D, E, E′, F: Cf, m, threshold |
| `aisc_360_j2.json` | Allowable weld stress factors |
| `electrodes_aws_a5.json` | E70/E80/E110/ER70S-6/E71T-1 mech props + base compatibility |
| `filler_match.json` | (matrix base × process → filler) |
| `materials_steel.json` | A36, A572-50, A588, A514, S235JR, S355 |
| `materials_stainless.json`, `materials_aluminum.json` | (not opened) |

## A.2 — Pyodide Functions Exposed to JS

| Function | File | Input keys | Output keys (top-level) |
|---|---|---|---|
| `analyze_joint` | structural.py | `joint{type, ...}`, `material`, `loads{Fx,Fy,Fz,Mx,My,Mz}`, `service{codeBasis,...}` | `structural_elastic`, `structural_ic`, `structural_governing`, `validation`, `symbol` |
| `analyze_fatigue` | fatigue.py | `joint`, `structural{load_direction}`, `fatigue{type, stress_range_MPa | spectrum, frequency_Hz, duty_cycle, design_life_years}` | `category`, `Cf`, `m`, `threshold_MPa`, `stress_range_MPa`, `cycles_to_failure`, `damage`, `service_life_years`, `safety_factor`, `passes`, ... |
| `select_process` | process.py | `material`, `joint`, `environment`, `production_volume`, `quality_level` | `ranked_processes[]`, `primary`, `filler` |
| `analyze_metallurgy` | metallurgy.py | `material`, `joint`, `process`, `heat_input_kJ_per_mm` | `carbon_equivalent`, `preheat`, `heat_input`, `cooling_time_t85`, `pwht_required`, `hydrogen_class` |
| `predict_distortion` | distortion.py | `joint` | `angular_deg{min,expected,max}`, `transverse_shrinkage_mm`, `longitudinal_shrinkage_mm`, `mitigations`, `note` |
| `generate_symbol_svg` | symbol.py | `weld_type`, `size`, `configuration`, etc. | `svg`, `notation` |
| `classify_joint` | classifier.py | `jointType`, `weldConfiguration` | `jointName`, `weldType`, `awsFatigueCategory`, ... — **NOT USED by ResultsPanel** |

## A.3 — Reactive Dependency Map

### Stores
- `useProjectStore` — `{project, activeJoint, unitSystem, ...actions}`. `activeJoint` is **eagerly maintained** as a sibling of `project`. Every `updateJoint`/`addJoint`/`setActiveJointId` returns a *new* `activeJoint` object reference.
- `useResultsStore` — keyed by jointId; results, fatigueResults (jointId × loadCaseId), loading, errors.
- `usePyodideStore` — `{instance, status, ...}`.

### Trigger chain (the only one that recomputes structural/fatigue/process/metallurgy/distortion)
1. `ResultsPanel.tsx:42` `const { activeJoint } = useProjectStore();` (subscribes to entire store)
2. `ResultsPanel.tsx:72` `useEffect(..., [activeJoint, pyodide])`
3. Effect clears `debounceRef`, schedules `setTimeout(... , 100)`
4. Inside timeout: `setLoading(true)` → `await callEngine("analyze_joint", ...)` → `setResult` → loop fatigue cases → `select_process` → `analyze_metallurgy` → `predict_distortion`
5. Cleanup `clearTimeout` runs on next render — but **does not abort in-flight `callEngine`s**.

### "Hash" used to detect change
- **None.** Decision is based purely on object identity of `activeJoint` (and a 100 ms debounce). Any update to any joint field that goes through `updateJoint(id, {...})` produces a new `activeJoint` reference, which re-fires the effect.
- `WeldSymbolPreview` separately keys on individual `result.symbol.*` primitive fields.

### Debounce
- `ResultsPanel`: 100 ms trailing-edge `setTimeout`, properly cancelled on next render. ✓
- `App.tsx:39` autosave: 3000 ms trailing-edge. ✓
- `WeldSymbolPreview`: **none**, fires immediately.

### AbortController / cancellation
- **None anywhere.** No `AbortSignal`, no in-flight tracking, no Pyodide call serialization.

### Pyodide global state
- `callEngine` writes input via shared global `_call_input` (`pyodide.globals.set("_call_input", inputJson)`). Every concurrent caller writes to the same global.

## Phase A Output
This file. Reactive map, function inventory, and file map complete. **No fixes applied.**
