#!/usr/bin/env python3
"""
jm-csv-to-fusion-tools.py  (slot:romeo, 2026-06-15)

Convert JM Die per-machine Fusion CSV tool libraries
(state/shared/jm-fusion-tools/by-machine/<MACHINE>/FUSION-IMPORT.csv)
into Fusion .tools JSON libraries and drop them into Fusion's discovered
Local tool-library directory so the running seat picks them up.

WHY a converter (not the live API): adsk.cam ToolLibraries.importToolLibrary
imports a ToolLibrary OBJECT, not a CSV file (CSV import is UI-only). Fusion
auto-discovers .tools files placed in
  %APPDATA%\\Autodesk\\Autodesk Fusion 360\\CAM\\Libraries\\Local\\
(verified live via PRISMBridge :18361 GET /tool-library).

STRUCTURE (critical): the per-machine FUSION-IMPORT.csv carries ONE ROW PER
(tool x material x operation). e.g. one 1/2" end mill has 352 rows -- one per
{1018 Steel (P) Rough / HEM Adaptive / Trochoidal / Slot / Ramp / Semi / Finish
/ HSM, x each ISO material}. So we GROUP rows by tool identity (description) and
emit ONE Fusion tool with a presets[] array holding every (material,operation)
cutting condition. This is the JM "all-conditions matrix" (tasks #15-21).

PRESET SCHEMA is taken verbatim from JM Die's own real Fusion library
(us-jmdie.json): {name, f_z, f_n, n, n_ramp, v_c, v_f, v_f_plunge, tool-coolant,
ramp-angle, use-stepdown, use-stepover, material{category,query,use-hardness},
expressions{tool_coolant,tool_feedPerTooth,tool_surfaceSpeed}, guid}.

UNITS-FIRST (safety): the JM CSVs are INCHES. tool_unit is copied verbatim and
NO numeric value is scaled. v_c is fpm, f_z is in, v_f is in/min, n is rpm --
exactly as the CSV holds them. A units mismatch is a 25.4x scale error; rows
with an unknown unit are skipped loudly, never guessed.

Usage:
  python jm-csv-to-fusion-tools.py VMC-01      # one machine
  python jm-csv-to-fusion-tools.py ALL         # every by-machine library
  python jm-csv-to-fusion-tools.py ALL --dry   # write to ./_out instead of Local
"""
import csv
import hashlib
import json
import os
import re
import sys

BY_MACHINE = r"H:\prism\state\shared\jm-fusion-tools\by-machine"
LOCAL_DIR = os.path.join(os.environ.get("APPDATA", ""), "Autodesk",
                         "Autodesk Fusion 360", "CAM", "Libraries", "Local")
_KEY_RE = re.compile(r"\(([^)]+)\)\s*$")


def header_keymap(header):
    out = {}
    for i, cell in enumerate(header):
        m = _KEY_RE.search(cell.strip())
        if m:
            out[m.group(1)] = i
    return out


def _f(row, km, key):
    i = km.get(key)
    if i is None or i >= len(row):
        return None
    v = row[i].strip()
    if v == "":
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _s(row, km, key, default=""):
    i = km.get(key)
    if i is None or i >= len(row):
        return default
    v = row[i].strip()
    return v if v != "" else default


def _b(row, km, key, default=False):
    v = _s(row, km, key, "").lower()
    if v in ("true", "1", "yes"):
        return True
    if v in ("false", "0", "no"):
        return False
    return default


def _guid(s):
    h = hashlib.md5(s.encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def build_geometry(row, km):
    dc = _f(row, km, "tool_diameter")
    if dc is None or dc <= 0:
        return None
    g = {"DC": dc, "DCN": dc, "SFDM": _f(row, km, "tool_shaftDiameter") or dc}
    nof = _f(row, km, "tool_numberOfFlutes")
    if nof:
        g["NOF"] = int(nof)
    for gkey, ckey in (("LF", "tool_fluteLength"), ("OAL", "tool_overallLength"),
                       ("shoulder-length", "tool_shoulderLength"),
                       ("shaft-diameter", "tool_shaftDiameter"),
                       ("RE", "tool_cornerRadius"),
                       ("tip-diameter", "tool_tipDiameter"),
                       ("tip-length", "tool_tipLength")):
        val = _f(row, km, ckey)
        if val is not None:
            g[gkey] = val
    g.setdefault("shoulder-length", g.get("LF", 0) or 0)
    sig = _f(row, km, "tool_tipAngle")
    if sig:
        g["SIG"] = sig
    return g


def build_preset(row, km, machine, desc):
    """One Fusion preset from one CSV (tool,material,operation) row."""
    name = _s(row, km, "preset_name") or _s(row, km, "tool_comment") or "Preset"
    n = _f(row, km, "tool_spindleSpeed")
    v_c = _f(row, km, "tool_surfaceSpeed")
    f_z = _f(row, km, "tool_feedPerTooth")
    v_f = _f(row, km, "tool_feedCutting")
    v_fp = _f(row, km, "tool_feedPlunge")
    f_n = _f(row, km, "tool_feedCuttingRel")
    nof = _f(row, km, "tool_numberOfFlutes")
    if f_n is None and f_z is not None and nof:
        f_n = f_z * nof
    coolant = _s(row, km, "tool_coolant", "flood") or "flood"
    p = {
        "name": name,
        "description": "",
        "tool-coolant": coolant,
        "ramp-angle": 2,
        "use-stepdown": False,
        "use-stepover": False,
        "material": {
            "category": _s(row, km, "tool_presetMaterialCategory", "all") or "all",
            "query": _s(row, km, "tool_presetMaterialQuery", ""),
            "use-hardness": _b(row, km, "tool_presetMaterialUseHardness", False),
        },
        "guid": _guid(f"{machine}|{desc}|{name}"),
    }
    if n is not None:
        p["n"] = n
        p["n_ramp"] = n
    if v_c is not None:
        p["v_c"] = v_c
    if f_z is not None:
        p["f_z"] = f_z
    if f_n is not None:
        p["f_n"] = f_n
    if v_f is not None:
        p["v_f"] = v_f
        p["v_f_leadIn"] = v_f
        p["v_f_leadOut"] = v_f
        p["v_f_transition"] = v_f
        p["v_f_ramp"] = v_fp if v_fp is not None else v_f
    if v_fp is not None:
        p["v_f_plunge"] = v_fp
    # human-readable expressions (units-faithful: inch tools -> in / fpm)
    expr = {"tool_coolant": "'%s'" % coolant}
    if f_z is not None:
        expr["tool_feedPerTooth"] = "%s in" % f_z
    if v_c is not None:
        expr["tool_surfaceSpeed"] = "%s fpm" % v_c
    p["expressions"] = expr
    return p


def convert_machine(machine, out_dir):
    src = os.path.join(BY_MACHINE, machine, "FUSION-IMPORT.csv")
    if not os.path.isfile(src):
        return {"machine": machine, "error": "no FUSION-IMPORT.csv"}
    groups = {}   # desc -> {"row": first_row, "presets": [...]}
    order = []
    skipped = {}
    with open(src, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        km = header_keymap(header)
        for row in reader:
            if not any(c.strip() for c in row):
                continue
            unit = _s(row, km, "tool_unit", "")
            if unit not in ("inches", "millimeters"):
                skipped["unknown-unit"] = skipped.get("unknown-unit", 0) + 1
                continue
            desc = _s(row, km, "tool_description") or _s(row, km, "preset_name")
            if build_geometry(row, km) is None:
                skipped["no-diameter"] = skipped.get("no-diameter", 0) + 1
                continue
            if desc not in groups:
                groups[desc] = {"row": row, "presets": []}
                order.append(desc)
            groups[desc]["presets"].append(build_preset(row, km, machine, desc))
        # build tools from groups (geometry from each group's first row)
        tools = []
        npresets = 0
        for desc in order:
            grp = groups[desc]
            row, km2 = grp["row"], km
            geom = build_geometry(row, km2)
            unit = _s(row, km2, "tool_unit", "inches")
            ttype = _s(row, km2, "tool_type", "flat end mill")
            pid = _s(row, km2, "tool_productId") or desc
            pp = {
                "comment": _s(row, km2, "tool_comment", desc),
                "live": _b(row, km2, "tool_live", True),
                "manual-tool-change": _b(row, km2, "tool_manualToolChange", False),
                "number": int(_f(row, km2, "tool_number") or 1),
                "tool-coolant": _s(row, km2, "tool_coolant", "flood") or "flood",
            }
            tools.append({
                "BMC": 1,
                "description": desc,
                "product-id": pid,
                "type": ttype,
                "unit": unit,
                "vendor": _s(row, km2, "tool_vendor", "JM Die"),
                "post-process": pp,
                "geometry": geom,
                "holder": {
                    "description": _s(row, km2, "holder_description", "ER Collet"),
                    "product-id": _s(row, km2, "holder_productId", ""),
                    "vendor": _s(row, km2, "holder_vendor", "Default"),
                },
                "start-values": {"presets": grp["presets"]},
            })
            npresets += len(grp["presets"])
    libname = f"PRISM_JM_{machine}"
    out_path = os.path.join(out_dir, f"{libname}.tools")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"version": 2, "data": tools}, f, indent=1)
    return {"machine": machine, "library": libname, "tools": len(tools),
            "presets": npresets, "skipped": skipped, "path": out_path}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    out_dir = os.path.abspath("./_out") if dry else LOCAL_DIR
    os.makedirs(out_dir, exist_ok=True)
    target = args[0] if args else "ALL"
    if target == "ALL":
        machines = sorted(d for d in os.listdir(BY_MACHINE)
                          if os.path.isdir(os.path.join(BY_MACHINE, d)))
    else:
        machines = [target]
    tot_t = tot_p = 0
    for m in machines:
        r = convert_machine(m, out_dir)
        tot_t += r.get("tools", 0)
        tot_p += r.get("presets", 0)
        print(json.dumps(r))
    print(f"=== {len(machines)} machine(s): {tot_t} tools, {tot_p} presets -> {out_dir} ===")


if __name__ == "__main__":
    main()
