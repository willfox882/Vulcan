import numpy as np


def analyze_fatigue(input_data: dict) -> dict:
    joint = input_data["joint"]
    structural = input_data["structural"]
    fatigue_input = input_data["fatigue"]

    category = _classify_fatigue_category(joint, structural)
    annex_k = _tables.get("aws_d11_annex_k", {})
    category_data = annex_k.get(category, annex_k.get("E", {}))
    Cf = category_data.get("Cf_MPa", 3.61e11)
    m = category_data.get("m", 3)
    sigma_TH = category_data.get("threshold_MPa", 31)

    N_f = None
    damage = None
    below_threshold = False
    ds_eq = None

    lc_type = fatigue_input.get("type", "constant_amplitude")

    if lc_type == "constant_amplitude":
        delta_sigma = fatigue_input.get("stress_range_MPa", 0.0)
        if delta_sigma <= sigma_TH:
            N_f = float("inf")
            below_threshold = True
        else:
            N_f = Cf / (delta_sigma**m)
            below_threshold = False
        ds_eq = delta_sigma

    elif lc_type == "variable_amplitude":
        spectrum = fatigue_input.get("spectrum", [])
        damage = 0.0
        n_total = sum(e.get("cycles", 0) for e in spectrum)
        ds_cubed_sum = 0.0
        for entry in spectrum:
            ds_i = entry.get("stress_range_MPa", entry.get("stressRangeMPa", 0.0))
            n_i = entry.get("cycles", 0)
            if ds_i <= sigma_TH or n_i <= 0:
                continue
            N_i = Cf / (ds_i**m)
            damage += n_i / N_i
            ds_cubed_sum += (n_i / n_total) * (ds_i**m) if n_total > 0 else 0.0
        below_threshold = damage < 1e-10
        ds_eq = ds_cubed_sum**(1.0/m) if ds_cubed_sum > 0 else 0.0

    # Service life
    service_life_years = None
    cycles_per_year = None
    f_hz = fatigue_input.get("frequencyHz", fatigue_input.get("frequency_Hz", 0.0))
    hr_day = fatigue_input.get("hoursPerDay", fatigue_input.get("duty_cycle", {}).get("hours_per_day", 8))
    days_yr = fatigue_input.get("daysPerYear", fatigue_input.get("duty_cycle", {}).get("days_per_year", 250))

    if f_hz and f_hz > 0:
        cycles_per_year = f_hz * 3600 * hr_day * days_yr
        if N_f is not None and N_f != float("inf") and cycles_per_year > 0:
            service_life_years = N_f / cycles_per_year
        elif damage is not None and damage > 0 and cycles_per_year > 0:
            n_spectrum_total = sum(e.get("cycles", 0) for e in fatigue_input.get("spectrum", []))
            if n_spectrum_total > 0:
                service_life_years = (n_spectrum_total / cycles_per_year) / damage

    design_life_years = fatigue_input.get("designLifeYears", fatigue_input.get("design_life_years", None))
    safety_factor = None
    passes = None
    if design_life_years and service_life_years is not None and service_life_years != float("inf"):
        safety_factor = service_life_years / design_life_years
        passes = bool(safety_factor >= 1.0)
    elif below_threshold:
        passes = True
        safety_factor = float("inf")

    return {
        "category": category,
        "category_description": category_data.get("description", ""),
        "Cf": Cf,
        "m": m,
        "threshold_MPa": sigma_TH,
        "stress_range_MPa": round(ds_eq, 2) if ds_eq is not None else None,
        "cycles_to_failure": N_f,
        "damage": round(damage, 6) if damage is not None else None,
        "below_threshold": below_threshold,
        "service_life_years": round(service_life_years, 1) if service_life_years is not None and service_life_years != float("inf") else service_life_years,
        "cycles_per_year": cycles_per_year,
        "safety_factor": round(safety_factor, 2) if safety_factor is not None and safety_factor != float("inf") else safety_factor,
        "passes": passes,
    }


def _classify_fatigue_category(joint, structural):
    joint_type = joint.get("type", "t_joint")
    penetration = joint.get("penetration", "full")
    load_dir = structural.get("load_direction", "transverse")

    if joint_type == "butt_joint":
        if penetration == "full":
            return "B" if load_dir == "parallel" else "C"
        return "D"
    elif joint_type == "t_joint":
        return "E"
    elif joint_type == "lap_joint":
        return "F" if load_dir == "transverse" else "E"
    elif joint_type == "corner_joint":
        return "E"
    return "E"
