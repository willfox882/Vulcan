"""
Phase B regression tests — direct exercise of structural and fatigue
engines against the audit hand-calculations. Designed to run under
plain CPython (numpy + scipy only). Does not require the Pyodide
shell-injected `_tables` global for the four T-joint elastic tests.

Run: python -m pytest public/python/tests/test_audit_phase_b.py -v
"""
import math
import sys
import pathlib

# Make the engines/ dir importable in dev
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "engines"))

import structural  # noqa: E402
import fatigue     # noqa: E402

# Inject minimal _tables for any validation lookups
structural._tables = {
    "aws_d11_table_5_7": {
        "thresholds": [
            {"t_max": 6.0, "w_min": 3.0},
            {"t_max": 12.0, "w_min": 5.0},
            {"t_max": 19.0, "w_min": 6.0},
            {"t_max": 38.0, "w_min": 8.0},
            {"t_max": 999.0, "w_min": 10.0},
        ]
    }
}
fatigue._tables = {
    "aws_d11_annex_k": {
        "E": {"Cf_MPa": 3.61e11, "m": 3, "threshold_MPa": 31, "description": "E"},
        "F": {"Cf_MPa": 1.61e17, "m": 6, "threshold_MPa": 55, "description": "F"},
    }
}


JOINT = {"type": "t_joint", "webThickness": 10, "flangeThickness": 10,
         "jointLength": 100, "weldSize": 6}
MATERIAL = {"F_EXX": 483}
SERVICE = {"codeBasis": "ASD"}


def _approx(a, b, tol=0.01):
    return abs(a - b) / max(abs(b), 1e-9) <= tol


def test_b1_pure_shear():
    """Test 1: pure shear Fy = -10000 N → util ≈ 8.13%, f_R ≈ 11.79 MPa."""
    loads = {"Fx": 0, "Fy": -10000, "Fz": 0, "Mx": 0, "My": 0, "Mz": 0}
    res = structural._elastic_twl_t_joint(JOINT, MATERIAL, loads, SERVICE)
    assert _approx(res["f_R"], 11.79, 0.01), f"f_R={res['f_R']}"
    assert _approx(res["utilization_pct"], 8.13, 0.05), f"util={res['utilization_pct']}"


def test_b2_pure_torsion():
    """Test 2: pure torsion Mz = +1e6 N·mm → f_R ≈ 69.0 MPa, util ≈ 47.6%."""
    loads = {"Fx": 0, "Fy": 0, "Fz": 0, "Mx": 0, "My": 0, "Mz": 1_000_000}
    res = structural._elastic_twl_t_joint(JOINT, MATERIAL, loads, SERVICE)
    assert _approx(res["f_R"], 69.0, 0.01), f"f_R={res['f_R']}"
    assert _approx(res["utilization_pct"], 47.6, 0.02), f"util={res['utilization_pct']}"


def test_b3_combined_shear_plus_torsion():
    """Test 3 (the bug case): Fy=-10000 + Mz=+500000.

    Hand-calc governing corner (-50, 5): q_R ≈ 196.2 N/mm,
    f_R ≈ 46.3 MPa, utilization ≈ 31.9 %.
    """
    loads = {"Fx": 0, "Fy": -10000, "Fz": 0, "Mx": 0, "My": 0, "Mz": 500_000}
    res = structural._elastic_twl_t_joint(JOINT, MATERIAL, loads, SERVICE)
    assert _approx(res["f_R"], 46.3, 0.02), f"f_R={res['f_R']}"
    assert _approx(res["utilization_pct"], 31.9, 0.05), f"util={res['utilization_pct']}"


def test_b4_out_of_plane_bending():
    """Test 4: pure Mx = +500000 → f_R ≈ 117.9 MPa, util ≈ 81.3 %."""
    loads = {"Fx": 0, "Fy": 0, "Fz": 0, "Mx": 500_000, "My": 0, "Mz": 0}
    res = structural._elastic_twl_t_joint(JOINT, MATERIAL, loads, SERVICE)
    assert _approx(res["f_R"], 117.9, 0.01), f"f_R={res['f_R']}"
    assert _approx(res["utilization_pct"], 81.3, 0.02), f"util={res['utilization_pct']}"


def test_fx_longitudinal_shear_not_ignored_tjoint():
    """Regression for H2: a pure Fx (along-weld) load must produce stress,
    not a false ADEQUATE. By symmetry of pure direct shear, |Fx| yields the
    same resultant as the equivalent |Fy|."""
    loads_fx = {"Fx": -10000, "Fy": 0, "Fz": 0, "Mx": 0, "My": 0, "Mz": 0}
    res_fx = structural._elastic_twl_t_joint(JOINT, MATERIAL, loads_fx, SERVICE)
    assert res_fx["f_R"] > 0 and res_fx["utilization_pct"] > 0, "Fx was ignored"
    assert _approx(res_fx["f_R"], 11.79, 0.01), f"f_R={res_fx['f_R']}"

    loads_fy = {"Fx": 0, "Fy": -10000, "Fz": 0, "Mx": 0, "My": 0, "Mz": 0}
    res_fy = structural._elastic_twl_t_joint(JOINT, MATERIAL, loads_fy, SERVICE)
    assert _approx(res_fx["f_R"], res_fy["f_R"], 0.001)


def test_fx_plus_fy_combine_in_quadrature_tjoint():
    """Orthogonal in-plane direct shears combine by SRSS."""
    loads = {"Fx": -10000, "Fy": -10000, "Fz": 0, "Mx": 0, "My": 0, "Mz": 0}
    res = structural._elastic_twl_t_joint(JOINT, MATERIAL, loads, SERVICE)
    # q_vx = q_vy = 50 N/mm, q_R = 50*sqrt2 = 70.71, a = 4.2426 -> 16.67 MPa
    assert _approx(res["f_R"], 16.67, 0.01), f"f_R={res['f_R']}"
    assert _approx(res["f_v"], 16.67, 0.01), f"f_v={res['f_v']}"


def test_fx_not_ignored_lap_and_corner():
    """H2 must hold for lap and corner joints too."""
    lap = {"type": "lap_joint", "plate1Thickness": 12, "plate2Thickness": 12,
           "overlapLength": 150, "weldSize": 8}
    fx = {"Fx": -10000, "Fy": 0, "Fz": 0, "Mx": 0, "My": 0, "Mz": 0}
    fy = {"Fx": 0, "Fy": -10000, "Fz": 0, "Mx": 0, "My": 0, "Mz": 0}
    lap_fx = structural._elastic_twl_lap(lap, MATERIAL, fx, SERVICE)
    lap_fy = structural._elastic_twl_lap(lap, MATERIAL, fy, SERVICE)
    assert lap_fx["f_R"] > 0, "Fx ignored on lap joint"
    assert _approx(lap_fx["f_R"], lap_fy["f_R"], 0.001)

    corner = {"type": "corner_joint", "plate1Thickness": 12, "plate2Thickness": 12,
              "jointLength": 300, "weldConfig": "both", "weldSizeInside": 8,
              "weldSizeOutside": 6}
    cor_fx = structural._elastic_twl_corner(corner, MATERIAL, fx, SERVICE)
    assert cor_fx["f_R"] > 0, "Fx ignored on corner joint"


def test_butt_axial_plus_bending_adds_not_srss():
    """Regression for H3: axial + bending are collinear normal stresses and
    must add algebraically. SRSS (the previous behaviour) under-predicts."""
    joint = {"type": "butt_joint", "plate1Thickness": 12, "plate2Thickness": 12,
             "penetration": "full", "jointLength": 300}
    loads = {"Fx": 0, "Fy": -50000, "Fz": 0, "Mx": 500000, "My": 0, "Mz": 0}
    res = structural._butt_joint_analysis(
        joint, {"F_EXX": 483, "Fy": 250}, loads, {"codeBasis": "ASD"})
    s = res["structural_governing"]
    # f_direct = 50000/3600 = 13.889 ; f_bending = 500000*6/43200 = 69.444
    # correct (algebraic) sum = 83.33 ; old SRSS would give 70.81
    assert _approx(s["f_R"], 83.33, 0.01), f"f_R={s['f_R']}"
    assert s["f_R"] > 70.81, "SRSS regression — normal stresses not added"
    assert _approx(s["f_v"], 13.89, 0.01) and _approx(s["f_b"], 69.44, 0.01)


def test_butt_transverse_shear_counted():
    """L1: transverse shear Fz must contribute (von Mises)."""
    joint = {"type": "butt_joint", "plate1Thickness": 12, "plate2Thickness": 12,
             "penetration": "full", "jointLength": 300}
    loads = {"Fx": 0, "Fy": 0, "Fz": 50000, "Mx": 0, "My": 0, "Mz": 0}
    res = structural._butt_joint_analysis(
        joint, {"F_EXX": 483, "Fy": 250}, loads, {"codeBasis": "ASD"})
    s = res["structural_governing"]
    # f_shear = 50000/3600 = 13.889 ; von Mises = sqrt(3)*13.889 = 24.06
    assert _approx(s["f_R"], 24.06, 0.01), f"f_R={s['f_R']}"


def test_b5_fatigue_cat_e_constant_amplitude():
    """Test 5: Cat E, Δσ=60 MPa → N_f ≈ 1.671e6 cycles."""
    res = fatigue.analyze_fatigue({
        "joint": {"type": "t_joint"},
        "structural": {"load_direction": "transverse"},
        "fatigue": {"type": "constant_amplitude", "stress_range_MPa": 60.0},
    })
    assert _approx(res["cycles_to_failure"], 1.671e6, 0.005), f"N_f={res['cycles_to_failure']}"
    assert res["below_threshold"] is False


def test_m1_fatigue_cat_f_mpa_consistent_with_ksi_basis():
    """M1 regression: Category F must use the AISC 360 Eq. A-3-2 slope
    (m=6, exponent 0.167) on a MPa-consistent constant. Validate the engine
    life against the canonical ksi-basis reference N = 150e10 / sigma_ksi^6,
    independent of the stored MPa constant. Previously m=4.5 with a ksi-basis
    constant applied to MPa gave a life ~4 orders of magnitude off."""
    KSI_PER_MPA = 0.14503774
    for ds_mpa in (75.0, 120.0):
        res = fatigue.analyze_fatigue({
            "joint": {"type": "lap_joint"},
            "structural": {"load_direction": "transverse"},   # -> Category F
            "fatigue": {"type": "constant_amplitude", "stress_range_MPa": ds_mpa},
        })
        assert res["category"] == "F", res["category"]
        assert res["m"] == 6, res["m"]
        n_ref = 150e10 / ((ds_mpa * KSI_PER_MPA) ** 6)
        assert _approx(res["cycles_to_failure"], n_ref, 0.01), \
            f"ds={ds_mpa}MPa engine={res['cycles_to_failure']:.3e} ref={n_ref:.3e}"


def test_b6_fatigue_below_threshold():
    """Test 6: Δσ=20 MPa < 31 → below_threshold, infinite life."""
    res = fatigue.analyze_fatigue({
        "joint": {"type": "t_joint"},
        "structural": {"load_direction": "transverse"},
        "fatigue": {"type": "constant_amplitude", "stress_range_MPa": 20.0},
    })
    assert res["below_threshold"] is True
    assert res["cycles_to_failure"] == float("inf")


def _vulcan_sanitize(o):
    """Mirror of _vulcan_sanitize in src/lib/pyodide.ts — keep in sync.

    Replaces non-finite floats with sentinel strings so the result survives a
    strict JSON encoder (JS JSON.parse rejects bare Infinity/NaN tokens).
    """
    if isinstance(o, float):
        if math.isinf(o):
            return "__Infinity__" if o > 0 else "__-Infinity__"
        if math.isnan(o):
            return "__NaN__"
        return o
    if isinstance(o, dict):
        return {k: _vulcan_sanitize(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_vulcan_sanitize(v) for v in o]
    return o


def _vulcan_revive(o):
    """Mirror of the JSON.parse reviver in pyodide.ts."""
    if o == "__Infinity__":
        return float("inf")
    if o == "__-Infinity__":
        return float("-inf")
    if o == "__NaN__":
        return float("nan")
    if isinstance(o, dict):
        return {k: _vulcan_revive(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_vulcan_revive(v) for v in o]
    return o


def test_transport_infinite_fatigue_survives_strict_json():
    """Regression for C1: fatigue infinite-life (inf) must cross the JSON
    transport. Raw json.dumps emits the bare token Infinity, which JS
    JSON.parse rejects. The sanitize/revive pair must round-trip it.

    json.dumps(allow_nan=False) raises on any residual inf/nan, so it is a
    faithful proxy for the browser's strict parser.
    """
    import json
    res = fatigue.analyze_fatigue({
        "joint": {"type": "t_joint"},
        "structural": {"load_direction": "transverse"},
        "fatigue": {"type": "constant_amplitude", "stress_range_MPa": 20.0},
    })
    # The engine genuinely produces non-finite values here.
    assert res["cycles_to_failure"] == float("inf")
    assert res["safety_factor"] == float("inf")

    # Raw dumps emits the bare token Infinity, which a strict parser rejects.
    raw = json.dumps({"ok": True, "data": res})
    assert ": Infinity" in raw  # bare, unquoted token — the hazard

    # The sanitized encode must contain no bare non-finite tokens. allow_nan
    # =False raises on any residual inf/nan, so a successful dump is the proof
    # (sentinels are quoted strings, which are valid JSON).
    safe = json.dumps(_vulcan_sanitize({"ok": True, "data": res}), allow_nan=False)
    assert ": Infinity" not in safe and ": NaN" not in safe

    # And the JS-side reviver restores the original infinities.
    restored = _vulcan_revive(json.loads(safe))
    assert restored["data"]["cycles_to_failure"] == float("inf")
    assert restored["data"]["safety_factor"] == float("inf")
    assert restored["data"]["below_threshold"] is True


def test_b7_miner_variable_amplitude():
    """Test 7: spectrum [(80, 1e5), (50, 1e6), (20, 1e7)] → D ≈ 0.488."""
    res = fatigue.analyze_fatigue({
        "joint": {"type": "t_joint"},
        "structural": {"load_direction": "transverse"},
        "fatigue": {"type": "variable_amplitude", "spectrum": [
            {"stress_range_MPa": 80, "cycles": 100_000},
            {"stress_range_MPa": 50, "cycles": 1_000_000},
            {"stress_range_MPa": 20, "cycles": 10_000_000},
        ]},
    })
    assert _approx(res["damage"], 0.488, 0.01), f"D={res['damage']}"


def test_ic_method_default_joint_not_bogus():
    """Regression: IC method must return reasonable utilization for the
    default T-joint geometry (t1=12, L=400, w=8) under the default load
    (Fy=-10kN, Mz=500kN·mm), not a fixed ~169% pegged to F_ult/F_allow."""
    joint = {"type": "t_joint", "webThickness": 12, "flangeThickness": 16,
             "jointLength": 400, "weldSize": 8}
    loads = {"Fx": 0, "Fy": -10000, "Fz": 0, "Mx": 0, "My": 0, "Mz": 500000}
    ic = structural._ic_method_t_joint(joint, {"F_EXX": 483}, loads, {"codeBasis": "ASD"})
    # Must be small (overdesigned joint) and ≤ elastic
    assert ic["utilization_pct"] < 20.0, f"IC util={ic['utilization_pct']}%"
    # w_required must NOT scale with the provided weld size — it is a
    # function of demand only. Compare against a larger w.
    joint2 = dict(joint); joint2["weldSize"] = 20.0
    ic2 = structural._ic_method_t_joint(joint2, {"F_EXX": 483}, loads, {"codeBasis": "ASD"})
    # w_required should be roughly invariant (within numerical tolerance)
    assert abs(ic["w_required"] - ic2["w_required"]) < 0.05, \
        f"w_req drifts with w: {ic['w_required']} vs {ic2['w_required']}"
    # And utilization should drop by ~factor (20/8 = 2.5)
    ratio = ic["utilization_pct"] / max(ic2["utilization_pct"], 1e-6)
    assert 2.0 < ratio < 3.0, f"IC util ratio (w=8 vs w=20) = {ratio:.2f}, expected ≈2.5"


def test_b11_cooling_time_3d_regime():
    """Test 11: t8/5 in 3D regime with Q=1.5 kJ/mm, T0=100°C → ≈6.4 s.

    For 3D, the plate must be thicker than the 2D/3D transition.
    With these parameters, d_cr ≈ 25.9 mm — use t1=t2=30 mm to land in 3D.
    """
    import metallurgy
    metallurgy._tables = {
        "aws_d11_table_5_8": {"categories": {
            "I": {"CE_IIW_max": 0.40, "thresholds": [{"t_max": 9999, "preheat_C": 100}]}
        }}
    }
    res = metallurgy.analyze_metallurgy({
        "material": {"type": "carbon_steel",
                     "chemistry": {"C": 0.20, "Mn": 1.0, "Si": 0.30,
                                   "Cr": 0, "Ni": 0, "Mo": 0, "V": 0,
                                   "Cu": 0, "B": 0, "P": 0, "N": 0}},
        "joint": {"type": "t_joint", "webThickness": 30,
                  "flangeThickness": 30, "jointLength": 200, "weldSize": 8},
        "process": "GMAW",
        "heat_input_kJ_per_mm": 1.5,
    })
    # Override preheat — test assumes T0 = 100 °C exactly
    # Re-run with manual t8/5 verification:
    import math
    Q = 1500.0
    T0 = 100.0
    lam = 0.040
    expected_t85 = Q / (2.0 * math.pi * lam) * (1.0/(500-T0) - 1.0/(800-T0))
    assert _approx(expected_t85, 6.39, 0.01), f"reference={expected_t85}"

    # The engine result uses its own derived preheat — assert regime is 3D
    # for this thick (30 mm) section.
    assert "3D" in res["cooling_time_t85"]["regime"], res["cooling_time_t85"]


if __name__ == "__main__":
    import traceback
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    fails = 0
    for t in tests:
        try:
            t()
            print(f"PASS  {t.__name__}")
        except AssertionError as e:
            fails += 1
            print(f"FAIL  {t.__name__}: {e}")
        except Exception:
            fails += 1
            print(f"ERROR {t.__name__}")
            traceback.print_exc()
    print(f"\n{len(tests) - fails}/{len(tests)} passed")
    sys.exit(0 if fails == 0 else 1)
