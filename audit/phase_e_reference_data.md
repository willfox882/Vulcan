# Phase E — Reference Data Integrity

## E.1 — AWS D1.1 Table 5.7 (Min Fillet Sizes)
`aws_d11_table_5_7.json`:
| t_max (mm) | w_min (mm) | Code |
|---|---|---|
| 6 | 3 | ✓ |
| 12 | 5 | ✓ |
| 19 | 6 | ✓ |
| 38 | 8 | ✓ |
| 999 | 10 | ✓ |
**PASS** — exactly matches AWS D1.1:2020 Table 5.7.

## E.2 — AWS D1.1 Annex K (Fatigue)
Reference: AWS publishes Cf in ksi³ basis. Conversion factor = 6.895^m.

| Cat | JSON Cf_MPa | JSON m | JSON σ_TH | Hand-converted Cf_MPa | m_expected | σ_TH_expected (MPa) | Status |
|---|---|---|---|---|---|---|---|
| A | 8.20e12 | 3 | 165 | 250e8·6.895³ = 8.20e12 | 3 | 165 (24 ksi) | ✓ |
| B | 3.93e12 | 3 | 110 | 120e8·6.895³ = 3.93e12 | 3 | 110 (16 ksi) | ✓ |
| B′ | 2.00e12 | 3 | 83 | 61e8·6.895³ ≈ 2.00e12 | 3 | 83 (12 ksi) | ✓ |
| C | 1.44e12 | 3 | 69 | 44e8·6.895³ = 1.44e12 | 3 | 69 (10 ksi) | ✓ |
| D | 7.21e11 | 3 | 48 | 22e8·6.895³ = 7.21e11 | 3 | 48 (7 ksi) | ✓ |
| E | 3.61e11 | 3 | 31 | 11e8·6.895³ = 3.61e11 | 3 | 31 (4.5 ksi) | ✓ |
| E′ | 1.28e11 | 3 | 18 | 3.9e8·6.895³ = 1.28e11 | 3 | 18 (2.6 ksi) | ✓ |
| F | 1.50e11 | **3** | 55 | 150e10·6.895^4.5 ≈ 1.40e15 (ksi^4.5 → MPa^4.5) | **4.5** | 55 (8 ksi) | **FAIL** |

**CRITICAL C-005 (re-confirmed):** Category F uses a *different* slope (m = 4.5) and Cf in ksi^4.5 — it is not a m=3 curve. The current Cf and m together produce nonsense N_f for lap-joint transverse loading (the only Cat F path).

## E.3 — Material data (spot-check)
| Material | JSON Fy | JSON Fu | ASTM/EN | Status |
|---|---|---|---|---|
| A36 | 250 | 400 | Fy ≥ 250, Fu 400–550 | ✓ |
| A572-50 | 345 | 450 | 345 / 450 | ✓ |
| A588 | 345 | 485 | 345 / 485 | ✓ |
| A514 | 690 | 760 | 690 / 760–895 | ✓ |
| S235JR | 235 | 360 | 235 / 360 | ✓ |
| S355 | 355 | 470 | 355 / 470–630 | ✓ |

`materials_stainless.json` and `materials_aluminum.json` not opened (out of scope for the user-reported symptom). Recommend independent spot-check before fixes are deployed.

## E.4 — Electrode classifications
| Class | F_EXX (MPa) | Code (ksi → MPa) | Status |
|---|---|---|---|
| E70 | 483 | 70 × 6.895 = 482.7 | ✓ |
| E80 | 552 | 80 × 6.895 = 551.6 | ✓ |
| E110 | 758 | 110 × 6.895 = 758.5 | ✓ |
| ER70S-6 | 483 | 70 × 6.895 = 482.7 | ✓ |

`E60` electrode missing from `electrodes_aws_a5.json` — **MINOR C-301**, not surfaced anywhere in the UI by default but recommended to add for completeness.

## Summary
- C-005: Category F slope is wrong — Critical.
- C-301: E60 electrode missing — Minor.
- All other reference values pass.
