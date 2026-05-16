# Phase D — Unit Consistency

## D.1 — Declared contract
SI: forces N, moments N·mm, lengths mm, stresses MPa, energy kJ/mm, temp °C.

The Python engines do not have docstring unit declarations, but the formulae are internally consistent with this contract:
- `_elastic_twl_t_joint`: q [N/mm] = F [N] / L [mm] ✓; q_R/a → MPa ✓.
- `_butt_joint_analysis`: f = F/A → MPa ✓.
- `_weld_element_force`: R_ult = 0.6·F_EXX·a → N/mm × mm = N when integrated ✓.

## D.2 — Frontend ↔ Backend transit
- `units.ts` defines mm↔in, N↔lbf, MPa↔ksi conversions, but **none are called from `ResultsPanel.tsx`**. The Pyodide engines always receive whatever raw numbers are stored in `activeJoint.geometry`/`loadCases`/`material`.
- `unitSystem` toggle in `App.tsx` flips a label but does **not** transform stored values or display values. Geometry input fields presumably accept the user's number verbatim.
- **MAJOR C-201:** if a user toggles to "imperial" and types `0.5` (intending inches), it is fed to Python as if mm. The whole structural calc silently runs on bogus values. The "imperial" mode is a label only.

## D.3 — Constant audit
- `0.707` (1/√2 fillet throat factor) used everywhere ✓.
- E70 `F_EXX = 483 MPa` ✓ (70 ksi × 6.895 = 482.65, rounded). 
- ASD allowable `0.30·F_EXX` ✓ (AISC J2.4 for fillet welds).
- LRFD allowable `0.75·0.60·F_EXX = 0.45·F_EXX` ✓.
- E110 `F_EXX = 758 MPa` ✓ (110 ksi).
- `metallurgy.py:174` `rho_c = 3.5 J/(mm³·K)` — for steel, ρ·c ≈ 7.85e-3 g/mm³ × 0.46 J/(g·K) ≈ 3.6 e-3 J/(mm³·K). The code's `3.5` is **off by 1000** — likely intended as 3.5e-3. **CRITICAL C-202** — this propagates into `d_cr` (transition thickness) and the 2D t8/5 branch.
- `metallurgy.py:205` `lam = 0.4 W/(mm·K)` — steel λ = 40 W/(m·K) = 0.040 W/(mm·K). Engine has `0.4` — **off by 10×**. **CRITICAL C-203.**
- These two constant errors compound the t8/5 problem in C-007 and the 2D regime branch.

## D.4 — Round-trip precision
- `JSON.stringify` is the only IPC encoder; no precision loss for typical magnitudes.
- Display rounding (`round(..., 2)` in Python) is one-way; not stored back into state. ✓

## Summary
| ID | Finding | Severity |
|---|---|---|
| C-201 | Unit toggle is cosmetic; raw values reach engines unchanged | Major |
| C-202 | `rho_c = 3.5` should be `3.5e-3` J/(mm³·K) | Critical |
| C-203 | `lam = 0.4` should be `0.040` W/(mm·K) | Critical |
