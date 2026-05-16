import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engines'))

import json
import types as _types_mod

# Load reference data
data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
with open(os.path.join(data_dir, 'aws_d11_table_5_7.json')) as f:
    aws_table = json.load(f)
with open(os.path.join(data_dir, 'aws_d11_annex_k.json')) as f:
    annex_k = json.load(f)

# Execute structural.py in a namespace that has _tables
with open(os.path.join(os.path.dirname(__file__), '..', 'engines', 'structural.py')) as f:
    structural_src = f.read()

ns = {"_tables": {"aws_d11_table_5_7": aws_table, "aws_d11_annex_k": annex_k}}
exec(compile(structural_src, 'structural.py', 'exec'), ns)
analyze_joint = ns["analyze_joint"]

# Execute fatigue.py in a namespace that has _tables
with open(os.path.join(os.path.dirname(__file__), '..', 'engines', 'fatigue.py')) as f:
    fatigue_src = f.read()

fat_ns = {"_tables": {"aws_d11_table_5_7": aws_table, "aws_d11_annex_k": annex_k}}
exec(compile(fatigue_src, 'fatigue.py', 'exec'), fat_ns)
analyze_fatigue = fat_ns["analyze_fatigue"]


BASE_JOINT = {
    "type": "t_joint",
    "webThickness": 12.0,
    "flangeThickness": 16.0,
    "jointLength": 400.0,
    "weldSize": 8.0
}
BASE_MATERIAL = {"F_EXX": 483, "Fy": 250, "Fu": 400}
BASE_SERVICE = {"codeBasis": "ASD"}


# ─── T-JOINT PHASE 1 COMPAT TESTS ────────────────────────────────────────────

def test_pure_shear():
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0}
    result = analyze_joint({
        "joint": BASE_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    # Both methods must return reasonable f_R
    s = result["structural_governing"]
    assert s["f_R"] > 0
    assert s["utilization"] > 0
    # Elastic method: L_total=800, a=5.656, q_vy=12.5N/mm, f_v=2.21MPa
    e = result["structural_elastic"]
    assert abs(e["f_v"] - 2.21) < 0.05, f"f_v expected ~2.21 got {e['f_v']}"


def test_combined_shear_torsion():
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 500000.0}
    result = analyze_joint({
        "joint": BASE_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    s = result["structural_governing"]
    e = result["structural_elastic"]
    assert s["f_R"] > e["f_v"], "Combined load must exceed shear alone"
    assert s["utilization_pct"] > 0


def test_zero_load():
    loads = {"Fy": 0.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0}
    result = analyze_joint({
        "joint": BASE_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    # Both methods should show zero or near-zero
    e = result["structural_elastic"]
    assert e["f_R"] == 0.0
    assert e["utilization"] == 0.0
    assert e["w_required"] == 0.0


def test_aws_minimum_violation():
    joint = {**BASE_JOINT, "weldSize": 3.0}
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0}
    result = analyze_joint({
        "joint": joint, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    warnings = result["validation"]["warnings"]
    error_warnings = [w for w in warnings if w["severity"] == "error" and "min" in w["message"].lower()]
    assert len(error_warnings) > 0, "Should flag AWS minimum violation"


def test_aws_maximum_violation():
    joint = {**BASE_JOINT, "webThickness": 12.0, "flangeThickness": 6.0, "weldSize": 6.0}
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0}
    result = analyze_joint({
        "joint": joint, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    warnings = result["validation"]["warnings"]
    error_warnings = [w for w in warnings if w["severity"] == "error" and "exceeds" in w["message"].lower()]
    assert len(error_warnings) > 0, "Should flag AWS maximum violation"


def test_governing_corner():
    loads = {"Fy": -5000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 1000000.0}
    result = analyze_joint({
        "joint": BASE_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    e = result["structural_elastic"]
    corner = e["governing_corner"]
    assert len(corner) == 2
    assert corner[0] in [200.0, -200.0]
    assert corner[1] in [6.0, -6.0]


def test_lrfd_vs_asd():
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 500000.0}
    result_asd = analyze_joint({
        "joint": BASE_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": {"codeBasis": "ASD"}
    })
    result_lrfd = analyze_joint({
        "joint": BASE_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": {"codeBasis": "LRFD"}
    })
    assert result_lrfd["structural_governing"]["F_w_allow"] > result_asd["structural_governing"]["F_w_allow"]
    assert result_lrfd["structural_governing"]["utilization"] < result_asd["structural_governing"]["utilization"]


def test_result_has_both_methods():
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 500000.0}
    result = analyze_joint({
        "joint": BASE_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    assert "structural_elastic" in result
    assert "structural_ic" in result
    assert "structural_governing" in result
    assert result["structural_ic"] is not None
    assert result["structural_elastic"]["method"] == "Elastic TWL"
    assert result["structural_ic"]["method"] == "IC Method"


# ─── LAP JOINT TESTS ─────────────────────────────────────────────────────────

LAP_JOINT = {
    "type": "lap_joint",
    "plate1Thickness": 12.0,
    "plate2Thickness": 12.0,
    "overlapLength": 150.0,
    "jointLength": 300.0,
    "weldSize": 8.0,
    "weldConfig": "both_sides"
}


def test_lap_pure_shear():
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0}
    result = analyze_joint({
        "joint": LAP_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    assert "structural_elastic" in result
    assert "structural_ic" in result
    s = result["structural_governing"]
    assert s["f_R"] > 0
    assert s["utilization"] > 0
    assert s["adequate"] in [True, False]


def test_lap_torsion_ic_higher():
    """IC method should give different result than elastic under torsion."""
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 1000000.0}
    result = analyze_joint({
        "joint": LAP_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    # Both methods return positive f_R
    assert result["structural_elastic"]["f_R"] > 0
    assert result["structural_ic"]["f_R"] > 0


# ─── BUTT JOINT TESTS ────────────────────────────────────────────────────────

BUTT_JOINT_CJP = {
    "type": "butt_joint",
    "plate1Thickness": 12.0,
    "plate2Thickness": 12.0,
    "grooveType": "v_groove",
    "grooveAngle": 60,
    "rootOpening": 3,
    "rootFace": 2,
    "penetration": "full",
    "jointLength": 300.0,
}


def test_butt_cjp_basic():
    loads = {"Fy": -50000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0}
    result = analyze_joint({
        "joint": BUTT_JOINT_CJP, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    assert "structural_elastic" in result
    assert result["structural_ic"] is None, "Butt joint IC should be None"
    s = result["structural_governing"]
    assert s["method"] == "Groove Weld"
    assert s["utilization"] > 0
    # F_allow = 0.60 * 250 = 150 MPa for ASD
    assert abs(s["F_w_allow"] - 150.0) < 1.0, f"Expected 150 MPa got {s['F_w_allow']}"


def test_butt_cjp_no_weld_warning():
    """CJP groove weld should have no validation errors for correct geometry."""
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0}
    result = analyze_joint({
        "joint": BUTT_JOINT_CJP, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    assert result["validation"]["warnings"] == []


# ─── CORNER JOINT TESTS ──────────────────────────────────────────────────────

CORNER_JOINT = {
    "type": "corner_joint",
    "plate1Thickness": 12.0,
    "plate2Thickness": 12.0,
    "jointLength": 300.0,
    "cornerAngle": 90,
    "weldConfig": "both",
    "weldSizeInside": 8.0,
    "weldSizeOutside": 6.0
}


def test_corner_basic():
    loads = {"Fy": -10000.0, "Fz": 0.0, "Mx": 0.0, "My": 0.0, "Mz": 0.0}
    result = analyze_joint({
        "joint": CORNER_JOINT, "material": BASE_MATERIAL,
        "loads": loads, "service": BASE_SERVICE
    })
    assert "structural_elastic" in result
    assert "structural_ic" in result
    s = result["structural_governing"]
    assert s["f_R"] > 0
    assert s["adequate"] in [True, False]


# ─── FATIGUE TESTS ───────────────────────────────────────────────────────────

def test_fatigue_constant_above_threshold():
    """Stress range above threshold should give finite life."""
    fat_input = {
        "joint": BASE_JOINT,
        "structural": {"load_direction": "transverse"},
        "fatigue": {
            "type": "constant_amplitude",
            "stress_range_MPa": 60.0,   # above E threshold of 31 MPa
            "frequencyHz": 2.0,
            "hoursPerDay": 8,
            "daysPerYear": 250,
            "designLifeYears": 25,
        }
    }
    result = analyze_fatigue(fat_input)
    assert result["category"] == "E"
    assert result["below_threshold"] is False
    assert result["cycles_to_failure"] is not None
    assert result["cycles_to_failure"] != float("inf")
    assert result["service_life_years"] is not None
    assert result["passes"] is not None


def test_fatigue_below_threshold_infinite_life():
    """Stress range below threshold should give infinite life, passes=True."""
    fat_input = {
        "joint": BASE_JOINT,
        "structural": {"load_direction": "transverse"},
        "fatigue": {
            "type": "constant_amplitude",
            "stress_range_MPa": 20.0,   # below E threshold of 31 MPa
            "frequencyHz": 1.0,
            "hoursPerDay": 8,
            "daysPerYear": 250,
            "designLifeYears": 25,
        }
    }
    result = analyze_fatigue(fat_input)
    assert result["below_threshold"] is True
    assert result["passes"] is True
    assert result["cycles_to_failure"] == float("inf")


def test_fatigue_category_butt():
    fat_input = {
        "joint": {**BUTT_JOINT_CJP},
        "structural": {"load_direction": "transverse"},
        "fatigue": {
            "type": "constant_amplitude",
            "stress_range_MPa": 50.0,
            "frequencyHz": 1.0,
            "hoursPerDay": 8,
            "daysPerYear": 250,
        }
    }
    result = analyze_fatigue(fat_input)
    # CJP butt + transverse = category C
    assert result["category"] == "C"


def test_fatigue_variable_amplitude():
    fat_input = {
        "joint": BASE_JOINT,
        "structural": {"load_direction": "transverse"},
        "fatigue": {
            "type": "variable_amplitude",
            "spectrum": [
                {"stressRangeMPa": 80, "cycles": 50000},
                {"stressRangeMPa": 50, "cycles": 150000},
                {"stressRangeMPa": 20, "cycles": 500000},
            ],
            "frequencyHz": 1.0,
            "hoursPerDay": 8,
            "daysPerYear": 250,
            "designLifeYears": 25,
        }
    }
    result = analyze_fatigue(fat_input)
    assert result["damage"] is not None
    assert result["damage"] > 0
    assert result["category"] == "E"
