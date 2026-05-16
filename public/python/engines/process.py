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


def select_process(input_data: dict) -> dict:
    material = input_data["material"]
    joint = input_data["joint"]
    environment = input_data.get("environment", "shop")
    production_volume = input_data.get("production_volume", "repeat")
    quality_level = input_data.get("quality_level", "structural")
    position = joint.get("position", input_data.get("position", "1F"))

    t1, t2, weld_size, joint_length = _extract_thicknesses(joint)
    thickness = max(t1, t2)
    joint_type = joint.get("type", "t_joint")
    mat_type = material.get("type", "carbon_steel")
    Fy = material.get("Fy", 250)

    # Score each process: higher = better fit
    scores = {
        "GTAW": 0,
        "GMAW": 0,
        "FCAW": 0,
        "SMAW": 0,
        "SAW": 0,
    }
    rationale = {p: [] for p in scores}

    # --- Material suitability ---
    if mat_type == "stainless":
        scores["GTAW"] += 30
        rationale["GTAW"].append("Preferred for stainless — excellent arc control, no slag contamination")
        scores["GMAW"] += 15
        rationale["GMAW"].append("Acceptable for stainless with correct shielding gas (Ar+He or Ar+O2)")
        scores["FCAW"] += 5
        rationale["FCAW"].append("Gas-shielded FCAW possible but GTAW preferred for stainless")
        scores["SMAW"] += 5
        rationale["SMAW"].append("SMAW viable but GTAW preferred for stainless")
        scores["SAW"] -= 20
        rationale["SAW"].append("SAW not typically used for stainless (flux contamination risk)")
    elif mat_type == "aluminum":
        scores["GTAW"] += 40
        rationale["GTAW"].append("Preferred for aluminum — AC arc breaks oxide layer effectively")
        scores["GMAW"] += 20
        rationale["GMAW"].append("GMAW (MIG) suitable for aluminum above ~3mm; higher deposition than GTAW")
        scores["FCAW"] -= 30
        rationale["FCAW"].append("FCAW not suitable for aluminum")
        scores["SMAW"] -= 30
        rationale["SMAW"].append("SMAW not suitable for aluminum")
        scores["SAW"] -= 30
        rationale["SAW"].append("SAW not suitable for aluminum")
    else:  # carbon_steel
        if Fy >= 690:
            scores["GTAW"] += 15
            rationale["GTAW"].append("GTAW preferred for Q&T steels — precise heat control minimizes HAZ")
            scores["GMAW"] += 5
            rationale["GMAW"].append("GMAW usable; low-hydrogen process important for high-strength steel")
            scores["FCAW"] += 10
            rationale["FCAW"].append("Low-hydrogen FCAW acceptable for Q&T steels")
            scores["SMAW"] += 5
            rationale["SMAW"].append("SMAW with low-H electrodes (E11018) acceptable")
        else:
            scores["GMAW"] += 15
            rationale["GMAW"].append("GMAW suitable for carbon steel — good productivity and quality")
            scores["FCAW"] += 12
            rationale["FCAW"].append("FCAW suitable — good deposition rate for carbon steel")
            scores["SMAW"] += 8
            rationale["SMAW"].append("SMAW reliable fallback for carbon steel in all positions")
            scores["SAW"] += 10
            rationale["SAW"].append("SAW excellent for carbon steel flat/horizontal; high deposition rate")

    # --- Thickness ---
    if thickness < 3:
        scores["GTAW"] += 20
        rationale["GTAW"].append(f"Thin material ({thickness}mm) — GTAW preferred for precise low-heat input")
        scores["SMAW"] -= 10
        rationale["SMAW"].append(f"Thin material ({thickness}mm) — SMAW burn-through risk")
        scores["SAW"] -= 15
        rationale["SAW"].append(f"Thin material ({thickness}mm) — SAW excessive heat input")
    elif thickness < 10:
        scores["GTAW"] += 5
        scores["GMAW"] += 10
        rationale["GMAW"].append(f"Moderate thickness ({thickness}mm) — GMAW offers good control and speed")
    elif thickness < 25:
        scores["GMAW"] += 8
        scores["FCAW"] += 12
        scores["SAW"] += 5
        rationale["FCAW"].append(f"Medium-heavy section ({thickness}mm) — FCAW deposition efficiency advantageous")
    else:
        scores["SAW"] += 20
        scores["FCAW"] += 15
        scores["SMAW"] -= 5
        rationale["SAW"].append(f"Heavy section ({thickness}mm) — SAW high deposition rate ideal for large welds")
        rationale["FCAW"].append(f"Heavy section ({thickness}mm) — FCAW good deposition for thick plate")

    # --- Position ---
    overhead_positions = ("3F", "4F", "3G", "4G")
    horizontal_positions = ("2F", "2G")
    flat_positions = ("1F", "1G")

    if position in overhead_positions:
        scores["GTAW"] += 5
        scores["GMAW"] += 3
        scores["FCAW"] += 3
        scores["SMAW"] += 8
        rationale["SMAW"].append(f"Position {position} — SMAW versatile for out-of-position welding")
        scores["SAW"] -= 25
        rationale["SAW"].append(f"Position {position} — SAW restricted to flat/horizontal only")
    elif position in horizontal_positions:
        scores["GMAW"] += 5
        scores["FCAW"] += 5
        scores["SAW"] -= 10
        rationale["SAW"].append(f"Position {position} — SAW requires flat or near-flat position")
    else:  # flat
        scores["SAW"] += 5
        rationale["SAW"].append(f"Position {position} — SAW optimal for flat/downhand welding")

    # --- Environment ---
    if environment == "outdoor" or environment == "field":
        scores["GTAW"] -= 15
        rationale["GTAW"].append("Outdoor/field — GTAW sensitive to wind draft on shielding gas")
        scores["GMAW"] -= 10
        rationale["GMAW"].append("Outdoor — GMAW shielding gas susceptible to wind; FCAW or SMAW preferred")
        scores["SMAW"] += 15
        rationale["SMAW"].append("Outdoor/field — SMAW self-shielded, excellent for field conditions")
        scores["FCAW"] += 10
        rationale["FCAW"].append("Outdoor — self-shielded FCAW viable; gas-shielded FCAW needs wind protection")
        scores["SAW"] -= 10
        rationale["SAW"].append("Field environment — SAW equipment mobility is a limitation")

    # --- Production volume ---
    if production_volume == "one_off":
        scores["GTAW"] += 5
        scores["SMAW"] += 5
        scores["SAW"] -= 10
        rationale["SAW"].append("One-off production — SAW setup time not justified")
    elif production_volume == "mass":
        scores["SAW"] += 15
        scores["GMAW"] += 10
        scores["FCAW"] += 8
        rationale["SAW"].append("Mass production — SAW high deposition rate maximizes throughput")
        scores["GTAW"] -= 5
        scores["SMAW"] -= 10
        rationale["SMAW"].append("Mass production — SMAW lower deposition rate reduces productivity")

    # --- Quality level ---
    if quality_level == "radiographic":
        scores["GTAW"] += 10
        rationale["GTAW"].append("Radiographic quality — GTAW lowest spatter, cleanest root pass")
        scores["FCAW"] -= 5
        rationale["FCAW"].append("Radiographic quality — FCAW slag inclusions require careful control")
        scores["SMAW"] -= 5
        rationale["SMAW"].append("Radiographic quality — SMAW slag control critical, multiple passes needed")
    elif quality_level == "cosmetic":
        scores["GTAW"] += 5
        rationale["GTAW"].append("Cosmetic finish — GTAW smooth bead appearance")
        scores["SAW"] -= 5

    # --- Joint type ---
    if joint_type == "butt_joint":
        scores["GTAW"] += 5
        rationale["GTAW"].append("Butt joint — GTAW preferred for root pass quality")
    elif joint_type == "lap_joint":
        scores["GMAW"] += 3
        scores["FCAW"] += 3

    # Rank
    ranked = sorted(
        [{"process": p, "score": round(float(s), 1), "rationale": rationale[p]} for p, s in scores.items()],
        key=lambda x: x["score"],
        reverse=True,
    )

    primary = ranked[0]["process"]
    filler = _select_filler(material, primary, quality_level)

    return {
        "ranked_processes": ranked,
        "primary": primary,
        "filler": filler,
    }


def _select_filler(material, process, quality_level):
    """Select filler metal classification based on material, process, and quality level."""
    filler_match = _tables.get("filler_match", {})
    matches = filler_match.get("matches", {})

    mat_id = material.get("id", "")
    key = f"{mat_id}_{process}"
    if key in matches:
        m = matches[key]
        return {"classification": m.get("classification", ""), "comment": m.get("comment", "")}

    mat_type = material.get("type", "carbon_steel")
    Fy = material.get("Fy", 250)

    if mat_type == "aluminum":
        if process == "GTAW":
            return {"classification": "ER4043", "comment": "General-purpose aluminum GTAW filler; good fluidity"}
        else:
            return {"classification": "ER4043", "comment": "General-purpose aluminum GMAW wire"}

    if mat_type == "stainless":
        chem = material.get("chemistry", {})
        cr = chem.get("Cr", 0)
        mo = chem.get("Mo", 0)
        if mo > 1.5:
            if process == "GTAW":
                return {"classification": "ER316L", "comment": "Matching Mo-bearing filler; corrosion resistance preservation"}
            return {"classification": "ER316L", "comment": "316L filler for Mo-bearing stainless"}
        else:
            if process == "GTAW":
                return {"classification": "ER308L", "comment": "Low-carbon 308L prevents sensitization in 304/304L joints"}
            return {"classification": "ER308L", "comment": "Standard 304/304L stainless filler"}

    # Carbon / alloy steel
    if Fy >= 690:
        if process == "SMAW":
            return {"classification": "E11018-M", "comment": "Low-hydrogen electrode matching A514/Q&T strength; preheat required"}
        elif process in ("GMAW", "FCAW"):
            return {"classification": "ER110S-1", "comment": "High-strength wire matching Q&T steel; use with Ar+CO2 shielding"}
        elif process == "GTAW":
            return {"classification": "ER110S-1", "comment": "High-strength GTAW wire for Q&T steel root passes"}
        else:
            return {"classification": "F11A6-EH14", "comment": "SAW wire-flux combination for high-strength steel"}
    elif Fy >= 345:
        if process == "SMAW":
            lh = "E8018-C3" if quality_level == "radiographic" else "E8016-D1"
            return {"classification": lh, "comment": "Low-hydrogen electrode for 50-ksi steels"}
        elif process == "GMAW":
            return {"classification": "ER70S-6", "comment": "High-deoxidized wire; suits mill scale and moderate contamination"}
        elif process == "FCAW":
            return {"classification": "E71T-1C", "comment": "Rutile FCAW wire; CO2 shielding for steel ≥345 MPa"}
        elif process == "GTAW":
            return {"classification": "ER70S-2", "comment": "Triple-deoxidized GTAW wire for clean root passes"}
        else:
            return {"classification": "F7A6-EM12K", "comment": "SAW combination for structural steel"}
    else:
        if process == "SMAW":
            return {"classification": "E7018", "comment": "Low-hydrogen iron-powder electrode; suitable for A36/S235"}
        elif process == "GMAW":
            return {"classification": "ER70S-6", "comment": "Versatile wire for mild steel; tolerant of surface scale"}
        elif process == "FCAW":
            return {"classification": "E71T-1C", "comment": "All-position FCAW wire for mild steel structural work"}
        elif process == "GTAW":
            return {"classification": "ER70S-2", "comment": "Low-alloy GTAW wire for mild steel"}
        else:
            return {"classification": "F7A2-EM12K", "comment": "Standard SAW flux-wire combination for mild steel"}
