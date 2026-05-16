# Vulcan Forensic Audit — Findings Report

## Summary
- **Total issues found: 16**
- **Critical (results unsafe / wrong physics / safety-of-use): 7**
- **Major (results inaccurate, hidden, or wired wrong): 6**
- **Minor (cosmetic, ergonomics, performance): 3**

> ⚠️ **Safety-of-use note** — three Critical findings (C-001, C-007, C-202/203) cause incorrect engineering outputs that could lead a user to specify an under-sized weld or under-estimate cracking risk. Until C-001 is fixed, the elastic-method utilization for any combined-load case (the common engineering scenario) is wrong by ~20 % in either direction depending on geometry, and may not flag the truly-governing weld corner.

---

## Critical Findings

### C-001 — T-joint and Cruciform: load-axis swap in elastic TWL
- **Locations:** `public/python/engines/structural.py:89–103` (T-joint), `:759–777` (cruciform).
- **Description:** `q_vy = Fy / L_total` is summed into `q_x` and `q_vz = Fz / L_total` into `q_y`, but the corner coordinate convention is `(rx = ±L/2 along weld, ry = ±t1/2 across web)`. A global `Fy` load creates line shear in the y direction (across web), so it must combine with `q_ty` not `q_tx`. Same swap for `q_vz/q_by`. Test 3 (Fy + Mz combined) gives engine util **25.9 %** vs hand-calc **31.9 %** at the wrong corner.
- **Impact:** Combined static loads under-predict (or over-predict) demand and identify the wrong governing corner. Pure-shear and pure-torsion cases hide the bug.
- **Fix sketch:** rebuild the corner-loop summation as vectors:
  ```python
  q_x_total = q_tx + q_bx           # along-weld components
  q_y_total = q_vy + q_ty + q_by    # across-web components
  q_z_total = q_vz                   # out-of-plane (peel) → handle separately
  ```

### C-005 — Annex K Category F: wrong S-N slope
- **Location:** `public/python/data/aws_d11_annex_k.json:10`.
- **Description:** Cat F uses m = 4.5 in AWS D1.1 / AISC. JSON has `"m": 3` and Cf in MPa³ basis. The (Cf, m) pair does not represent any real fatigue curve. The only path that selects Cat F is lap-joint transverse loading.
- **Impact:** Predicted N_f and damage are off by orders of magnitude for lap-fillet transverse loading.
- **Fix:** set `"m": 4.5`, recompute Cf using `Cf_MPa = 150e10 × 6.895^4.5`.

### C-007 — Cooling-time t8/5: wrong formula and wrong constants
- **Location:** `public/python/engines/metallurgy.py:191` (3D), `:202–207` (2D).
- **Description:** 3D uses `(4258 / net_Q) · (1/dT_bot² − 1/dT_top²)` — the constant is unrelated to 1/(2π·λ) and the dT terms are squared (which is the 2D form). 2D branch reassigns `t85_2D` on the next line so the first computation is dead code. With `Q = 1.5 kJ/mm`, `T0 = 100 °C`, GMAW η = 0.80: engine emits ~1.5e-5 s → clamped to 0.5 s; correct value ≈ 6.4 s.
- **Impact:** Cooling-time engine is non-functional. Cracking risk warnings are silent.
- **Fix:** implement Rosenthal:
  - 3D: `t85 = Q_eff / (2·π·λ) · (1/(500-T0) − 1/(800-T0))`
  - 2D: `t85 = Q_eff² / (4·π·λ·ρc·t²) · (1/(500-T0)² − 1/(800-T0)²)`

### C-101 — No AbortController on Pyodide calls
- **Location:** `src/lib/pyodide.ts:47`, `src/components/resultsPanel/ResultsPanel.tsx:72`, `src/components/resultsPanel/WeldSymbolPreview.tsx:21`.
- **Description:** A new effect can start before the previous chain of 5 sequential `callEngine`s finishes. Both chains race to write `useResultsStore.results[id]`. The earlier chain often lands *last* — the displayed utilization corresponds to a stale input.
- **Impact:** **Direct cause of user-reported symptom** ("inputs don't propagate"). Symptom is racy and intermittent.
- **Fix sketch:** thread an `AbortSignal` through `callEngine`; check `signal.aborted` after each await before writing to the store; in the effect cleanup, `controller.abort()`.

### C-102 — Pyodide global `_call_input` is shared
- **Location:** `src/lib/pyodide.ts:53`.
- **Description:** All callers write to a single global. Re-entrant or concurrent calls (e.g., `WeldSymbolPreview` colliding with the structural chain) can read each other's input. Worst case: `analyze_joint` raises a `KeyError` because it received a `generate_symbol_svg` payload.
- **Impact:** Silent corruption + occasional crashes that are reported as "errors[jointId]" but blame the wrong call.
- **Fix sketch:** serialize all `callEngine` calls through a single in-flight queue, OR generate per-call unique global names (`_call_input_${id}`), OR pass arguments via a Pyodide proxy / dict instead of a global.

### C-202 — `rho_c = 3.5` instead of `3.5e-3` J/(mm³·K)
- **Location:** `public/python/engines/metallurgy.py:174` and `:198`.
- **Description:** Steel ρ·c ≈ 3.6e-3 J/(mm³·K). The value `3.5` is the SI value for J/(cm³·K) in cgs-ish units, off by 1000.
- **Impact:** Transition thickness `d_cr` and 2D t8/5 branch produce nonsense.

### C-203 — `lam = 0.4` instead of `0.040` W/(mm·K)
- **Location:** `public/python/engines/metallurgy.py:205`.
- **Description:** Steel λ = 40 W/(m·K) = 0.040 W/(mm·K). Engine has `0.4` — 10× too high.
- **Impact:** 2D t8/5 wrong by 100×.

---

## Major Findings

### C-002 — IC method silently ignores Fz, Mx, My
- **Location:** `structural.py:146–147` (T), `:284–285` (lap), `:475–476` (corner).
- **Fix:** consume the full force/moment dict, or emit a warning if non-IC components are non-zero.

### C-003 — IC blindly governs over Elastic
- **Location:** `structural.py:18, 22, 28`.
- **Description:** Comment says "IC always governs (conservative to use higher demand)" but the line `governing = ic` picks IC unconditionally. IC typically yields *lower* demand than Elastic, so this is *non-conservative*.
- **Fix:** `governing = elastic if elastic["utilization"] >= ic["utilization"] else ic`, then surface a flag in the UI when they disagree by >10 %.

### C-004 — `load_direction` is hard-coded `"transverse"`
- **Location:** `src/components/resultsPanel/ResultsPanel.tsx:128`.
- **Impact:** Butt-parallel ("B") and Lap-parallel ("E") fatigue categories unreachable.
- **Fix:** add UI toggle in `LoadPanel.tsx` for cyclic load cases; thread through `analyze_fatigue`.

### C-006 — Heat input hard-coded at 1.5 kJ/mm
- **Location:** `ResultsPanel.tsx:153`.
- **Impact:** Cooling time, recommended-range comparisons, and t8/5 regime decision all ignore actual welding parameters.
- **Fix:** add V/I/v/η inputs in service or process panel; compute Q = 60·V·I·η/(1000·v); pass to `analyze_metallurgy`.

### C-201 — Unit-system toggle is cosmetic only
- **Location:** `App.tsx:120–134`, `units.ts` (unused by IPC layer).
- **Impact:** Imperial-mode users feed inches/lbf/ksi numbers into Python that interprets them as mm/N/MPa.
- **Fix:** at the IPC boundary, convert all geometry/load values to SI before `callEngine`; keep storage in SI; conversions only at the input/display layer.

### C-008 — TJointGeometry has no `weldConfig` field
- **Location:** `src/types.ts:2-8`, `distortion.py:92-95`.
- **Impact:** All T-joints are silently treated as both-sides; angular distortion always reduced 5×; user can't model single-sided fillet.

---

## Minor Findings

### C-103 — `WeldSymbolPreview` un-debounced
- **Location:** `WeldSymbolPreview.tsx:21`.
- **Fix:** wrap in 100 ms debounce, or fold into the structural recompute.

### C-104 — Only first static load case used
- **Location:** `ResultsPanel.tsx:81`.
- **Fix:** loop through all static cases and report worst-case utilization.

### C-301 — E60 electrode missing from electrode JSON
- **Location:** `public/python/data/electrodes_aws_a5.json`.

(Plus C-105/C-106 stylistic notes documented in `phase_c_reactive.md`.)

---

## Wiring & Reactivity Issues — root cause of user symptom

The user's report ("input changes (t1, L) frequently fail to propagate to results") is **not** caused by missed React subscriptions or stale closures. The reactive plumbing in `projectStore.updateJoint` → new `activeJoint` reference → `ResultsPanel` `useEffect` is correct end-to-end (see `phase_c_reactive.md` §C.1).

The symptom is caused by the **IPC layer** under fast typing:
1. **C-101 (no AbortController)** — late-arriving stale `setResult` calls overwrite fresh ones.
2. **C-102 (shared `_call_input` global)** — concurrent callers can read each other's payload.

Either failure mode produces an apparent "doesn't update" UX. Both must be fixed; fixing one without the other still leaves intermittent corruption.

---

## Recommended Fix Order

1. **C-101 + C-102 together** (IPC race + shared global). Single PR. Restores correctness of the reactive layer; eliminates the user-reported symptom. *Prereq for verifying any further fix.*
2. **C-001** (T-joint axis swap) and **C-203, C-202** (cooling-time constants). Same PR — fix the misalignments and provide a regression test (Phase B Test 3).
3. **C-007** (cooling-time formulae) — depends on #2 constants being correct.
4. **C-005** (Cat F slope).
5. **C-003** (IC governing rule) and **C-002** (IC missing loads).
6. **C-201** (unit toggle) — needs care with backward compatibility of stored `.vulcan` files (data is presumably already SI; only the display path needs conversion).
7. **C-004**, **C-006**, **C-008** — UI additions.
8. **C-103, C-104, C-301** — cleanup.

## Estimated Effort
| Group | Hours fix + test |
|---|---|
| #1 IPC race + global (Critical) | 4–6 h |
| #2 Axis swap + thermal constants | 3–4 h |
| #3 Cooling-time formulae | 3 h |
| #4 Cat F slope | 1 h |
| #5 IC method governing + load coverage | 4 h |
| #6 Unit-toggle plumbing | 4 h |
| #7 UI additions | 6 h |
| #8 Cleanup | 2 h |
| **Total** | **~30 h** |

---

## Awaiting User Approval

Phases A–E complete; this report is the consolidated output. **No code has been changed.** Please review and confirm the Phase G fix order. I recommend committing #1 alone first so the user can verify the symptom resolution before chasing the math fixes.
