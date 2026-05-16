def classify_joint(input_data: dict) -> dict:
    joint_type = input_data.get("jointType", "t_joint")
    weld_config = input_data.get("weldConfiguration", "both_sides")

    classifications = {
        "t_joint": {"name": "T-Joint", "weld_type": "fillet", "aws_category": "C"},
        "lap": {"name": "Lap Joint", "weld_type": "fillet", "aws_category": "D"},
        "butt": {"name": "Butt Joint", "weld_type": "groove", "aws_category": "B"},
        "corner": {"name": "Corner Joint", "weld_type": "fillet_or_groove", "aws_category": "C"},
    }

    result = classifications.get(joint_type, classifications["t_joint"])
    return {
        "jointType": joint_type,
        "jointName": result["name"],
        "weldType": result["weld_type"],
        "awsFatigueCategory": result["aws_category"],
        "weldConfiguration": weld_config
    }
