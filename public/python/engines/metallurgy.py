import numpy as np


def _extract_thicknesses(joint):
    """Normalize geometry to (t1, t2, weld_size, joint_length) regardless of joint type."""
    jt = joint.get("type", "t_joint")
    if jt == "t_joint":
        return (
            joint.get("webThickness", 12),
            joint.get("flangeThickness", 16),
            joint.get("weldSize", 8),
            joint.get("jointLength", 200),
        )
    elif jt == "corner_joint":
        weld_size = max(joint.get("weldSizeInside", 6), joint.get("weldSizeOutside", 0))
        return (
            joint.get("plate1Thickness", 12),
            joint.get("plate2Thickness", 12),
            weld_size,
            joint.get("jointLength", 200),
        )
    elif jt in ("lap_joint", "butt_joint"):
        return (
            joint.get("plate1Thickness", 12),
            joint.get("plate2Thickness", 12),
            joint.get("weldSize", 8),
            joint.get("jointLength", 200),
        )
    return 12, 12, 8, 200


def _aws_table_5_8_lookup(CE_IIW, d_combined):
    """Look up preheat from AWS D1.1 Table 5.8 based on CE_IIW and thickness."""
    table = _tables.get("aws_d11_table_5_8", {})
    categories = table.get("categories", {})
    # Find matching category by CE_IIW
    best_cat = None
    best_ce_max = float("inf")
    for cat_key, cat_data in categories.items():
        ce_max = cat_data.get("CE_IIW_max", float("inf"))
        if CE_IIW <= ce_max and ce_max < best_ce_max:
            best_cat = cat_data
            best_ce_max = ce_max
    if best_cat is None:
        # Default to category III (conservative)
        best_cat = categories.get("III", {"thresholds": [{"t_max": 9999, "preheat_C": 150}]})
    thresholds = best_cat.get("thresholds", [])
    for entry in thresholds:
        if d_combined <= entry["t_max"]:
            return float(entry["preheat_C"])
    return 150.0


def _recommended_heat_input(material, t1):
    """Return (min, max) heat input in kJ/mm for given material and thickness."""
    mat_type = material.get("type", "carbon_steel")
    if mat_type == "aluminum":
        return (0.5, 1.5)
    elif mat_type == "stainless":
        return (0.5, 1.0)   # Low heat input to avoid sensitization
    else:  # carbon_steel
        if t1 < 6:
            return (0.5, 1.5)
        elif t1 < 12:
            return (0.8, 2.5)
        elif t1 < 25:
            return (1.2, 3.5)
        else:
            return (1.5, 5.0)


def analyze_metallurgy(input_data: dict) -> dict:
    material = input_data["material"]
    joint = input_data["joint"]
    process = input_data.get("process", "GMAW")
    heat_input_kJ_per_mm = float(input_data.get("heat_input_kJ_per_mm", 1.5))

    t1, t2, weld_size, joint_length = _extract_thicknesses(joint)
    mat_type = material.get("type", "carbon_steel")

    # --- Carbon equivalents ---
    chem = material.get("chemistry", {})

    if mat_type == "carbon_steel":
        C  = chem.get("C", 0.0)
        Mn = chem.get("Mn", 0.0)
        Si = chem.get("Si", 0.0)
        Cr = chem.get("Cr", 0.0)
        Ni = chem.get("Ni", 0.0)
        Mo = chem.get("Mo", 0.0)
        V  = chem.get("V", 0.0)
        Cu = chem.get("Cu", 0.0)
        B  = chem.get("B", 0.0)
        P  = chem.get("P", 0.0)
        N  = chem.get("N", 0.0)

        # IIW formula (ISO 92)
        CE_IIW = C + Mn / 6.0 + (Cr + Mo + V) / 5.0 + (Ni + Cu) / 15.0

        # Ito-Bessyo Pcm
        Pcm = C + Si / 30.0 + (Mn + Cu + Cr) / 20.0 + Ni / 60.0 + Mo / 15.0 + V / 10.0 + 5.0 * B

        # Yurioka CET
        CET = C + (Mn + Mo) / 10.0 + (Cr + Cu) / 20.0 + Ni / 40.0

    elif mat_type == "stainless":
        # Approximate CE using modified formula for austenitic SS
        C  = chem.get("C", 0.0)
        Mn = chem.get("Mn", 0.0)
        Cr = chem.get("Cr", 18.0)
        Ni = chem.get("Ni", 10.0)
        Mo = chem.get("Mo", 0.0)
        Si = chem.get("Si", 0.0)
        # For stainless use Cr-equivalent / Ni-equivalent ratio (informational)
        CE_IIW = C + Mn / 6.0 + (Cr + Mo) / 5.0 + Ni / 15.0
        Pcm = C + Si / 30.0 + Mn / 20.0 + Cr / 20.0 + Ni / 60.0 + Mo / 15.0
        CET = C + (Mn + Mo) / 10.0 + Cr / 20.0 + Ni / 40.0
    else:  # aluminum — CEs not directly applicable, return nominal zeros
        CE_IIW = 0.0
        Pcm = 0.0
        CET = 0.0

    # --- Preheat ---
    d_combined = max(t1, t2)  # use governing (thickest) member

    if mat_type == "aluminum":
        # Aluminum does not use preheat in the same sense
        aws_preheat_C = 0.0
        yurioka_C = 0.0
        required_C = 0.0
        method_governing = "N/A (aluminum)"
    elif mat_type == "stainless":
        aws_preheat_C = 0.0
        yurioka_C = 0.0
        required_C = 0.0
        method_governing = "N/A (stainless)"
    else:
        # AWS D1.1 Table 5.8 lookup
        aws_preheat_C = _aws_table_5_8_lookup(CE_IIW, d_combined)

        # Yurioka formula (kJ/mm method): T_p = 350 * sqrt(CET - 0.1) for t > 20mm
        # Conservative minimum: 0°C minimum
        if CET > 0.10:
            yurioka_C = max(0.0, 350.0 * ((CET - 0.10) ** 0.5))
        else:
            yurioka_C = 0.0

        # Also check Pcm: T_p = 1440 * Pcm - 392 * (rough approximation per ISO 13916)
        pcm_preheat = max(0.0, 1440.0 * Pcm - 392.0)

        required_C = max(aws_preheat_C, yurioka_C, pcm_preheat)
        method_governing = "AWS Table 5.8" if aws_preheat_C >= yurioka_C else "Yurioka CET"

    # --- Heat input ---
    hi_min, hi_max = _recommended_heat_input(material, t1)
    # Clamp provided heat input to recommended range for display
    hi_recommended = min(max(heat_input_kJ_per_mm, hi_min), hi_max)

    # --- t8/5 cooling time (Rosenthal 2D/3D heat-flow model) ---
    # The user-supplied heat_input_kJ_per_mm is the *arc* heat input
    # Q_arc = 60·V·I·η_arc / (1000·v).  Process-specific arc efficiency
    # is already incorporated upstream when the user computes Q_arc, so
    # we DO NOT reapply it here.  (Some references multiply by an
    # additional "melting efficiency" of ~0.9 — omitted for clarity.)
    import math
    Q = heat_input_kJ_per_mm * 1000.0   # J/mm
    T0 = required_C                      # preheat temperature, °C
    T_top = 800.0
    T_bot = 500.0
    dT_top = T_top - T0
    dT_bot = T_bot - T0

    # Steel thermal properties (per Easterling, Welding Metallurgy)
    lam   = 0.040     # W/(mm·K)  thermal conductivity
    rho_c = 0.0044    # J/(mm³·K) volumetric heat capacity

    # 2D/3D transition thickness — derived by equating the 3D and 2D
    # Rosenthal t8/5 expressions:
    #   d_cr² = Q / (2·ρc) · (1/ΔT500 + 1/ΔT800)
    if dT_top > 0 and dT_bot > 0:
        d_cr = math.sqrt(max(Q / (2.0 * rho_c) * (1.0/dT_bot + 1.0/dT_top), 0.001))
    else:
        d_cr = 1.0

    t_eff = min(t1, t2)   # the thinner member governs the regime

    if dT_top <= 0 or dT_bot <= 0:
        t85 = 0.1
        regime = "n/a (preheat ≥ 500 °C)"
    elif t_eff >= d_cr:
        # 3D (thick plate): t8/5 = Q / (2π·λ) · [1/ΔT500 - 1/ΔT800]
        t85 = Q / (2.0 * math.pi * lam) * (1.0/dT_bot - 1.0/dT_top)
        regime = "3D (thick plate)"
    else:
        # 2D (thin plate):
        # t8/5 = Q² / (4π·λ·ρc·t²) · [1/ΔT500² - 1/ΔT800²]
        t85 = (Q ** 2) / (4.0 * math.pi * lam * rho_c * (t_eff ** 2)) * (1.0/dT_bot**2 - 1.0/dT_top**2)
        regime = "2D (thin plate)"

    t85 = round(float(max(t85, 0.1)), 1)

    # Recommended t8/5 range (material-dependent)
    if mat_type == "carbon_steel":
        if CE_IIW > 0.45:
            t85_range = (10.0, 40.0)  # slow cooling to avoid cold cracking
        else:
            t85_range = (5.0, 25.0)
    elif mat_type == "stainless":
        t85_range = (3.0, 15.0)  # avoid sensitization band
    else:  # aluminum
        t85_range = (1.0, 10.0)

    # --- PWHT ---
    pwht_required = bool(material.get("requires_pwht", False))
    # Also trigger PWHT if Pcm > 0.35 or CE_IIW > 0.65 for carbon steel
    if mat_type == "carbon_steel" and (Pcm > 0.35 or CE_IIW > 0.65):
        pwht_required = True

    # --- Hydrogen class (per process and quality level) ---
    h_class_map = {
        "GTAW":  "H4",
        "GMAW":  "H8",
        "FCAW":  "H8",
        "SMAW":  "H16",
        "SAW":   "H8",
    }
    hydrogen_class = h_class_map.get(process, "H16")
    if process == "SMAW" and mat_type == "carbon_steel":
        # Assume baked low-H electrodes for structural
        hydrogen_class = "H8"

    return {
        "carbon_equivalent": {
            "CE_IIW": round(CE_IIW, 4),
            "Pcm": round(Pcm, 4),
            "CET": round(CET, 4),
        },
        "preheat": {
            "aws_table_C": round(aws_preheat_C, 1),
            "yurioka_C": round(yurioka_C, 1),
            "required_C": round(required_C, 1),
            "method_governing": method_governing,
        },
        "heat_input": {
            "min_kJ_per_mm": round(hi_min, 2),
            "max_kJ_per_mm": round(hi_max, 2),
            "recommended_kJ_per_mm": round(hi_recommended, 2),
        },
        "cooling_time_t85": {
            "value_s": t85,
            "regime": regime,
            "transition_thickness_mm": round(d_cr, 1),
            "recommended_range_s": [t85_range[0], t85_range[1]],
        },
        "pwht_required": pwht_required,
        "hydrogen_class": hydrogen_class,
    }
