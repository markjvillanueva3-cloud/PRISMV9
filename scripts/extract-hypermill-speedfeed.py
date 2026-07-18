#!/usr/bin/env python3
"""Extract hyperMILL IM_Tool_DB diameter-dependent speed/feed data into TypeScript catalog."""
import sqlite3
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB_PATH = r"C:\PRISM\HYPERMILL\hyperMILL\33.0\AddIns\hmAutoColor\Wizards\AutomationCenter\DATABASE\INTELLIGENT_MACRO\IM_Tool_DB_V2023.1.db"
OUT_PATH = "C:/PRISM/mcp-server/src/data/hypermill-speed-feed-catalog.ts"

conn = sqlite3.connect(DB_PATH)

# Materials
materials = {}
for r in conn.execute("SELECT id, name FROM Materials").fetchall():
    materials[r[0]] = r[1]

# Cutting materials
cutting_mats = {}
for r in conn.execute("SELECT id, name FROM CuttingMaterials").fetchall():
    name = str(r[1]).encode("ascii", "replace").decode("ascii")
    cutting_mats[r[0]] = name

# Formulas
formulas = []
for r in conn.execute("SELECT id, name, formula FROM Formulas").fetchall():
    name = str(r[1]).encode("ascii", "replace").decode("ascii")
    formula = str(r[2]).encode("ascii", "replace").decode("ascii") if r[2] else ""
    formulas.append((r[0], name, formula))

# MatTechs
mat_techs = conn.execute(
    "SELECT mat_tech_id, technology_type, material_id, cutting_material_id FROM MatTechs"
).fetchall()

# MatTechItems (diameter-dependent Vc/fz)
mat_tech_items = conn.execute(
    "SELECT mat_tech_item_id, mat_tech_id, limiting_diameter, cutting_speed, feedrate_per_edge, drilling_feedrate FROM MatTechItems ORDER BY mat_tech_id, limiting_diameter"
).fetchall()

out = []
out.append("/**")
out.append(" * hyperMILL Speed/Feed Catalog - extracted from IM_Tool_DB_V2023.1.db")
out.append(" * Diameter-dependent cutting speed (Vc) and feed per edge (fz) lookup tables")
out.append(" * from hyperMILL Automation Center Intelligent Macro system.")
out.append(" *")
out.append(" * Materials: 16MnCr5 (steel <=800 N/mm2), AlZnMg (aluminum <=550 N/mm2), VA (stainless <=750 N/mm2)")
out.append(" * Cutting materials: VHM (solid carbide) milling/drilling/ball, HSS taps/drills, reamers, barrel cutters")
out.append(" * Each entry: diameter threshold -> Vc (m/min), fz (mm/tooth), drilling feed (mm/rev)")
out.append(" */")
out.append("")
out.append("export interface HyperMillSpeedFeedEntry {")
out.append("  /** Max diameter for this bracket (mm). 10000 = unlimited. */")
out.append("  limiting_diameter: number;")
out.append("  /** Cutting speed Vc (m/min) */")
out.append("  cutting_speed: number;")
out.append("  /** Feed per edge fz (mm/tooth). 0 = not applicable. */")
out.append("  feedrate_per_edge: number;")
out.append("  /** Drilling feedrate f (mm/rev). 0 = not applicable. */")
out.append("  drilling_feedrate: number;")
out.append("}")
out.append("")
out.append("export interface HyperMillMatTech {")
out.append("  id: number;")
out.append("  material: string;")
out.append("  cutting_material: string;")
out.append("  items: HyperMillSpeedFeedEntry[];")
out.append("}")
out.append("")

# Write formulas
out.append("/** hyperMILL speed/feed formulas */")
out.append("export const HYPERMILL_FORMULAS: Array<{ id: number; name: string; formula: string }> = [")
for fid, fname, fformula in formulas:
    out.append(f"  {{ id: {fid}, name: '{fname}', formula: '{fformula}' }},")
out.append("];")
out.append("")

# Build items per mat_tech
items_by_mt = {}
for item in mat_tech_items:
    mt_id = item[1]
    if mt_id not in items_by_mt:
        items_by_mt[mt_id] = []
    items_by_mt[mt_id].append({
        "limiting_diameter": item[2],
        "cutting_speed": item[3],
        "feedrate_per_edge": item[4],
        "drilling_feedrate": item[5],
    })

# Write mat_techs with items
out.append(f"/** {len(mat_techs)} material/tool combinations with {len(mat_tech_items)} diameter-dependent entries */")
out.append("export const HYPERMILL_MAT_TECHS: HyperMillMatTech[] = [")
for mt in mat_techs:
    mt_id = mt[0]
    mat_name = materials.get(mt[2], f"Material_{mt[2]}")
    cm_name = cutting_mats.get(mt[3], f"CutMat_{mt[3]}")
    items = items_by_mt.get(mt_id, [])
    items_sorted = sorted(items, key=lambda x: x["limiting_diameter"])

    items_str = ", ".join(
        f"{{ limiting_diameter: {i['limiting_diameter']}, cutting_speed: {i['cutting_speed']}, "
        f"feedrate_per_edge: {i['feedrate_per_edge']}, drilling_feedrate: {i['drilling_feedrate']} }}"
        for i in items_sorted
    )

    out.append(f"  {{ id: {mt_id}, material: '{mat_name}', cutting_material: '{cm_name}', items: [{items_str}] }},")

out.append("];")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print(f"Written {len(mat_techs)} mat_techs with {len(mat_tech_items)} items to {OUT_PATH}")
conn.close()
