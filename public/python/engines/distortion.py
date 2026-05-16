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
    elif jt == "lap_joint":
        return (
            joint.get("plate1Thickness", 12),
            joint.get("plate2Thickness", 12),
            joint.get("weldSize", 8),
            joint.get("jointLength", 200),
        )
    elif jt == "butt_joint":
        # Butt joints: use partial penetration depth or plate thickness as effective weld size
        t1 = joint.get("plate1Thickness", 12)
        t2 = joint.get("plate2Thickness", 12)
        weld_size = joint.get("partialPenetrationDepth", t1 * 0.7)
        return (t1, t2, weld_size, joint.get("jointLength", 200))
    return 12, 12, 8, 200


def predict_distortion(input_data: dict) -> dict:
    joint = input_data["joint"]
    joint_type = joint.get("type", "t_joint")

    t1, t2, weld_size, joint_length = _extract_thicknesses(joint)

    # For butt joints — distortion model intended for fillet welds
    if joint_type == "butt_joint":
        penetration = joint.get("penetration", "full")
        note = "Distortion model applies to fillet welds. Groove weld distortion depends on joint preparation, preheat, and welding sequence — consult AWS D1.1 Annex C for groove weld distortion control."
        # Still provide a rough estimate for butt joints
        t_avg = (t1 + t2) / 2.0
        groove_angle = joint.get("grooveAngle", 60.0)
        # Transverse shrinkage: ~0.2 * weld_width / t
        weld_width = 2.0 * weld_size * np.tan(np.radians(groove_angle / 2.0)) if groove_angle > 0 else weld_size
        trans_exp = 0.20 * weld_width
        trans_min = trans_exp * 0.5
        trans_max = trans_exp * 1.8
        long_exp = 0.02 * weld_size * joint_length / t_avg if t_avg > 0 else 0.0
        long_min = long_exp * 0.3
        long_max = long_exp * 2.0
        ang_exp = 0.0  # negligible angular for symmetric groove
        ang_min = 0.0
        ang_max = 0.5
        mitigations = [
            "Use balanced welding sequence (backstep or skip) to distribute heat",
            "Pre-set joint with opposite camber (counter-distortion)",
            "Minimize heat input per pass — use multiple smaller passes",
            "Clamp or fixture the assembly during welding",
            "Allow natural cooling between passes to reduce thermal buildup",
        ]
        return {
            "angular_deg": {"min": round(ang_min, 3), "expected": round(ang_exp, 3), "max": round(ang_max, 3)},
            "transverse_shrinkage_mm": {"min": round(trans_min, 3), "expected": round(trans_exp, 3), "max": round(trans_max, 3)},
            "longitudinal_shrinkage_mm": {"min": round(long_min, 3), "expected": round(long_exp, 3), "max": round(long_max, 3)},
            "mitigations": mitigations,
            "note": note,
        }

    # --- Fillet weld distortion (T, Lap, Corner) ---
    # Angular distortion (Watanabe & Satoh / Masubuchi model)
    # theta (rad) = 0.0388 * (Aw / t^2) where Aw = weld cross-section area (mm^2)
    # Aw approx = 0.5 * w^2 for fillet weld
    Aw = 0.5 * weld_size**2  # mm^2
    t_base = t1  # governing plate (the one experiencing bending)

    if t_base < 1.0:
        t_base = 1.0

    # Angular distortion — Masubuchi's empirical formula
    # theta_rad = 0.0388 * Aw / t^2  (valid for single-sided fillet)
    angular_rad_exp = 0.0388 * Aw / (t_base**2)

    # Account for double-sided welds (T-joint both sides, corner both, lap both_sides)
    weld_config = joint.get("weldConfig", "both_sides" if joint_type == "t_joint" else "one_side")
    if weld_config in ("both_sides", "both"):
        # Double-sided: angular largely cancels but residual ~20% of one-side
        angular_rad_exp *= 0.20
    elif joint_type == "t_joint":
        # Single-sided T-joint: full angular
        angular_rad_exp *= 1.0

    angular_deg_exp = np.degrees(angular_rad_exp)
    angular_deg_min = angular_deg_exp * 0.4
    angular_deg_max = angular_deg_exp * 2.5

    # Transverse shrinkage
    # S_t = 0.2 * Aw / t + 0.05 * d  (mm)  where d is root opening (~0 for fillet)
    trans_exp = 0.20 * Aw / t_base + 0.05 * 0.0
    trans_exp = max(trans_exp, 0.01)
    trans_min = trans_exp * 0.5
    trans_max = trans_exp * 1.8

    # Longitudinal shrinkage
    # S_l = 0.12 * A_weld * L / (A_cross * E)  simplified
    # Or empirically: ~0.02 * w per unit length for fillet
    # Use: S_l_per_unit = alpha_T * (T_peak - T0) * (Aw / A_x)
    # Simplified: 0.015 * weld_size * joint_length / 1000 (in mm for the full joint length)
    long_exp = 0.015 * weld_size * (joint_length / 1000.0)
    long_min = long_exp * 0.3
    long_max = long_exp * 2.0

    # Round for display
    angular_deg_exp = round(float(angular_deg_exp), 3)
    angular_deg_min = round(float(angular_deg_min), 3)
    angular_deg_max = round(float(angular_deg_max), 3)
    trans_exp = round(float(trans_exp), 3)
    trans_min = round(float(trans_min), 3)
    trans_max = round(float(trans_max), 3)
    long_exp = round(float(long_exp), 3)
    long_min = round(float(long_min), 3)
    long_max = round(float(long_max), 3)

    # Mitigations
    mitigations = []

    if angular_deg_exp > 2.0:
        mitigations.append("Significant angular distortion expected — use pre-setting or strong-backs")
    if angular_deg_exp > 1.0 or angular_deg_max > 2.0:
        mitigations.append("Alternate weld sequence (backstep/skip) to balance heat input along joint length")
    if weld_config == "one_side":
        mitigations.append("Single-sided fillet increases angular distortion — consider double-sided if geometry permits")
    if trans_max > 1.0:
        mitigations.append("Transverse shrinkage may be significant — allow tolerance in fit-up dimensions")
    mitigations.append("Clamp or tack weld at adequate intervals before final welding")
    mitigations.append("Minimize heat input per pass — use smaller electrodes / lower current settings")
    if joint_type == "t_joint":
        mitigations.append("For T-joints: weld both sides alternately to balance angular rotation")

    note = "Estimates based on empirical fillet weld shrinkage models (Masubuchi, Watanabe & Satoh). Actual distortion depends on fixturing, sequence, and heat input. Values represent expected range for free-shrinkage conditions."

    return {
        "angular_deg": {"min": angular_deg_min, "expected": angular_deg_exp, "max": angular_deg_max},
        "transverse_shrinkage_mm": {"min": trans_min, "expected": trans_exp, "max": trans_max},
        "longitudinal_shrinkage_mm": {"min": long_min, "expected": long_exp, "max": long_max},
        "mitigations": mitigations,
        "note": note,
    }
