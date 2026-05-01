#!/usr/bin/env python3
"""Extract hyperMILL materials.db into TypeScript catalog file."""
import sqlite3
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DB_PATH = "C:/PRISM/HYPERMILL/Tool Database/33.0/databases/materials.db"
OUT_PATH = "C:/PRISM/mcp-server/src/data/hypermill-materials-catalog.ts"

conn = sqlite3.connect(DB_PATH)

# Build lookup maps
cc_rows = conn.execute("SELECT chipping_class_id, name FROM ChippingClasses").fetchall()
cc_map = {}
for r in cc_rows:
    name = r[1].encode("ascii", "replace").decode("ascii")
    cc_map[r[0]] = name

g_map = dict(conn.execute("SELECT material_group_id, name FROM MaterialGroups").fetchall())
sg_map = dict(conn.execute("SELECT material_sub_group_id, name FROM MaterialSubGroups").fetchall())

# Extract all materials
rows = conn.execute("""SELECT material_no, din_en_name, din_name, aisi_name, jis_name, uns_name,
    afnor_name, bs_name, uni_name, gost_name,
    material_group_id, material_sub_group_id, quality_id,
    hardness_hb_min, hardness_hb_max, hardness_hv_min, hardness_hv_max,
    hardness_hrc_min, hardness_hrc_max, rm_min, rm_max,
    milling_chipping_class_id, milling_factor_vc, milling_factor_fz, milling_factor_ae, milling_factor_ap,
    drilling_chipping_class_id, drilling_factor_vc, drilling_factor_fz,
    insert_chipping_class_id, insert_factor_vc, insert_factor_fz, insert_factor_ae, insert_factor_ap
FROM Materials ORDER BY material_group_id, material_sub_group_id, quality_id""").fetchall()

out = []
out.append("/**")
out.append(" * hyperMILL Materials Catalog - extracted from hyperMILL v33.0 materials.db")
out.append(" * 2,544 materials with ISO cross-references and machinability correction factors")
out.append(" * Source: C:/PRISM/HYPERMILL/Tool Database/33.0/databases/materials.db")
out.append(" *")
out.append(" * Chipping classes define machinability bands (ISO P/M/K/N/S/H groups).")
out.append(" * Correction factors multiply base Vc/fz/ae/ap within each chipping class.")
out.append(" * factor < 1.0 = harder to machine, factor > 1.0 = easier to machine.")
out.append(" */")
out.append("")
out.append("export interface HyperMillChippingClass {")
out.append("  id: number;")
out.append("  name: string;")
out.append("}")
out.append("")
out.append("export interface HyperMillMaterial {")
out.append("  material_no: string | null;")
out.append("  names: {")
out.append("    din_en?: string; din?: string; aisi?: string; jis?: string;")
out.append("    uns?: string; afnor?: string; bs?: string; uni?: string; gost?: string;")
out.append("  };")
out.append("  group: string;")
out.append("  subgroup: string;")
out.append("  hardness: {")
out.append("    hb_min: number; hb_max: number;")
out.append("    hv_min: number; hv_max: number;")
out.append("    hrc_min: number; hrc_max: number;")
out.append("  };")
out.append("  rm_min: number;")
out.append("  rm_max: number;")
out.append("  milling: { chipping_class: number; factor_vc: number; factor_fz: number; factor_ae: number; factor_ap: number; };")
out.append("  drilling: { chipping_class: number; factor_vc: number; factor_fz: number; };")
out.append("  insert: { chipping_class: number; factor_vc: number; factor_fz: number; factor_ae: number; factor_ap: number; };")
out.append("}")
out.append("")

# Chipping classes
out.append("export const HYPERMILL_CHIPPING_CLASSES: HyperMillChippingClass[] = [")
for cid in sorted(cc_map.keys()):
    name_esc = cc_map[cid].replace("'", "\\'")
    out.append(f"  {{ id: {cid}, name: '{name_esc}' }},")
out.append("];")
out.append("")

# Materials
out.append(f"/** {len(rows)} materials from hyperMILL v33.0 materials.db */")
out.append("export const HYPERMILL_MATERIALS: HyperMillMaterial[] = [")

def esc(val):
    if val is None:
        return None
    s = str(val).encode("ascii", "replace").decode("ascii")
    return s.replace("\\", "\\\\").replace("'", "\\'")

for r in rows:
    mat_no = f"'{esc(r[0])}'" if r[0] else "null"
    names_parts = []
    name_fields = ["din_en", "din", "aisi", "jis", "uns", "afnor", "bs", "uni", "gost"]
    for i, field in enumerate(name_fields):
        val = r[i + 1]
        if val:
            names_parts.append(f"{field}: '{esc(val)}'")
    names_str = ", ".join(names_parts) if names_parts else ""

    group = esc(g_map.get(r[10], "Unknown"))
    subgroup = esc(sg_map.get(r[11], "Unknown"))

    hb_min = r[13] or 0
    hb_max = r[14] or 0
    hv_min = r[15] or 0
    hv_max = r[16] or 0
    hrc_min = r[17] or 0
    hrc_max = r[18] or 0
    rm_min = r[19] or 0
    rm_max = r[20] or 0

    m_cc = r[21] or 0
    m_vc = r[22] or 1.0
    m_fz = r[23] or 1.0
    m_ae = r[24] or 1.0
    m_ap = r[25] or 1.0
    d_cc = r[26] or 0
    d_vc = r[27] or 1.0
    d_fz = r[28] or 1.0
    i_cc = r[29] or 0
    i_vc = r[30] or 1.0
    i_fz = r[31] or 1.0
    i_ae = r[32] or 1.0
    i_ap = r[33] or 1.0

    line = (
        f"  {{ material_no: {mat_no}, "
        f"names: {{ {names_str} }}, "
        f"group: '{group}', subgroup: '{subgroup}', "
        f"hardness: {{ hb_min: {hb_min}, hb_max: {hb_max}, hv_min: {hv_min}, hv_max: {hv_max}, hrc_min: {hrc_min}, hrc_max: {hrc_max} }}, "
        f"rm_min: {rm_min}, rm_max: {rm_max}, "
        f"milling: {{ chipping_class: {m_cc}, factor_vc: {m_vc}, factor_fz: {m_fz}, factor_ae: {m_ae}, factor_ap: {m_ap} }}, "
        f"drilling: {{ chipping_class: {d_cc}, factor_vc: {d_vc}, factor_fz: {d_fz} }}, "
        f"insert: {{ chipping_class: {i_cc}, factor_vc: {i_vc}, factor_fz: {i_fz}, factor_ae: {i_ae}, factor_ap: {i_ap} }} }},"
    )
    out.append(line)

out.append("];")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print(f"Written {len(rows)} materials to {OUT_PATH}")
conn.close()
