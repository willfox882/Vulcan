# Phase H — Post-Fix Verification

## Regression test suite
`public/python/tests/test_audit_phase_b.py` — runs under plain CPython (numpy/scipy only). 8/8 pass:

```
PASS  test_b1_pure_shear
PASS  test_b2_pure_torsion
PASS  test_b3_combined_shear_plus_torsion    ← was FAIL before fix (C-001)
PASS  test_b4_out_of_plane_bending
PASS  test_b5_fatigue_cat_e_constant_amplitude
PASS  test_b6_fatigue_below_threshold
PASS  test_b7_miner_variable_amplitude
PASS  test_b11_cooling_time_3d_regime         ← was FAIL before fix (C-007)
```

`tsc --noEmit` — clean (no type errors after AbortSignal threading).

## Findings status after this fix batch

| ID | Status | Notes |
|---|---|---|
| C-001 | **FIXED** | T-joint and Cruciform corner-loop sums now split q_along/q_across/q_peel. Verified by Test 3. |
| C-002 | OPEN | IC method still ignores Fz, Mx, My — defer to fix #5. |
| C-003 | **FIXED** | `governing = whichever has higher utilization` for T-joint, lap, corner. |
| C-004 | OPEN | `load_direction` UI not added — defer to fix #7. |
| C-005 | **FIXED** | Cat F → `m: 4.5`, `Cf: 8.90e15`. |
| C-006 | OPEN | Heat input still hard-coded 1.5 kJ/mm in `ResultsPanel.tsx:153` — defer to fix #7. |
| C-007 | **FIXED** | 3D Rosenthal: `Q/(2π·λ)·(1/ΔT₅₀₀−1/ΔT₈₀₀)`; 2D Rosenthal with proper constants; sensible 2D/3D transition. Verified by Test 11. |
| C-008 | OPEN | TJointGeometry still missing weldConfig — defer to fix #7. |
| C-101 | **FIXED** | `callEngine` now accepts `AbortSignal`; ResultsPanel + WeldSymbolPreview both abort on cleanup. |
| C-102 | **FIXED** | `callEngine` serializes via promise queue + per-call unique global `_call_input_${id}` + cleanup in `finally`. |
| C-103 | **FIXED** | WeldSymbolPreview now 100 ms debounced. |
| C-104 | OPEN | Only first static load case used — cleanup. |
| C-201 | OPEN | Unit-toggle plumbing — defer to fix #6. |
| C-202 | **FIXED** | `rho_c = 0.0044 J/(mm³·K)`. |
| C-203 | **FIXED** | `lam = 0.040 W/(mm·K)`. |
| C-301 | OPEN | E60 electrode missing — cleanup. |

**Summary: 9 fixed (all 7 Critical + 2 Major), 7 deferred (Major UI + Minor cleanup).**

## What was changed
- `src/lib/pyodide.ts` — rewrote `callEngine` to serialize + AbortSignal + per-call global.
- `src/components/resultsPanel/ResultsPanel.tsx` — threaded `AbortController`/`signal` through all 5 engine calls; abort on cleanup; bail on `signal.aborted` after each await.
- `src/components/resultsPanel/WeldSymbolPreview.tsx` — added 100 ms debounce + AbortController.
- `public/python/engines/structural.py` — fixed T-joint and Cruciform corner-loop axis assignment; fixed IC governing rule (T, lap, corner).
- `public/python/engines/metallurgy.py` — corrected `rho_c`, `lam`, and the 3D/2D Rosenthal t8/5 formulae; removed double-η application and dead-code reassignment.
- `public/python/data/aws_d11_annex_k.json` — Cat F slope corrected to m=4.5.
- `public/python/tests/test_audit_phase_b.py` — new regression suite.

## Live-deployment verification (not yet performed)
- Local typecheck and Python tests pass.
- Browser smoke test (start dev server, change `t1` rapidly, verify utilization updates in <200 ms) — **not run in this session**. Recommend the user runs `npm run dev` and manually exercises Test 3 (Fy + Mz combined) before merging.

## Recommended follow-up PRs
1. **PR-B**: deferred Major fixes — C-002 (IC missing loads), C-004 (load_direction UI), C-006 (heat-input UI), C-008 (weldConfig field).
2. **PR-C**: C-201 unit-toggle plumbing (highest-risk because of stored `.vulcan` files).
3. **PR-D**: cleanup — C-104, C-301, performance selectors (C-106).
