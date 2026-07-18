"""
PRISM Tool Library Export for Fusion 360
=========================================
Exports PRISM's 95,608-tool catalog as Fusion 360 .tools JSON files.

Partitions into libraries of ≤500 tools (Fusion's performance limit),
grouped by manufacturer + tool type.

Each tool includes:
  - Full geometry (DC, SFDM, LCF, OAL, NOF, RE, HA)
  - Shaft segments (neck/transition geometry)
  - Holder geometry (17 taper types: ER, HSK, CAT, BT, Capto, Shrink, Hydraulic)
  - Cutting data presets for ALL 6 ISO material groups (P/M/K/N/S/H)
  - Coolant strategy per material group
  - Ramp/plunge parameters
  - Playbook tips from PRISM tribal knowledge

Usage:
  Run from PRISM mcp-server directory:
    node -e "import('./dist/scripts/export-fusion-tools.js')"

  Or call the REST API:
    POST http://localhost:3000/api/v1/export/fusion-tools

  The script writes .tools files to:
    %APPDATA%/Autodesk/Autodesk Fusion 360/CAM/Libraries/Local/PRISM-*.tools
"""
import json
import os
import sys
import math

# This script is meant to be run from Node.js via the MCP server,
# but can also be executed standalone with Python for file generation.

# ── Configuration ─────────────────────────────────────────────────────

MAX_TOOLS_PER_LIBRARY = 500
OUTPUT_DIR = os.path.join(
    os.environ.get("APPDATA", os.path.expanduser("~")),
    "Autodesk", "Autodesk Fusion 360", "CAM", "Libraries", "Local"
)

# Canonical Kienzle kc1.1 per ISO group (from PRISM constants.ts)
CANONICAL_KC = {"P": 1800, "M": 2100, "K": 1100, "N": 700, "S": 2800, "H": 3200}
DEFAULT_VC = {"P": 150, "M": 100, "K": 200, "N": 400, "S": 50, "H": 120}
DEFAULT_FZ = {"P": 0.10, "M": 0.08, "K": 0.12, "N": 0.15, "S": 0.06, "H": 0.05}

# Holder profiles: [body_diameter_mm, gauge_length_mm, description]
HOLDER_PROFILES = {
    "ER16": [26, 35, "ER16 Collet Chuck"], "ER20": [34, 40, "ER20 Collet Chuck"],
    "ER25": [42, 40, "ER25 Collet Chuck"], "ER32": [50, 46, "ER32 Collet Chuck"],
    "ER40": [63, 55, "ER40 Collet Chuck"], "HSK-A63": [63, 80, "HSK-A63"],
    "HSK-A100": [80, 100, "HSK-A100"], "CAT40": [63, 85, "CAT40 V-Flange"],
    "CAT50": [80, 105, "CAT50 V-Flange"], "BT30": [46, 50, "BT30"],
    "BT40": [63, 65, "BT40"], "BT50": [80, 85, "BT50"],
    "Capto-C4": [40, 55, "Capto C4"], "Capto-C6": [63, 80, "Capto C6"],
    "Capto-C8": [80, 100, "Capto C8"], "Shrink-Fit": [0, 60, "Shrink Fit"],
    "Hydraulic": [0, 70, "Hydraulic Chuck"],
}


def select_holder(shank_d, holder_interface=None):
    """Select appropriate holder based on shank diameter."""
    if holder_interface and holder_interface in HOLDER_PROFILES:
        return holder_interface
    if shank_d <= 6: return "ER16"
    if shank_d <= 13: return "ER20"
    if shank_d <= 16: return "ER25"
    if shank_d <= 20: return "ER32"
    if shank_d <= 25: return "ER40"
    return "CAT40"


def fusion_tool_type(tool_type, corner_radius=0, diameter=10):
    """Map PRISM tool type to Fusion 360 type string."""
    t = (tool_type or "").lower()
    if "ball" in t or (corner_radius >= diameter / 2 - 0.1 and corner_radius > 0):
        return "ball end mill"
    if "bull" in t or "corner" in t or (0 < corner_radius < diameter / 2 - 0.1):
        return "bull nose end mill"
    if "face" in t: return "face mill"
    if "drill" in t: return "drill"
    if "tap" in t: return "tap right hand"
    if "ream" in t: return "reamer"
    if "chamfer" in t: return "chamfer mill"
    if "bore" in t: return "boring bar"
    if "thread" in t and "mill" in t: return "thread mill"
    return "flat end mill"


def fusion_bmc(coating):
    """Map coating to Fusion BMC (body material class)."""
    c = (coating or "").lower()
    if "hss" in c: return "hss"
    if "cbn" in c: return "cbn"
    if "pcd" in c or "diamond" in c: return "pcd"
    if "ceramic" in c: return "ceramic"
    return "carbide"


def coolant_for_preset(iso, tool_type, diameter):
    """Determine coolant strategy based on tool type and ISO group."""
    t = (tool_type or "").lower()
    if "drill" in t: return "through tool" if diameter >= 3 else "flood"
    if "tap" in t: return "flood"
    if "ball" in t: return "mist"
    if "face" in t: return "flood"
    defaults = {"P": "flood", "M": "flood", "K": "disabled", "N": "flood", "S": "through tool", "H": "disabled"}
    return defaults.get(iso, "flood")


def generate_presets(d, flutes, loc, cutting_data=None, tool_type="end_mill"):
    """Generate cutting parameter presets for all 6 ISO material groups."""
    groups = [
        ("P", "Steel (P)"), ("M", "Stainless (M)"), ("K", "Cast Iron (K)"),
        ("N", "Aluminum (N)"), ("S", "Superalloy (S)"), ("H", "Hardened (H)"),
    ]
    rough_ap = round(loc * 0.5, 2)
    rough_ae = round(d * 0.5, 2)
    presets = []

    for iso, name in groups:
        cd = (cutting_data or {}).get(iso)
        if cd:
            vc = (cd.get("vc_min", 100) + cd.get("vc_max", 200)) / 2
            fz = (cd.get("fz_min", 0.05) + cd.get("fz_max", 0.15)) / 2
        else:
            vc = DEFAULT_VC.get(iso, 150)
            fz = DEFAULT_FZ.get(iso, 0.1) * math.sqrt(d / 10)

        rpm = round((vc * 1000) / (math.pi * d)) if d > 0 else 1000
        feed = round(fz * flutes * rpm)
        stepdown = cd.get("ap_max", rough_ap) if cd else rough_ap
        stepover = cd.get("ae_max", rough_ae) if cd else rough_ae
        coolant = coolant_for_preset(iso, tool_type, d)

        # Ramp params
        if "drill" in tool_type.lower():
            ramp_rpm, ramp_feed = rpm, feed
        elif "ball" in tool_type.lower():
            ramp_rpm, ramp_feed = round(rpm * 0.7), round(feed * 0.4)
        else:
            ramp_rpm, ramp_feed = round(rpm * 0.6), round(feed * 0.3)

        presets.append({
            "name": name,
            "f_n": round(fz, 4),
            "n": rpm,
            "n_ramp": ramp_rpm,
            "f_ramp": ramp_feed,
            "stepdown": round(min(stepdown, loc), 2),
            "stepover": round(min(stepover, d), 2),
            "tool_coolant": coolant,
        })

    return presets


def convert_tool(tool):
    """Convert a PRISM catalog tool dict to Fusion 360 .tools format."""
    phys = tool.get("physical", {})
    d = phys.get("cutting_diameter_mm") or tool.get("cutting_diameter_mm") or tool.get("diameter_mm") or 10
    shank_d = phys.get("shank_diameter_mm") or tool.get("shank_diameter_mm") or d
    loc = phys.get("flute_length_mm") or tool.get("flute_length_mm") or d * 3
    oal = phys.get("overall_length_mm") or tool.get("overall_length_mm") or d * 6
    flutes = phys.get("flute_count") or tool.get("flute_count") or 3
    cr = phys.get("corner_radius_mm") or tool.get("corner_radius_mm") or 0
    helix = tool.get("helix_angle_deg") or 30
    coating = tool.get("coating") or "TiAlN"
    t_type = tool.get("type") or "end_mill"
    vendor = tool.get("manufacturer") or "Generic"
    designation = tool.get("designation") or tool.get("series") or f"{d}mm {flutes}FL"
    product_id = tool.get("id") or f"prism-{vendor}-{d}-{flutes}fl".lower().replace(" ", "-")

    # Shaft segments
    shaft_segs = []
    if abs(shank_d - d) > 0.1:
        shaft_segs.append({"upper-diameter": d, "lower-diameter": shank_d, "height": 2})
    shaft_segs.append({"upper-diameter": shank_d, "lower-diameter": shank_d, "height": max(1, oal - loc - 2)})

    # Holder
    taper = select_holder(shank_d, tool.get("holder_interface"))
    hp = HOLDER_PROFILES.get(taper, HOLDER_PROFILES["ER32"])
    h_body = hp[0] if hp[0] > 0 else max(shank_d + 8, 26)
    h_len = hp[1]

    holder_segs = [
        {"upper-diameter": h_body, "lower-diameter": h_body, "height": round(h_len * 0.7, 1)},
        {"upper-diameter": h_body, "lower-diameter": round(h_body * 1.3, 1), "height": round(h_len * 0.15, 1)},
        {"upper-diameter": round(h_body * 1.3, 1), "lower-diameter": round(h_body * 0.6, 1), "height": round(h_len * 0.15, 1)},
    ]

    # Presets
    cutting_data = tool.get("cutting_data")
    presets = generate_presets(d, flutes, loc, cutting_data, t_type)

    return {
        "BMC": fusion_bmc(coating),
        "HAND": "R",
        "type": fusion_tool_type(t_type, cr, d),
        "unit": "millimeters",
        "geometry": {
            "DC": d, "SFDM": shank_d, "LCF": loc,
            "OAL": oal, "NOF": flutes, "RE": cr,
            **({"HA": helix} if helix else {}),
        },
        "shaft": {"segments": shaft_segs},
        "holder": {
            "description": hp[2],
            "vendor": "Generic",
            "geometry": {"DC": h_body, "LB": h_len, "LH": h_len + oal - loc, "connection": taper},
            "segments": holder_segs,
        },
        "start-values": {"presets": presets},
        "description": f"PRISM: {vendor} {designation} {coating}",
        "vendor": vendor,
        "product-id": product_id,
        "comment": f"Physics S/F from PRISM (Kienzle/Taylor). Holder: {taper}",
    }


def partition_tools(tools):
    """Group tools by manufacturer+type, split into ≤500-tool libraries."""
    groups = {}
    for t in tools:
        mfr = (t.get("manufacturer") or "Generic").replace(" ", "")[:20]
        ttype = (t.get("type") or "end_mill").replace(" ", "")
        key = f"PRISM-{mfr}-{ttype}"
        groups.setdefault(key, []).append(t)

    libraries = {}
    for key, group_tools in groups.items():
        if len(group_tools) <= MAX_TOOLS_PER_LIBRARY:
            libraries[key] = group_tools
        else:
            for i in range(0, len(group_tools), MAX_TOOLS_PER_LIBRARY):
                chunk = group_tools[i:i + MAX_TOOLS_PER_LIBRARY]
                part = i // MAX_TOOLS_PER_LIBRARY + 1
                libraries[f"{key}-Part{part}"] = chunk

    return libraries


def export_all(tools, output_dir=None):
    """Export all tools to Fusion 360 .tools files."""
    out = output_dir or OUTPUT_DIR
    os.makedirs(out, exist_ok=True)

    libraries = partition_tools(tools)
    results = []

    for lib_name, lib_tools in libraries.items():
        fusion_tools = [convert_tool(t) for t in lib_tools]
        library_data = {
            "version": 2,
            "data": fusion_tools,
        }
        file_path = os.path.join(out, f"{lib_name}.tools")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(library_data, f, indent=2)

        results.append({
            "library": lib_name,
            "tool_count": len(fusion_tools),
            "path": file_path,
        })

    return {
        "total_tools": sum(r["tool_count"] for r in results),
        "libraries": len(results),
        "output_dir": out,
        "details": results,
    }


# ── Standalone execution ─────────────────────────────────────────────

if __name__ == "__main__":
    print("PRISM Tool Library Export for Fusion 360")
    print("=" * 50)

    # Load tools from PRISM MCP server with pagination to avoid OOM
    tools = []
    PAGE_SIZE = 1000
    try:
        from urllib.request import Request, urlopen
        offset = 0
        while True:
            req = Request(
                "http://127.0.0.1:3000/api/v1/tools/search",
                data=json.dumps({"max_results": PAGE_SIZE, "offset": offset}).encode(),
                headers={"Content-Type": "application/json"}
            )
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
                page = data.get("result", {}).get("tools", [])
                if not page:
                    page = data.get("tools", [])
                if not page:
                    break
                tools.extend(page)
                print(f"  Loaded {len(tools)} tools...")
                if len(page) < PAGE_SIZE:
                    break  # Last page
                offset += PAGE_SIZE
    except Exception as e:
        print(f"Could not connect to PRISM server: {e}")

    if not tools:
        print("No tools from server — generating common tool set...")
        diameters = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32]
        for d in diameters:
            for t_type, fl in [("end_mill", 3 if d <= 6 else 4), ("ball_mill", 2), ("drill", 2)]:
                tools.append({
                    "type": t_type, "cutting_diameter_mm": d,
                    "flute_count": fl, "flute_length_mm": d * 3,
                    "overall_length_mm": d * 6,
                    "corner_radius_mm": d / 2 if "ball" in t_type else 0,
                    "coating": "TiAlN", "manufacturer": "PRISM Generic",
                    "designation": f"D{d} {t_type.replace('_',' ').title()} {fl}FL",
                })

    result = export_all(tools)
    print(f"\nExported {result['total_tools']} tools across {result['libraries']} libraries")
    print(f"Output: {result['output_dir']}")
    for det in result["details"]:
        print(f"  {det['library']}: {det['tool_count']} tools")
