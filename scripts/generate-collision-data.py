#!/usr/bin/env python3
"""Generate collision avoidance data for every tool in the catalog.

Reads all extracted tool data and generates a compact collision dataset with:
- Physical dimensions (cutting_diameter, shank_diameter, OAL, flute_length)
- Z-position collision zones (cutting, neck, shank)
- Max radial depth of cut
- Holder compatibility info

Output: src/data/collision-avoidance-data.json (compact format for runtime use)
"""

import json, os
from collections import Counter

data_path = "C:/PRISM/mcp-server/src/data/"

# Load all tool sources
def load_json(filename):
    fp = os.path.join(data_path, filename)
    if os.path.exists(fp):
        with open(fp) as f:
            return json.load(f)
    return []

# All tool sources with their TypeScript catalog files
tool_sources = {
    "OSG": ("osg-tools-extracted.json", "osg-tool-catalog.ts"),
    "Guhring": ("guhring-tools-extracted.json", "guhring-tool-catalog.ts"),
    "Sandvik": ("sandvik-tools-extracted.json", "sandvik-tool-catalog.ts"),
    "Flash": ("flash-tools-extracted.json", "additional-tool-catalog.ts"),
    "MA Ford": ("ma-ford-tools-extracted.json", "additional-tool-catalog.ts"),
    "Korloy": ("korloy-tools-extracted.json", "additional-tool-catalog.ts"),
    "Generic": ("unknown_solid-tools-extracted.json", "additional-tool-catalog.ts"),
    "Rapidkut": ("rapidkut-tools-extracted.json", "additional-tool-catalog.ts"),
    "Seco": ("seco-tools-extracted.json", "seco-tool-catalog.ts"),
    "Kennametal_Milling": ("kennametal-milling-extracted.json", "indexable-tool-catalog.ts"),
    "Kennametal_Holemaking": ("kennametal-holemaking-extracted.json", "indexable-tool-catalog.ts"),
    "ISCAR": ("iscar-tools-extracted.json", "indexable-tool-catalog.ts"),
    "Korloy_Rotating": ("korloy-rotating-extracted.json", "indexable-tool-catalog.ts"),
    "Allied": ("ampc-tools-extracted.json", "indexable-tool-catalog.ts"),
    "CAMFIX": ("camfix-tools-extracted.json", "indexable-tool-catalog.ts"),
    "ISCAR_Turning": ("iscar-turning-extracted.json", "indexable-tool-catalog.ts"),
    "YG1": ("yg1-tools-extracted.json", "additional-tool-catalog.ts"),
    "Accupro": ("accupro-tools-extracted.json", "additional-tool-catalog.ts"),
}

all_tools = []
mfg_counts = Counter()

for mfg, (json_file, _ts_file) in tool_sources.items():
    tools = load_json(json_file)
    for t in tools:
        t["manufacturer"] = mfg
    all_tools.extend(tools)
    mfg_counts[mfg] = len(tools)
    print(f"  {mfg}: {len(tools)} tools")

# Also include Tungaloy endmills/drills (already in TS, load from JSON if exists)
tungaloy_em = load_json("tungaloy-endmills-extracted.json")
tungaloy_dr = load_json("tungaloy-drills-extracted.json")
# If JSON doesn't exist, we skip — they're already in ToolCatalogEngine via TS imports

print(f"\nJSON sources total: {len(all_tools)} tools")
print(f"Note: Tungaloy ({len(tungaloy_em)+len(tungaloy_dr)}) + SGS + Standard tools are loaded via TS imports, not JSON")

# Generate collision zones for each tool
collision_data = []
stats = {"total": 0, "with_oal": 0, "with_loc": 0, "with_shank": 0, "with_neck": 0}

for t in all_tools:
    dc = t.get("cutting_diameter_mm", 0)
    if dc <= 0:
        continue

    shank = t.get("shank_diameter_mm", dc)
    oal = t.get("overall_length_mm")
    loc = t.get("flute_length_mm")
    neck_d = t.get("neck_diameter_mm")
    neck_l = t.get("neck_length_mm")
    cr = t.get("corner_radius_mm")
    fc = t.get("flute_count")

    # Estimate missing dimensions
    if not oal:
        oal = dc * 6  # Standard 6xD OAL
    if not loc:
        loc = dc * 2  # Standard 2xD LOC

    stats["total"] += 1
    if t.get("overall_length_mm"):
        stats["with_oal"] += 1
    if t.get("flute_length_mm"):
        stats["with_loc"] += 1
    if t.get("shank_diameter_mm"):
        stats["with_shank"] += 1
    if neck_d:
        stats["with_neck"] += 1

    # Build collision zones
    zones = []

    # Zone 1: Cutting (fluted region)
    zones.append({
        "zone": "cutting",
        "z_start": 0,
        "z_end": round(loc, 2),
        "diameter": round(dc, 2)
    })

    # Zone 2: Neck (reduced diameter between flutes and shank)
    if neck_d and neck_l:
        zones.append({
            "zone": "neck",
            "z_start": round(loc, 2),
            "z_end": round(loc + neck_l, 2),
            "diameter": round(neck_d, 2)
        })
        shank_start = loc + neck_l
    else:
        shank_start = loc

    # Zone 3: Shank (from end of flutes/neck to OAL)
    zones.append({
        "zone": "shank",
        "z_start": round(shank_start, 2),
        "z_end": round(oal, 2),
        "diameter": round(shank, 2)
    })

    # Build collision record
    desig = t.get("designation", f"{t['manufacturer'][:3]}-{dc}")
    desig = desig.replace("\n", "").strip()

    record = {
        "id": f"{t['manufacturer'][:3].upper()}-{desig}",
        "mfg": t["manufacturer"],
        "type": t.get("type", "end_mill"),
        "dc": round(dc, 2),
        "ds": round(shank, 2),
        "oal": round(oal, 2),
        "loc": round(loc, 2),
        "fc": fc or (2 if t.get("type") == "drill" else 4),
        "zones": zones,
    }
    if cr:
        record["cr"] = round(cr, 3)
    if neck_d:
        record["nd"] = round(neck_d, 2)
    if neck_l:
        record["nl"] = round(neck_l, 2)

    collision_data.append(record)

# Sort by manufacturer, then diameter
collision_data.sort(key=lambda x: (x["mfg"], x["dc"]))

# Write compact JSON
output_path = os.path.join(data_path, "collision-avoidance-data.json")
with open(output_path, "w") as f:
    json.dump({
        "version": "1.0.0",
        "description": "Pre-computed collision avoidance data for all catalog tools",
        "total_tools": len(collision_data),
        "field_legend": {
            "dc": "cutting_diameter_mm",
            "ds": "shank_diameter_mm",
            "oal": "overall_length_mm",
            "loc": "flute_length_mm (LOC)",
            "fc": "flute_count",
            "cr": "corner_radius_mm",
            "nd": "neck_diameter_mm",
            "nl": "neck_length_mm",
            "zones": "collision zones from tip (z=0) upward",
        },
        "by_manufacturer": dict(mfg_counts),
        "data_completeness": stats,
        "tools": collision_data,
    }, f, separators=(",", ":"))

# File size
size_kb = os.path.getsize(output_path) / 1024
print(f"\nGenerated collision-avoidance-data.json")
print(f"  Tools: {len(collision_data)}")
print(f"  Size: {size_kb:.0f} KB")
print(f"  Completeness: {stats}")
print(f"  By manufacturer: {dict(mfg_counts)}")
