import numpy as np
from scipy.optimize import minimize, brentq
import math

# ─── ENTRY POINT ─────────────────────────────────────────────────────────────

def analyze_joint(input_data: dict) -> dict:
    # GOVERNING-METHOD POLICY
    # -----------------------
    # For joints analysed by both methods we report whichever gives the higher
    # utilization. Note the two ratios are built on *different* bases: the
    # Elastic TWL ratio is an allowable-stress check (f_R / F_w_allow), while
    # the IC ratio is an ultimate-strength check (P_applied / P_allow, with
    # P_allow = P_n/Omega or phi*P_n). Mixing them is intentionally
    # conservative — taking the max never reports a capacity higher than the
    # more cautious of the two methods. The IC method also models only the
    # in-plane Fy + Mz demand; the Elastic method carries the full 6-DOF load,
    # so the max() rule guarantees out-of-plane components are never dropped
    # from the governing check.
    joint = input_data["joint"]
    material = input_data["material"]
    loads = input_data["loads"]       # single static load case (first static case)
    service = input_data["service"]
    joint_type = joint.get("type", "t_joint")

    if joint_type == "t_joint":
        elastic = _elastic_twl_t_joint(joint, material, loads, service)
        ic = _ic_method_t_joint(joint, material, loads, service)
        governing = elastic if elastic.get("utilization", 0) >= ic.get("utilization", 0) else ic
    elif joint_type == "lap_joint":
        elastic = _elastic_twl_lap(joint, material, loads, service)
        ic = _ic_method_lap(joint, material, loads, service)
        governing = elastic if elastic.get("utilization", 0) >= ic.get("utilization", 0) else ic
    elif joint_type == "butt_joint":
        return _butt_joint_analysis(joint, material, loads, service)
    elif joint_type == "corner_joint":
        elastic = _elastic_twl_corner(joint, material, loads, service)
        ic = _ic_method_corner(joint, material, loads, service)
        governing = elastic if elastic.get("utilization", 0) >= ic.get("utilization", 0) else ic
    elif joint_type == "edge":
        elastic = _elastic_twl_edge(joint, material, loads, service)
        governing = elastic
        validation = _check_aws_constraints_generic(joint, governing)
        symbol = _generate_symbol_data(joint, governing)
        return {
            "structural_elastic": elastic,
            "structural_ic": None,
            "structural_governing": governing,
            "validation": validation,
            "symbol": symbol
        }
    elif joint_type == "cruciform":
        elastic = _elastic_twl_cruciform(joint, material, loads, service)
        governing = elastic
        validation = _check_aws_constraints_generic(joint, governing)
        symbol = _generate_symbol_data(joint, governing)
        return {
            "structural_elastic": elastic,
            "structural_ic": None,
            "structural_governing": governing,
            "validation": validation,
            "symbol": symbol
        }
    else:
        raise ValueError(f"Unknown joint type: {joint_type}")

    validation = _check_aws_constraints_generic(joint, governing)
    symbol = _generate_symbol_data(joint, governing)
    return {
        "structural_elastic": elastic,
        "structural_ic": ic,
        "structural_governing": governing,
        "validation": validation,
        "symbol": symbol
    }


# ─── T-JOINT ─────────────────────────────────────────────────────────────────

def _elastic_twl_t_joint(joint, material, loads, service):
    """Elastic TWL method — T-joint, both sides fillet."""
    t1 = joint.get("webThickness", 12)
    t2 = joint.get("flangeThickness", 16)
    L = joint.get("jointLength", 200)
    w = joint.get("weldSize", 8)
    F_EXX = material.get("F_EXX", 483)

    L_total = 2.0 * L
    I_ux = 2.0 * L * (t1 / 2.0)**2
    I_uy = 2.0 * (L**3 / 12.0)
    J_u = I_ux + I_uy

    a = 0.707 * w
    Fx = loads.get("Fx", 0.0)
    Fy = loads.get("Fy", 0.0)
    Fz = loads.get("Fz", 0.0)
    Mx = loads.get("Mx", 0.0)
    My = loads.get("My", 0.0)
    Mz = loads.get("Mz", 0.0)

    # Corner coordinate convention: rx = along weld (= ±L/2),
    #                                ry = across web (= ±t1/2).
    # Direct shears are uniform line loads along their force axis:
    #   Fx is a longitudinal (along-weld) load → contributes to q_along (x-axis)
    #   Fy is a transverse (across-web) load  → contributes to q_across (y-axis)
    #   Fz is an out-of-plane (peel) load     → contributes to q_peel  (z-axis)
    # Torsion Mz creates an in-plane shear tangent to the position vector:
    #   q_tx (along weld) = -Mz·ry / J_u
    #   q_ty (across web) = +Mz·rx / J_u
    # Bending Mx (out-of-plane) at extreme fibre c = t1/2 produces a peel
    # stress on the throat (q_peel), not an in-plane component.
    q_vx = Fx / L_total              # along-weld direct shear
    q_vy = Fy / L_total              # across-web direct shear
    q_vz = Fz / L_total              # peel direct shear
    c_x = t1 / 2.0
    q_bx = Mx * c_x / I_ux if I_ux > 0 else 0.0   # peel from Mx
    c_y = L / 2.0
    q_by = My * c_y / I_uy if I_uy > 0 else 0.0   # along-weld bending from My

    corners = [(L/2, t1/2), (L/2, -t1/2), (-L/2, t1/2), (-L/2, -t1/2)]
    max_q_R = 0.0
    governing_corner = corners[0]
    for (rx, ry) in corners:
        q_tx = -Mz * ry / J_u if J_u > 0 else 0.0
        q_ty =  Mz * rx / J_u if J_u > 0 else 0.0
        q_along  = q_tx + q_by + q_vx       # along-weld (x) components
        q_across = q_ty + q_vy              # across-web (y) components
        q_peel   = q_vz + q_bx              # out-of-plane (z) components
        q_R = np.sqrt(q_along**2 + q_across**2 + q_peel**2)
        if q_R > max_q_R:
            max_q_R = q_R
            governing_corner = (rx, ry)

    f_R = max_q_R / a if a > 0 else 0.0
    F_w_allow = _allowable_stress(service, F_EXX)
    utilization = f_R / F_w_allow if F_w_allow > 0 else 0.0
    w_required = max_q_R / (0.707 * F_w_allow) if F_w_allow > 0 else 0.0
    f_t_val = abs(Mz * (t1/2) / J_u) / a if (J_u > 0 and a > 0) else 0.0
    f_b_val = abs(q_bx) / a if a > 0 else 0.0

    return {
        "method": "Elastic TWL",
        "f_v": round(math.hypot(q_vx, q_vy) / a, 2) if a > 0 else 0.0,
        "f_t": round(f_t_val, 2),
        "f_b": round(f_b_val, 2),
        "f_R": round(f_R, 2),
        "F_w_allow": round(F_w_allow, 2),
        "utilization": round(utilization, 4),
        "utilization_pct": round(utilization * 100, 1),
        "w_required": round(w_required, 2),
        "w_provided": w,
        "adequate": bool(w >= w_required),
        "governing_corner": list(governing_corner),
        "L_total": L_total,
        "I_ux": round(I_ux, 2),
        "J_u": round(J_u, 2)
    }


def _ic_method_t_joint(joint, material, loads, service):
    """
    Instantaneous Center method (AISC Manual Part 8 / Tide) for T-joint
    under combined in-plane shear Fy + torsion Mz.

    Note: this formulation handles the vertical shear Fy at eccentricity
    e = Mz/Fy only. Longitudinal shear (Fx), peel (Fz) and out-of-plane
    bending (Mx) are not modelled here — they are fully captured by the
    Elastic TWL method, and analyze_joint() reports the larger (more
    conservative) utilization of the two, so those components are never
    silently dropped from the governing check.
    """
    t1 = joint.get("webThickness", 12)
    L = joint.get("jointLength", 200)
    w = joint.get("weldSize", 8)
    F_EXX = material.get("F_EXX", 483)

    Fy = loads.get("Fy", 0.0)
    Mz = loads.get("Mz", 0.0)
    P = abs(Fy)

    # Two parallel weld lines at x = ±t1/2, each length L
    N_per_line = 50
    elem_len = L / N_per_line
    elements = []
    for sign in [-1, 1]:
        x0 = sign * t1 / 2.0
        for i in range(N_per_line):
            y = -L/2 + L * (i + 0.5) / N_per_line
            elements.append((x0, y))
    total_weld_L = 2.0 * L

    if P < 1e-9:
        # No vertical shear: IC method not meaningful — defer to Elastic.
        return _zero_result("IC Method", w, _allowable_stress(service, F_EXX))

    # Pure shear (e ≈ 0) → IC at infinity, all elements fully mobilized
    if abs(Mz) < 1e-6 * abs(Fy) * L:
        P_n = _ic_capacity_pure_shear(elements, elem_len, w, F_EXX)
        return _ic_result_from_capacity(P_n, P, w, service, F_EXX, total_weld_L)

    P_n, x_ic = _ic_capacity(elements, elem_len, w, F_EXX, Fy, Mz)
    return _ic_result_from_capacity(P_n, P, w, service, F_EXX, total_weld_L, x_ic)


# ─── LAP JOINT ───────────────────────────────────────────────────────────────

def _elastic_twl_lap(joint, material, loads, service):
    """
    Lap joint: two plates overlapping, fillet welds along the overlap edges.
    """
    t1 = joint.get("plate1Thickness", joint.get("webThickness", 10))
    t2 = joint.get("plate2Thickness", joint.get("flangeThickness", 10))
    L_j = joint.get("overlapLength", joint.get("jointLength", 200))
    w = joint["weldSize"]
    F_EXX = material.get("F_EXX", 483)

    L_total = 2.0 * L_j
    a = 0.707 * w

    Fx = loads.get("Fx", 0.0)
    Fy = loads.get("Fy", 0.0)
    Fz = loads.get("Fz", 0.0)
    Mz = loads.get("Mz", 0.0)

    q_vx = Fx / L_total              # along-weld direct shear (longitudinal)
    q_vy = Fy / L_total              # across-weld in-plane direct shear
    q_vz = Fz / L_total              # out-of-plane (peel) direct shear

    # Peel stress from eccentricity of the in-plane load through the overlap
    e = t1 / 2.0 + t2 / 2.0
    M_peel = math.hypot(Fx, Fy) * e
    I_u = 2.0 * (L_j**3 / 12.0)
    J_u = I_u

    q_peel = M_peel * (L_j / 2.0) / I_u if I_u > 0 else 0.0
    q_t = abs(Mz) * (L_j / 2.0) / J_u if J_u > 0 else 0.0

    # Combine the two orthogonal in-plane direct shears, then add torsion.
    q_v_inplane = math.hypot(q_vx, q_vy)
    q_R = np.sqrt((q_v_inplane + q_t)**2 + (abs(q_vz) + q_peel)**2)
    f_R = q_R / a if a > 0 else 0.0

    F_w_allow = _allowable_stress(service, F_EXX)
    utilization = f_R / F_w_allow if F_w_allow > 0 else 0.0
    w_required = q_R / (0.707 * F_w_allow) if F_w_allow > 0 else 0.0

    return {
        "method": "Elastic TWL",
        "f_v": round(q_v_inplane / a, 2) if a > 0 else 0.0,
        "f_t": round(q_t / a, 2) if a > 0 else 0.0,
        "f_b": round(q_peel / a, 2) if a > 0 else 0.0,
        "f_R": round(f_R, 2),
        "F_w_allow": round(F_w_allow, 2),
        "utilization": round(utilization, 4),
        "utilization_pct": round(utilization * 100, 1),
        "w_required": round(w_required, 2),
        "w_provided": w,
        "adequate": bool(w >= w_required),
        "L_total": L_total,
    }


def _ic_method_lap(joint, material, loads, service):
    """IC method for lap joint — two longitudinal side welds."""
    t1 = joint.get("plate1Thickness", joint.get("webThickness", 10))
    L_j = joint.get("overlapLength", joint.get("jointLength", 200))
    w = joint["weldSize"]
    F_EXX = material.get("F_EXX", 483)

    Fy = loads.get("Fy", 0.0)
    Mz = loads.get("Mz", 0.0)
    P = abs(Fy)

    N = 40
    elem_len = L_j / N
    elements = []
    for sign in [-1, 1]:
        x0 = sign * (t1 / 2.0)
        for i in range(N):
            y = -L_j/2 + L_j * (i + 0.5) / N
            elements.append((x0, y))
    total_weld_L = 2.0 * L_j

    if P < 1e-9:
        return _zero_result("IC Method", w, _allowable_stress(service, F_EXX))

    if abs(Mz) < 1e-6 * abs(Fy) * L_j:
        P_n = _ic_capacity_pure_shear(elements, elem_len, w, F_EXX)
        return _ic_result_from_capacity(P_n, P, w, service, F_EXX, total_weld_L)

    P_n, x_ic = _ic_capacity(elements, elem_len, w, F_EXX, Fy, Mz)
    return _ic_result_from_capacity(P_n, P, w, service, F_EXX, total_weld_L, x_ic)


# ─── BUTT JOINT ──────────────────────────────────────────────────────────────

def _butt_joint_analysis(joint, material, loads, service):
    """
    Butt (groove) weld analysis.
    Full-penetration CJP: capacity = base metal, no weld size check.
    Partial-penetration PJP: reduced throat, sized like fillet.
    """
    t = min(joint.get("plate1Thickness", 12), joint.get("plate2Thickness", 12))
    penetration = joint.get("penetration", "full")
    F_EXX = material.get("F_EXX", 483)
    Fy_base = material.get("Fy", 250)
    L_j = joint.get("jointLength", 300)

    Fy_load = loads.get("Fy", 0.0)
    Fz_load = loads.get("Fz", 0.0)
    Mx = loads.get("Mx", 0.0)

    code_basis = service.get("codeBasis", "ASD")
    if code_basis == "ASD":
        F_allow = 0.60 * Fy_base
    else:
        F_allow = 0.90 * Fy_base

    if penetration == "full":
        A_w = t * L_j
        # Axial (Fy) and bending (Mx) are both normal stresses acting on the
        # same weld fibre — they superpose algebraically, NOT by SRSS. Using
        # SRSS here would under-predict the peak normal stress (unconservative).
        f_direct = abs(Fy_load) / A_w if A_w > 0 else 0.0
        f_bending = abs(Mx) * (t / 2.0) / (L_j * t**3 / 12.0) if L_j > 0 else 0.0
        f_normal = f_direct + f_bending
        # Transverse shear (Fz) across the weld area, combined with the normal
        # stress through the von Mises (distortion-energy) criterion.
        f_shear = abs(Fz_load) / A_w if A_w > 0 else 0.0
        f_R = math.sqrt(f_normal**2 + 3.0 * f_shear**2)
        utilization = f_R / F_allow if F_allow > 0 else 0.0
        w_required = t
        w_provided = t
    else:
        d_pjp = joint.get("partialPenetrationDepth", t * 0.6)
        A_w = d_pjp * L_j
        F_allow_pjp = 0.30 * F_EXX if code_basis == "ASD" else 0.75 * 0.60 * F_EXX
        f_R = abs(Fy_load) / A_w if A_w > 0 else 0.0
        utilization = f_R / F_allow_pjp if F_allow_pjp > 0 else 0.0
        w_required = abs(Fy_load) / (F_allow_pjp * L_j) if (F_allow_pjp * L_j) > 0 else 0.0
        w_provided = d_pjp
        F_allow = F_allow_pjp

    elastic = {
        "method": "Groove Weld",
        "f_v": round(f_direct, 2) if penetration == "full" else round(f_R, 2),
        "f_t": 0.0,
        "f_b": round(f_bending, 2) if penetration == "full" else 0.0,
        "f_R": round(f_R, 2),
        "F_w_allow": round(F_allow, 2),
        "utilization": round(utilization, 4),
        "utilization_pct": round(utilization * 100, 1),
        "w_required": round(w_required, 2),
        "w_provided": w_provided,
        "adequate": bool(w_provided >= w_required),
        "L_total": float(L_j),
    }
    warnings = []
    if penetration == "partial" and w_provided < w_required:
        warnings.append({
            "severity": "error",
            "message": f"PJP throat {w_provided:.1f}mm insufficient, need {w_required:.1f}mm.",
            "code_clause": "AWS D1.1:2020 Clause 2.3"
        })
    return {
        "structural_elastic": elastic,
        "structural_ic": None,
        "structural_governing": elastic,
        "validation": {"w_min_aws": 0, "w_max_aws": t, "warnings": warnings},
        "symbol": _generate_groove_symbol(joint, elastic)
    }


# ─── CORNER JOINT ────────────────────────────────────────────────────────────

def _elastic_twl_corner(joint, material, loads, service):
    """Corner joint: single or double fillet at 90° corner."""
    t1 = joint.get("plate1Thickness", 10)
    t2 = joint.get("plate2Thickness", 10)
    L_j = joint.get("jointLength", 300)
    weld_config = joint.get("weldConfig", "both")
    w_in = joint.get("weldSizeInside", 6)
    w_out = joint.get("weldSizeOutside", 6)

    w = max(w_in, w_out) if weld_config == "both" else (w_in if weld_config == "inside" else w_out)
    n_welds = 2 if weld_config == "both" else 1
    L_total = n_welds * L_j
    F_EXX = material.get("F_EXX", 483)

    Fx = loads.get("Fx", 0.0)
    Fy = loads.get("Fy", 0.0)
    Fz = loads.get("Fz", 0.0)
    Mz = loads.get("Mz", 0.0)

    a = 0.707 * w
    q_vx = Fx / L_total if L_total > 0 else 0.0
    q_vy = Fy / L_total if L_total > 0 else 0.0
    q_vz = Fz / L_total if L_total > 0 else 0.0
    I_u = n_welds * (L_j**3 / 12.0)
    J_u = I_u
    q_t = abs(Mz) * (L_j / 2.0) / J_u if J_u > 0 else 0.0
    q_v_inplane = math.hypot(q_vx, q_vy)
    q_R = np.sqrt((q_v_inplane + q_t)**2 + abs(q_vz)**2)
    f_R = q_R / a if a > 0 else 0.0

    F_w_allow = _allowable_stress(service, F_EXX)
    utilization = f_R / F_w_allow if F_w_allow > 0 else 0.0
    w_required = q_R / (0.707 * F_w_allow) if F_w_allow > 0 else 0.0

    return {
        "method": "Elastic TWL",
        "f_v": round(q_v_inplane / a, 2) if a > 0 else 0.0,
        "f_t": round(q_t / a, 2) if a > 0 else 0.0,
        "f_b": 0.0,
        "f_R": round(f_R, 2),
        "F_w_allow": round(F_w_allow, 2),
        "utilization": round(utilization, 4),
        "utilization_pct": round(utilization * 100, 1),
        "w_required": round(w_required, 2),
        "w_provided": w,
        "adequate": bool(w >= w_required),
        "L_total": float(L_total),
    }


def _ic_method_corner(joint, material, loads, service):
    """IC method for corner joint — single weld line at x=0."""
    L_j = joint.get("jointLength", 300)
    w = joint.get("weldSizeInside", 6)
    F_EXX = material.get("F_EXX", 483)
    Fy = loads.get("Fy", 0.0)
    Mz = loads.get("Mz", 0.0)
    P = abs(Fy)

    N = 40
    elem_len = L_j / N
    # Single weld line offset slightly so x_spread > 0 won't be zero in solver
    elements = [(0.0, -L_j/2 + L_j * (i + 0.5) / N) for i in range(N)]
    total_weld_L = float(L_j)

    if P < 1e-9:
        return _zero_result("IC Method", w, _allowable_stress(service, F_EXX))

    if abs(Mz) < 1e-6 * abs(Fy) * L_j:
        P_n = _ic_capacity_pure_shear(elements, elem_len, w, F_EXX)
        return _ic_result_from_capacity(P_n, P, w, service, F_EXX, total_weld_L)

    P_n, x_ic = _ic_capacity(elements, elem_len, w, F_EXX, Fy, Mz)
    return _ic_result_from_capacity(P_n, P, w, service, F_EXX, total_weld_L, x_ic)


# ─── VALIDATION & SYMBOL ─────────────────────────────────────────────────────

def _check_aws_constraints_generic(joint, structural_result):
    joint_type = joint.get("type", "t_joint")
    w = structural_result.get("w_provided", 0)
    w_req = structural_result.get("w_required", 0)

    if joint_type == "t_joint":
        t_thicker = max(joint.get("webThickness", 10), joint.get("flangeThickness", 10))
        t_thinner = min(joint.get("webThickness", 10), joint.get("flangeThickness", 10))
    elif joint_type == "lap_joint":
        t_thicker = max(joint.get("plate1Thickness", 10), joint.get("plate2Thickness", 10))
        t_thinner = min(joint.get("plate1Thickness", 10), joint.get("plate2Thickness", 10))
    elif joint_type == "corner_joint":
        t_thicker = max(joint.get("plate1Thickness", 10), joint.get("plate2Thickness", 10))
        t_thinner = min(joint.get("plate1Thickness", 10), joint.get("plate2Thickness", 10))
    else:
        t_thicker = 10
        t_thinner = 10

    aws_min_table = _tables.get("aws_d11_table_5_7", {})
    w_min = _lookup_min_fillet(t_thicker, aws_min_table)
    w_max = (t_thinner - 2.0) if t_thinner >= 6.0 else t_thinner

    # If the engine pre-computed its own warnings, use those instead
    if "_aws_warnings" in structural_result:
        return {"w_min_aws": w_min, "w_max_aws": w_max, "warnings": structural_result["_aws_warnings"]}

    warnings = []
    if w < w_min:
        warnings.append({"severity": "error",
            "message": f"Weld {w}mm below AWS D1.1 min {w_min}mm for {t_thicker}mm material.",
            "code_clause": "AWS D1.1:2020 Table 5.7"})
    if w > w_max:
        warnings.append({"severity": "error",
            "message": f"Weld {w}mm exceeds AWS D1.1 max {w_max}mm for {t_thinner}mm edge.",
            "code_clause": "AWS D1.1:2020 Clause 2.4.5"})
    if w_req > w_max:
        warnings.append({"severity": "warning",
            "message": f"Required {w_req:.1f}mm exceeds edge limit {w_max}mm. Consider groove weld.",
            "code_clause": "AWS D1.1:2020 Clause 2.4"})

    return {"w_min_aws": w_min, "w_max_aws": w_max, "warnings": warnings}


def _generate_symbol_data(joint, structural_result):
    w = structural_result.get("w_provided", 6)
    w_req = structural_result.get("w_required", 0)
    w_display = max(w, math.ceil(w_req))
    joint_type = joint.get("type", "t_joint")
    if joint_type in ("t_joint", "lap_joint"):
        config = "both_sides"
        notation = f"▲ {w_display} (BOTH SIDES)"
    elif joint_type == "corner_joint":
        config = joint.get("weldConfig", "both")
        notation = f"▲ {w_display} ({config.upper()})"
    else:
        config = "both_sides"
        notation = f"▲ {w_display}"
    return {"type": "fillet", "size": w_display, "configuration": config, "notation": notation}


def _generate_groove_symbol(joint, structural_result):
    groove = joint.get("grooveType", "v_groove")
    t = joint.get("plate1Thickness", 12)
    return {
        "type": "groove",
        "size": t,
        "configuration": groove,
        "notation": f"CJP V-groove {t}mm" if groove == "v_groove" else f"Groove weld {t}mm"
    }


# ─── IC METHOD HELPERS ───────────────────────────────────────────────────────

def _ic_capacity(elements, elem_len, w, F_EXX, Fy, Mz, N_samples=51):
    """
    Compute the nominal capacity P_n of a weld group under combined
    vertical shear Fy (applied at the weld centroid) and in-plane couple
    Mz, by locating the Instantaneous Center per AISC Manual Part 8 /
    Tide.

    The weld group lies in the x–y plane and is symmetric about the
    x-axis (y_ic = 0 by symmetry; only x_ic is solved). All element
    forces act perpendicular to r_i = (ex - x_ic, ey), in the CCW sense
    about IC. Deformation follows rigid-body rotation about IC
    (delta_i = omega * r_i); the first element to rupture is the one
    maximizing r_i / delta_ult,i, and the per-element strength uses the
    full Lesik-Kennedy curve — directional factor (1 + 0.5 sin^1.5 theta)
    and the angle-dependent ultimate deformation delta_ult,i(theta).

    Convergence criterion (consistency of force and moment equilibrium):

        |ΣFv| * |e - x_ic| = ΣF_i * r_i,    where e = Mz / Fy

    Returns (P_n, x_ic) where P_n = |ΣFv| at the converged IC, or
    (None, None) if no consistent IC could be found.
    """
    if abs(Fy) < 1e-9:
        return None, None

    e = Mz / Fy
    if w < 1e-9:
        return None, None

    def _force_sums(x_ic):
        rxs = np.array([ex - x_ic for (ex, _) in elements])
        rys = np.array([ey for (_, ey) in elements])
        rs = np.hypot(rxs, rys)
        r_max = rs.max()
        if r_max < 1e-9:
            return 0.0, 0.0
        # Loading angle of each element force relative to the weld axis. The
        # IC weld lines run in the y-direction and the element force is
        # perpendicular to r_i, so sin(theta) = |r_y| / r  (theta = 0 -> force
        # parallel to weld = longitudinal; theta = 90 deg -> transverse).
        with np.errstate(divide="ignore", invalid="ignore"):
            sin_theta = np.where(rs > 1e-9, np.abs(rys) / rs, 0.0)
        sin_theta = np.clip(sin_theta, 0.0, 1.0)
        theta = np.arcsin(sin_theta)
        # Angle-dependent ultimate deformation (AISC J2 commentary).
        du = _delta_ult_fn(theta, w)
        # Rigid-body compatibility about IC: delta_i = omega * r_i. The first
        # element to rupture maximizes r_i / du_i; scale so its rho = 1. (du is
        # proportional to w and cancels here, so rho — and hence P_n/w — is
        # independent of the weld size.)
        with np.errstate(divide="ignore", invalid="ignore"):
            ratio = np.where(du > 1e-12, rs / du, 0.0)
        ratio_max = ratio.max()
        rhos = ratio / ratio_max if ratio_max > 0 else np.zeros_like(ratio)
        # Lesik-Kennedy element strength: R_ult * directional * deformation.
        R_ult_per_mm = 0.60 * F_EXX * 0.707 * w
        angle_fac = 1.0 + 0.5 * sin_theta ** 1.5
        with np.errstate(invalid="ignore"):
            def_fac = np.where(rhos > 0,
                               (rhos * (1.9 - 0.9 * rhos))**0.3, 0.0)
        Fi = R_ult_per_mm * elem_len * angle_fac * def_fac  # force magnitudes
        # CCW unit perp to r = (-ry/r, rx/r); we take the y-component
        with np.errstate(divide="ignore", invalid="ignore"):
            Fy_arr = np.where(rs > 1e-9, Fi * rxs / rs, 0.0)
        Fv_sum = float(Fy_arr.sum())
        M_sum  = float((Fi * rs).sum())
        return Fv_sum, M_sum

    def _consistency(x_ic):
        Fv, M = _force_sums(x_ic)
        # At correct IC: |Fv| * |e - x_ic| == M
        return abs(Fv) * abs(e - x_ic) - M

    # Reference length for bracketing — use spread of weld elements
    y_spread = max(ey for (_, ey) in elements) - min(ey for (_, ey) in elements)
    x_spread = max(ex for (ex, _) in elements) - min(ex for (ex, _) in elements)
    L_ref = max(y_spread, x_spread, abs(e), 1.0)
    bracket = 4.0 * L_ref

    xs = np.linspace(-bracket, bracket, N_samples)
    vals = np.array([_consistency(x) for x in xs])

    # Find sign change closest to the load eccentricity
    x_ic = None
    sign_changes = []
    for i in range(len(xs) - 1):
        if vals[i] * vals[i + 1] < 0 and np.isfinite(vals[i]) and np.isfinite(vals[i + 1]):
            sign_changes.append((xs[i], xs[i + 1]))
    if sign_changes:
        # Prefer the bracket whose midpoint is closest to e
        sign_changes.sort(key=lambda b: abs((b[0] + b[1]) / 2.0 - e))
        a, b = sign_changes[0]
        try:
            x_ic = brentq(_consistency, a, b, xtol=0.001 * L_ref, maxiter=200)
        except (ValueError, RuntimeError):
            x_ic = None
    if x_ic is None:
        # Fallback: location minimizing |consistency|
        idx = int(np.argmin(np.abs(vals)))
        x_ic = float(xs[idx])

    Fv, _ = _force_sums(x_ic)
    P_n = abs(Fv)
    return P_n, x_ic


def _ic_capacity_pure_shear(elements, elem_len, w, F_EXX):
    """
    Concentric-shear limit: e = 0 → IC at infinity, every element fully
    mobilized, so P_n = sum of R_ult per element. Used when |Mz| → 0.
    """
    R_ult_per_mm = 0.60 * F_EXX * 0.707 * w
    return R_ult_per_mm * elem_len * len(elements)


def _ic_result_from_capacity(P_n, P_applied, w, service, F_EXX, total_weld_L, x_ic=None):
    """Build a method-result dict from a computed nominal capacity P_n."""
    F_w_allow = _allowable_stress(service, F_EXX)
    if P_n is None or P_n < 1e-9:
        return _zero_result("IC Method", w, F_w_allow)
    code_basis = service.get("codeBasis", "ASD")
    if code_basis == "ASD":
        P_allow = P_n / 2.00          # AISC J2 Ω
    else:
        P_allow = 0.75 * P_n           # AISC J2 φ
    utilization = P_applied / P_allow if P_allow > 0 else float("inf")
    w_required = w * utilization       # R_ult ∝ w, so required size scales linearly
    a = 0.707 * w
    f_R = (P_applied / total_weld_L) / a if (a > 0 and total_weld_L > 0) else 0.0
    res = {
        "method": "IC Method",
        "f_v": round(f_R, 2),
        "f_t": 0.0, "f_b": 0.0,
        "f_R": round(f_R, 2),
        "F_w_allow": round(F_w_allow, 2),
        "P_capacity_N": round(P_n, 0),
        "P_allow_N": round(P_allow, 0),
        "utilization": round(utilization, 4),
        "utilization_pct": round(utilization * 100, 1),
        "w_required": round(w_required, 2),
        "w_provided": w,
        "adequate": bool(utilization <= 1.0),
        "L_total": float(total_weld_L),
    }
    if x_ic is not None:
        res["x_ic"] = round(x_ic, 2)
    return res


def _delta_ult_fn(theta_rad, w_mm):
    """Ultimate weld-element deformation per AISC J2 Commentary.

    Accepts scalar or numpy-array theta (np.minimum broadcasts either way).
    """
    theta_deg = np.degrees(theta_rad)
    val = 1.087 * (theta_deg + 6) ** (-0.65) * w_mm
    return np.minimum(val, 0.17 * w_mm)


# ─── SHARED HELPERS ──────────────────────────────────────────────────────────

def _allowable_stress(service, F_EXX):
    code_basis = service.get("codeBasis", "ASD")
    if code_basis == "ASD":
        return 0.30 * F_EXX
    else:
        return 0.75 * 0.60 * F_EXX


def _zero_result(method, w, F_w_allow):
    return {
        "method": method, "f_v": 0.0, "f_t": 0.0, "f_b": 0.0, "f_R": 0.0,
        "F_w_allow": round(F_w_allow, 2), "utilization": 0.0, "utilization_pct": 0.0,
        "w_required": 0.0, "w_provided": w, "adequate": True, "L_total": 0.0,
    }


# ─── PHASE 1 COMPAT ──────────────────────────────────────────────────────────

def _check_aws_constraints(joint, structural_result):
    """Alias kept for Phase 1 test compatibility."""
    return _check_aws_constraints_generic(joint, structural_result)


def _lookup_min_fillet(t_thicker_mm, table):
    thresholds_data = table.get("thresholds", [])
    if thresholds_data:
        for entry in thresholds_data:
            if t_thicker_mm <= entry["t_max"]:
                return entry["w_min"]
    thresholds = [(6.0, 3.0), (12.0, 5.0), (19.0, 6.0), (38.0, 8.0), (float("inf"), 10.0)]
    for (limit, min_w) in thresholds:
        if t_thicker_mm <= limit:
            return min_w
    return 10.0


# ─── EDGE JOINT ──────────────────────────────────────────────────────────────

def _elastic_twl_edge(joint, material, loads, service):
    """
    Edge joint — two plates side-by-side, single edge fillet weld along their top edges.
    Analysis: direct shear + out-of-plane bending on a single weld line.
    """
    t1 = joint.get("plate1Thickness", 8)
    t2 = joint.get("plate2Thickness", 8)
    L = joint.get("jointLength", 200)
    w = joint.get("weldSize", 6)
    F_EXX = material.get("F_EXX", 483)

    L_total = float(L)
    a = 0.707 * w
    A_w = a * L_total

    Fx = loads.get("Fx", 0.0)
    Fy = loads.get("Fy", 0.0)
    Fz = loads.get("Fz", 0.0)
    Mx = loads.get("Mx", 0.0)  # bending pulling the plates apart

    q_vx = Fx / L_total if L_total > 0 else 0.0   # along-weld direct shear
    q_vy = Fy / L_total if L_total > 0 else 0.0
    q_vz = Fz / L_total if L_total > 0 else 0.0
    # Out-of-plane bending — treated as shear on throat
    t_eff = max(t1, t2)
    I_u = L_total * (t_eff / 2.0)**2
    q_bx = Mx * (t_eff / 2.0) / I_u if I_u > 0 else 0.0

    q_R = np.sqrt(q_vx**2 + q_vy**2 + q_vz**2 + q_bx**2)
    f_R = q_R / a if a > 0 else 0.0

    code_basis = service.get("codeBasis", "ASD")
    F_w_allow = 0.30 * F_EXX if code_basis == "ASD" else 0.45 * F_EXX

    utilization = f_R / F_w_allow if F_w_allow > 0 else 0.0
    w_required = q_R / (0.707 * F_w_allow) if F_w_allow > 0 else 0.0

    t_thicker = max(t1, t2)
    t_thinner = min(t1, t2)
    aws_min = _lookup_min_fillet(t_thicker, _tables.get("aws_d11_table_5_7", {}))
    aws_max = t_thinner - 2.0 if t_thinner >= 6.0 else t_thinner

    warnings = []
    if w < aws_min:
        warnings.append({"severity": "error",
            "message": f"Weld {w}mm below AWS D1.1 minimum {aws_min}mm for {t_thicker}mm material.",
            "code_clause": "AWS D1.1:2020 Table 5.7"})
    if w > aws_max:
        warnings.append({"severity": "error",
            "message": f"Weld {w}mm exceeds AWS D1.1 maximum {aws_max}mm for {t_thinner}mm edge.",
            "code_clause": "AWS D1.1:2020 Clause 2.4.5"})

    result = {
        "method": "Elastic TWL",
        "f_v": round(math.hypot(q_vx, q_vy) / a, 2) if a > 0 else 0.0,
        "f_t": 0.0,
        "f_b": round(abs(q_bx) / a, 2) if a > 0 else 0.0,
        "f_R": round(f_R, 2),
        "F_w_allow": round(F_w_allow, 2),
        "utilization": round(utilization, 4),
        "utilization_pct": round(utilization * 100, 1),
        "w_required": round(w_required, 2),
        "w_provided": w,
        "adequate": bool(w >= w_required),
        "L_total": L_total,
        "I_ux": round(I_u, 2),
        "J_u": round(I_u, 2),
    }
    # Attach warnings to result so _check_aws_constraints_generic can also pick up
    result["_aws_warnings"] = warnings
    return result


# ─── CRUCIFORM JOINT ─────────────────────────────────────────────────────────

def _elastic_twl_cruciform(joint, material, loads, service):
    """
    Cruciform joint — web sandwiched between two flanges, 4 fillet welds.
    Structurally equivalent to two back-to-back T-joints: 4 × weld length L.
    """
    t_web = joint.get("webThickness", 12)
    L = joint.get("jointLength", 400)
    w = joint.get("weldSize", 8)
    F_EXX = material.get("F_EXX", 483)

    # 4 welds of length L each
    L_total = 4.0 * L
    a = 0.707 * w

    # Weld group centred at web midplane; each weld at ±t_web/2 from neutral axis
    I_ux = 4.0 * L * (t_web / 2.0)**2   # about axis parallel to welds
    I_uy = 4.0 * (L**3 / 12.0)           # about axis perpendicular to welds
    J_u = I_ux + I_uy

    Fx = loads.get("Fx", 0.0)
    Fy = loads.get("Fy", 0.0)
    Fz = loads.get("Fz", 0.0)
    Mx = loads.get("Mx", 0.0)
    Mz = loads.get("Mz", 0.0)

    # See _elastic_twl_t_joint for axis convention.
    q_vx = Fx / L_total if L_total > 0 else 0.0   # along-weld direct shear
    q_vy = Fy / L_total if L_total > 0 else 0.0   # across-web direct shear
    q_vz = Fz / L_total if L_total > 0 else 0.0   # peel direct shear
    q_bx = Mx * (t_web / 2.0) / I_ux if I_ux > 0 else 0.0   # peel from Mx

    # Check all 4 critical corners
    corners = [(L/2, t_web/2), (L/2, -t_web/2), (-L/2, t_web/2), (-L/2, -t_web/2)]
    max_q_R = 0.0
    governing_corner = corners[0]

    for (rx, ry) in corners:
        q_tx = -Mz * ry / J_u if J_u > 0 else 0.0
        q_ty =  Mz * rx / J_u if J_u > 0 else 0.0
        q_along  = q_tx + q_vx             # along-weld (Fx lives here)
        q_across = q_ty + q_vy             # across-web (Fy lives here)
        q_peel   = q_vz + q_bx             # out-of-plane
        q_R = np.sqrt(q_along**2 + q_across**2 + q_peel**2)
        if q_R > max_q_R:
            max_q_R = q_R
            governing_corner = (rx, ry)

    f_R = max_q_R / a if a > 0 else 0.0

    code_basis = service.get("codeBasis", "ASD")
    F_w_allow = 0.30 * F_EXX if code_basis == "ASD" else 0.45 * F_EXX

    utilization = f_R / F_w_allow if F_w_allow > 0 else 0.0
    w_required = max_q_R / (0.707 * F_w_allow) if F_w_allow > 0 else 0.0

    t_flange = joint.get("flangeThickness", 16)
    t_thicker = max(t_web, t_flange)
    t_thinner = min(t_web, t_flange)
    aws_min = _lookup_min_fillet(t_thicker, _tables.get("aws_d11_table_5_7", {}))
    aws_max = t_thinner - 2.0 if t_thinner >= 6.0 else t_thinner

    warnings = []
    if w < aws_min:
        warnings.append({"severity": "error",
            "message": f"Weld {w}mm below AWS D1.1 minimum {aws_min}mm.",
            "code_clause": "AWS D1.1:2020 Table 5.7"})
    if w > aws_max:
        warnings.append({"severity": "error",
            "message": f"Weld {w}mm exceeds AWS D1.1 maximum {aws_max}mm.",
            "code_clause": "AWS D1.1:2020 Clause 2.4.5"})

    result = {
        "method": "Elastic TWL",
        "f_v": round(math.hypot(q_vx, q_vy) / a, 2) if a > 0 else 0.0,
        "f_t": round(abs(Mz * (t_web/2) / J_u) / a, 2) if (J_u > 0 and a > 0) else 0.0,
        "f_b": round(abs(q_bx) / a, 2) if a > 0 else 0.0,
        "f_R": round(f_R, 2),
        "F_w_allow": round(F_w_allow, 2),
        "utilization": round(utilization, 4),
        "utilization_pct": round(utilization * 100, 1),
        "w_required": round(w_required, 2),
        "w_provided": w,
        "adequate": bool(w >= w_required),
        "governing_corner": list(governing_corner),
        "L_total": L_total,
        "I_ux": round(I_ux, 2),
        "J_u": round(J_u, 2),
    }
    result["_aws_warnings"] = warnings
    return result
