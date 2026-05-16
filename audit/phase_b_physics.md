# Phase B — Physics Verification (Hand-Calc vs Engine)

All hand calcs taken from the audit prompt; engine values derived analytically by tracing `structural.py`, `fatigue.py`, `metallurgy.py`, and `distortion.py`. Tolerance: ±0.5%.

## B.1 — Structural Engine (Elastic TWL, T-joint)

Common: t1=10, t2=10, L=100, w=6, F_EXX=483 MPa, ASD → F_w_allow = 0.30·483 = 144.9 MPa.
- L_total = 200 mm ✓ (`structural.py:77`)
- a = 0.707·6 = 4.242 mm ✓
- I_ux = 5,000 mm³ ✓ (`structural.py:78`)
- I_uy = 166,667 mm³ ✓ (`structural.py:79`)
- J_u = 171,667 mm³ ✓

### Test 1 — Pure shear (Fy = -10,000 N)
- Hand calc: q_R = 50 N/mm; f_R = 11.79 MPa; util = 8.13%; w_req ≈ 0.49 mm.
- Engine: `q_vy = -50`; in corner loop `q_x = q_vy + 0 + 0 = -50`, `q_y = 0`; q_R = 50; f_R = 11.79; util = 8.13%.
- **PASS.** (Magnitude is correct because all other components are zero.)

### Test 2 — Pure in-plane torsion (Mz = +1,000,000 N·mm)
- Hand calc: at corner (50, 5): q_tx = -29.13, q_ty = +291.3; q_R = 292.7; f_R = 69.0 MPa; util = 47.6%.
- Engine: `q_tx = -Mz·ry/J_u = -29.13`, `q_ty = +Mz·rx/J_u = +291.3`; q_x = -29.13, q_y = 291.3; q_R = 292.7; f_R = 69.0.
- **PASS.**

### Test 3 — Combined shear + torsion (Fy = -10,000, Mz = +500,000)
- Hand calc, governing corner (-50, 5): q_x = -14.57, q_y = -50 + (-145.65) = **-195.65**; q_R = **196.2**; f_R = 46.3 MPa; util = **31.9 %**.
- Engine, corner (-50, 5): `q_x = q_vy + q_tx + q_bx = -50 + (-14.57) + 0 = -64.57`; `q_y = 0 + (-145.65) + 0 = -145.65`; q_R = √(64.57² + 145.65²) = **159.3**; f_R = 37.6 MPa; util = **25.9 %**.
- **FAIL** — engine reports 25.9 % vs hand-calc 31.9 % (≈19 % under-prediction).
- **Root cause — CRITICAL C-001:** in `_elastic_twl_t_joint` (lines 89–103) the variable `q_vy = Fy / L_total` is **mis-assigned to `q_x`** (along-weld direction) instead of `q_y` (across-web direction). Since the weld lines are aligned with the y-axis (rx = ±L/2 along weld, ry = ±t1/2 across web), a global Fy load produces line shear in the y-direction. The same swap is present for `q_vz`/`q_bx`/`q_by` (the variable names suffix the *load* direction but the assignment is to the *wrong* axis). Symmetric loadings (pure Fy or pure Mz) hide this; combined loads expose it.
- Same bug present in `_elastic_twl_cruciform` (`structural.py:776–777`).

### Test 4 — Out-of-plane bending (Mx = +500,000)
- Hand calc: q_bx = 500 N/mm; f_R = 117.9 MPa; util = 81.3 %.
- Engine: `c_x = t1/2 = 5`; `q_bx = 500`; q_x = 500, q_y = 0; q_R = 500; f_R = 117.9; util = 81.3.
- **PASS** (magnitude correct because Fy/Mz are zero — bug does not surface).

## B.2 — IC Method

`_ic_method_t_joint` (lines 135–220) only consumes `Fy` and `Mz` from the load dict (lines 146–147). Fz, Mx, My are **silently ignored**. **MAJOR C-002.**

Sanity check: with pure axial Fy and zero Mz, IC vs Elastic should match within 5 %. The decision rule at line 18 (`governing = ic`) blindly takes IC as governing **regardless** of which gave the higher demand — opposite of the comment "IC always governs … (conservative to use higher demand)" since IC typically gives *lower* demand than elastic. **MAJOR C-003** — this can report a non-conservative governing case.

## B.3 — Fatigue

Annex K Cf for Cat E in JSON: 3.61e11 (matches 11e8 ksi³ × 6.895³ = 3.606e11). ✓

### Test 5 — Cat E, Δσ = 60 MPa
- Hand: N_f = 3.61e11 / 216,000 = 1.671e6 cycles ✓
- Engine line 29: `N_f = Cf / (delta_sigma**m)` ✓ → 1.671e6 cycles. **PASS.**

### Test 6 — Below threshold (Δσ = 20 MPa)
- 20 < 31 → infinite life, below_threshold=True. Engine line 25–27 ✓ **PASS.**

### Test 7 — Variable amplitude (Miner)
- Hand: D = 0.488 (only the 80 and 50 MPa bins contribute; 20 MPa skipped).
- Engine line 41 skips when `ds_i <= sigma_TH or n_i <= 0`. Damage = 0.1418 + 0.3463 ≈ **0.488**. **PASS.**

### Test 8 — Auto-classification
- T-joint → "E" ✓ ; Butt full + transverse → "C" ✓ ; Lap + transverse → "F" ✓ .
- **MAJOR C-004:** `ResultsPanel.tsx:128` hard-codes `structural: { load_direction: "transverse" }`. There is no UI for parallel-vs-transverse loading. Butt-parallel ("B") and Lap-parallel ("E") are never reachable.
- **CRITICAL C-005 (reference data):** `aws_d11_annex_k.json` line 10 sets Category F with `"m": 3`. AWS D1.1 Annex K / AISC 360 Appendix 3 define Cat F with **m = 4.5** (different stress-life slope). The Cf coefficient (1.50e11) and m=3 do not represent any real fatigue curve. Result: predicted N_f for Cat F joints is wrong by orders of magnitude at high stress ranges.

## B.4 — Carbon equivalent (A572-50)

Hand: CE_IIW = 0.455, Pcm = 0.311.
Engine (`metallurgy.py:98–101`): IIW formula and Ito-Bessyo Pcm both correct.
For A572-50 chemistry from JSON (C=0.23, Mn=1.35, Si=0.40, V=0.11):
- CE_IIW = 0.23 + 1.35/6 + (0+0+0.11)/5 + 0 = 0.23 + 0.225 + 0.022 = **0.477** (engine) vs **0.455** (hand-calc, ignored V).
- The engine's value is correct given the JSON chemistry (which includes V=0.11). Hand-calc neglected V. **PASS** for the formula; the discrepancy is data-driven.

## B.5 — Heat input & cooling time

### Test 10 — Heat input from V/I/v
- **MAJOR C-006:** the engine has no Q = 60·V·I·η/(1000·v) calculator. `analyze_metallurgy` accepts `heat_input_kJ_per_mm` as an *input* and `ResultsPanel.tsx:153` hard-codes it to **1.5**. The user cannot drive heat input from welding parameters. Cooling time, t8/5 regime, and recommended-range checks are all keyed off this hard-coded constant.

### Test 11 — t8/5 (3D, Q=1.5 kJ/mm, T0=100 °C)
- Hand calc (Rosenthal 3D): t = Q/(2π·λ) · [1/(500-T0) − 1/(800-T0)] = 1500/(2π·0.04) · (1/400 − 1/700) = **6.39 s**.
- Engine `metallurgy.py:191`:
  ```python
  t85_3D = (4258.0 / net_Q) * (1.0 / dT_bot**2 - 1.0 / dT_top**2)
  ```
  Wrong on **two** counts: (a) the constant 4258 is unrelated to 1/(2π·λ) ≈ 3.98 mm·K·s/J; (b) the dT terms are **squared** — that is the 2D-flow form, not 3D.
  With net_Q = 1500·0.80 = 1200, dT_bot = 400, dT_top = 700:
  t85_3D = (4258/1200) · (1/160000 − 1/490000) = 3.548 · 4.21e-6 = **1.49e-5 s** → clamped to `max(..., 0.5)` = **0.5 s**.
- **CRITICAL C-007:** cooling-time engine emits ~0.5 s for essentially all realistic inputs in 3D regime (and the 2D branch contains a self-overwriting line: `t85_2D = ...` is computed twice on lines 202 and 206 — only the second value survives). Both regime branches need rederivation.

## B.6 — Distortion (Test 12, T-joint t=10, w=6)

- Hand calc (Okerblom): α = 0.04·(6/10)^1.5 = **1.07°**.
- Engine (`distortion.py:81–98`, Masubuchi): Aw = 0.5·6² = 18; α = 0.0388·18/100 = 0.00698 rad = 0.40°. Then because `weldConfig` defaults to `both_sides` for T-joints, multiplied by **0.20** → **0.08°** expected, range 0.032–0.20°.
- Hand-calc 1.07° (single-sided) vs engine 0.08° (double-sided) — *not* the same scenario.
- **MINOR C-008:** TJointGeometry (types.ts) has **no** `weldConfig` field, so `joint.get("weldConfig", "both_sides")` always returns "both_sides" → angular distortion always reduced 5×. There is no UI to specify single-sided T-joints, even though `_elastic_twl_t_joint` always assumes both-sides welds.
- Within its assumption, the engine's range plausibly contains the hand-calc value × 0.2 → not strictly a failure but is *opaque* to the user. **PASS within scope, MINOR finding.**

## Summary table

| Test | Subject | Result | Severity |
|---|---|---|---|
| 1 | Pure shear T-joint | PASS | — |
| 2 | Pure torsion T-joint | PASS | — |
| 3 | Combined shear + torsion | **FAIL** (axis swap) | **Critical (C-001)** |
| 4 | Out-of-plane bending | PASS | — |
| — | IC method scope | Loads silently ignored | Major (C-002) |
| — | IC governing rule | Always picks IC, even if lower | Major (C-003) |
| 5 | Fatigue Cat E, ΔS=60 | PASS | — |
| 6 | Fatigue below threshold | PASS | — |
| 7 | Miner damage | PASS | — |
| 8 | Auto-classification | Hard-coded transverse + Cat-F m=3 | Major (C-004), **Critical (C-005)** |
| 9 | Carbon equivalent | PASS | — |
| 10 | Heat input from V/I/v | Missing (Q hard-coded 1.5) | Major (C-006) |
| 11 | t8/5 cooling time | **FAIL** (wrong formula + clamp) | **Critical (C-007)** |
| 12 | Angular distortion | PASS in scope, but no weldConfig UI | Minor (C-008) |
