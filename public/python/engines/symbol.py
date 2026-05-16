def generate_symbol_svg(params: dict) -> dict:
    weld_type = params.get("weld_type", "fillet")
    configuration = params.get("configuration", "both_sides")
    size = params.get("size", 6)
    length = params.get("length", None)
    pitch = params.get("pitch", None)
    groove_angle = params.get("groove_angle", None)
    root_opening = params.get("root_opening", None)
    contour = params.get("contour", None)
    finish = params.get("finish", None)
    all_around = params.get("all_around", False)
    field_weld = params.get("field_weld", False)
    tail = params.get("tail", None)

    parts = []

    # Reference line
    parts.append('<line x1="55" y1="50" x2="185" y2="50" stroke="#a1a1aa" stroke-width="1.5"/>')

    # Arrow
    parts.append('<line x1="55" y1="50" x2="20" y2="75" stroke="#a1a1aa" stroke-width="1.5"/>')
    parts.append('<polygon points="20,75 27,68 15,66" fill="#a1a1aa"/>')

    # All-around circle
    if all_around:
        parts.append('<circle cx="55" cy="50" r="5" fill="none" stroke="#a1a1aa" stroke-width="1.5"/>')

    # Field weld flag
    if field_weld:
        parts.append('<polygon points="185,44 185,56 193,50" fill="#a1a1aa"/>')

    def arrow_side_symbol(wt, sz):
        """Return SVG elements for arrow-side (below ref line) symbol."""
        if wt == "fillet":
            return [
                '<polygon points="90,50 108,50 90,68" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="66" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt == "square_groove":
            return [
                '<line x1="100" y1="50" x2="100" y2="65" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="64" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt in ("V_groove", "v_groove"):
            ang = groove_angle or 60
            g_txt = f'<text x="85" y="72" font-family="JetBrains Mono,monospace" font-size="8" fill="#a1a1aa">{ang}°</text>'
            return [
                '<polyline points="90,50 100,66 110,50" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="64" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>',
                g_txt
            ]
        elif wt == "bevel":
            ang = groove_angle or 45
            return [
                '<line x1="90" y1="50" x2="90" y2="66" stroke="#7c3aed" stroke-width="1.5"/>',
                '<line x1="90" y1="66" x2="110" y2="50" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="64" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>',
                f'<text x="92" y="72" font-family="JetBrains Mono,monospace" font-size="8" fill="#a1a1aa">{ang}°</text>'
            ]
        elif wt in ("J_groove", "j_groove"):
            return [
                '<path d="M 110,50 Q 90,50 90,66" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                '<line x1="90" y1="66" x2="90" y2="70" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="64" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt in ("U_groove", "u_groove"):
            return [
                '<polyline points="90,50 93,66 107,66 110,50" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="64" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt in ("plug", "slot"):
            return [
                '<rect x="88" y="52" width="24" height="14" fill="#7c3aed" opacity="0.4" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="74" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">Ø{sz}</text>'
            ]
        elif wt == "surfacing":
            return [
                '<path d="M 88,50 Q 100,64 112,50" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="64" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        return []

    def other_side_symbol(wt, sz):
        """Mirror of arrow_side for above the reference line."""
        if wt == "fillet":
            return [
                '<polygon points="90,50 108,50 90,32" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="36" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt == "square_groove":
            return [
                '<line x1="100" y1="50" x2="100" y2="35" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="38" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt in ("V_groove", "v_groove"):
            return [
                '<polyline points="90,50 100,34 110,50" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="38" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt == "bevel":
            return [
                '<line x1="90" y1="50" x2="90" y2="34" stroke="#7c3aed" stroke-width="1.5"/>',
                '<line x1="90" y1="34" x2="110" y2="50" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="38" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt in ("J_groove", "j_groove"):
            return [
                '<path d="M 110,50 Q 90,50 90,34" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="38" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        elif wt in ("U_groove", "u_groove"):
            return [
                '<polyline points="90,50 93,34 107,34 110,50" fill="none" stroke="#7c3aed" stroke-width="1.5"/>',
                f'<text x="76" y="38" font-family="JetBrains Mono,monospace" font-size="10" fill="#fafafa">{sz}</text>'
            ]
        return arrow_side_symbol(wt, sz)  # fallback

    # Add weld symbols based on configuration
    if configuration in ("arrow_side", "both_sides"):
        parts.extend(arrow_side_symbol(weld_type, size))
    if configuration in ("other_side", "both_sides"):
        parts.extend(other_side_symbol(weld_type, size))

    # Contour symbol (above/on ref line, right of weld symbol)
    if contour:
        cx = 140
        if contour == "flush":
            parts.append(f'<line x1="{cx-8}" y1="50" x2="{cx+8}" y2="50" stroke="#a1a1aa" stroke-width="1.5"/>')
        elif contour == "convex":
            parts.append(f'<path d="M {cx-8},50 Q {cx},42 {cx+8},50" fill="none" stroke="#a1a1aa" stroke-width="1.5"/>')
        elif contour == "concave":
            parts.append(f'<path d="M {cx-8},50 Q {cx},58 {cx+8},50" fill="none" stroke="#a1a1aa" stroke-width="1.5"/>')
        if finish:
            parts.append(f'<text x="{cx+10}" y="48" font-family="JetBrains Mono,monospace" font-size="10" fill="#a1a1aa">{finish}</text>')

    # Intermittent weld annotation
    if length and pitch:
        parts.append(f'<text x="120" y="46" font-family="JetBrains Mono,monospace" font-size="9" fill="#a1a1aa">{length}-{pitch}</text>')

    # Root opening annotation
    if root_opening is not None:
        parts.append(f'<text x="102" y="64" font-family="JetBrains Mono,monospace" font-size="8" fill="#a1a1aa">({root_opening})</text>')

    # Tail
    if tail:
        parts.append('<line x1="185" y1="50" x2="200" y2="42" stroke="#a1a1aa" stroke-width="1.2"/>')
        parts.append('<line x1="185" y1="50" x2="200" y2="58" stroke="#a1a1aa" stroke-width="1.2"/>')
        parts.append(f'<text x="202" y="53" font-family="JetBrains Mono,monospace" font-size="8" fill="#a1a1aa">{tail[:20]}</text>')

    svg_content = "\n  ".join(parts)
    svg = f'<svg viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" width="240" height="100" style="overflow:visible">\n  {svg_content}\n</svg>'

    # Build notation string
    notation_parts = []
    if size:
        notation_parts.append(str(size))
    if weld_type == "fillet":
        notation_parts.append("▲")
    elif weld_type in ("V_groove", "v_groove"):
        notation_parts.append("V")
    elif weld_type == "bevel":
        notation_parts.append("∧")
    if configuration == "both_sides":
        notation_parts.append("(BOTH SIDES)")
    elif configuration == "other_side":
        notation_parts.append("(OTHER SIDE)")
    if length and pitch:
        notation_parts.append(f"{length}-{pitch}")
    if all_around:
        notation_parts.append("ALL AROUND")
    if field_weld:
        notation_parts.append("FIELD WELD")
    if tail:
        notation_parts.append(f"[{tail}]")
    notation = " ".join(notation_parts)

    return {"svg": svg, "notation": notation}


# Backward compat alias
def generate_weld_symbol_svg(params: dict) -> dict:
    weld_type = "fillet"
    conf = params.get("configuration", "both_sides")
    size = params.get("size", 6)
    return generate_symbol_svg({
        "weld_type": weld_type,
        "configuration": conf,
        "size": size
    })
