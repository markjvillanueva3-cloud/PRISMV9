#!/usr/bin/env python3
"""
PRISM Materials Deep Accuracy Pass v2 — Scientific Validation & Correction
Runs AFTER v1 (which already applied subcategory-specific data).
This pass cross-validates against web-verified physical properties and
corrects values that fail physics checks.
"""

import json
import os
import re
import math
import logging
import sys
from pathlib import Path
from datetime import datetime

# Import the verified properties database (85+ alloys, web-sourced)
sys.path.insert(0, str(Path(__file__).parent))
from alloy_physical_properties_db import ALLOY_PHYSICAL_PROPERTIES
from alloy_compositions_db import (ALLOY_COMPOSITIONS,
    calc_thermal_conductivity_steel, calc_density_steel)

# ── Configuration ──────────────────────────────────────────────────────────────

MATERIALS_ROOT = Path(r"C:\PRISM\data\materials")
MASTER_INDEX = MATERIALS_ROOT / "MATERIALS_MASTER.json"
LOG_DIR = Path(r"C:\PRISM\state\logs")
LOG_FILE = LOG_DIR / "deep_accuracy_v2_log.json"

CATEGORY_DIRS = [
    "P_STEELS", "M_STAINLESS", "K_CAST_IRON",
    "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"
]
SKIP_FILES = {"index.json", "MATERIALS_MASTER.json"}

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("deep_accuracy_v2")


# ══════════════════════════════════════════════════════════════════════════════
# ALLOY NAME -> VERIFIED DB KEY MAPPING
# ══════════════════════════════════════════════════════════════════════════════

def _build_lookup_index():
    """Build reverse lookup from alloy designation patterns to verified DB keys."""
    index = {}
    for key in ALLOY_PHYSICAL_PROPERTIES:
        # Always add the exact key and uppercase version
        index[key] = key
        index[key.upper()] = key

        if key.startswith("AISI "):
            num = key[5:]
            index[num] = key
            index[f"SAE {num}"] = key
        elif key.startswith("SS "):
            num = key[3:]
            index[num] = key
            index[f"AISI {num}"] = key
            if num.endswith("L"):
                index[num[:-1] + "L"] = key
        elif key.startswith("Al "):
            num = key[3:]
            index[num] = key
            index[f"AA {num}"] = key
            index[f"AA{num}"] = key
        elif key.startswith("Ti"):
            if "6Al-4V" in key:
                for v in ["TI6AL4V", "TI-6AL-4V", "TI 6AL-4V", "TI-6-4",
                          "TI64", "TI 6-4", "TI6AL 4V"]:
                    index[v] = key
            elif "CP Grade" in key:
                import re as _re
                gm = _re.search(r"Grade (\d)", key)
                if gm:
                    g = gm.group(1)
                    for v in [f"TICP{g}", f"CP TI GRADE {g}", f"CP TITANIUM GRADE {g}",
                              f"TI GRADE {g}", f"GRADE {g} TI", f"CPTI GR{g}"]:
                        index[v] = key
            elif "6Al-2Sn" in key:
                for v in ["TI6AL2SN4ZR2MO", "TI6246", "TI-6-2-4-2",
                          "TI 6AL-2SN-4ZR-2MO", "TI-6242"]:
                    index[v] = key
            elif "3Al-2.5V" in key:
                for v in ["TI3AL25V", "TI-3-2.5", "TI325"]:
                    index[v] = key
            elif "5Al-2.5Sn" in key:
                for v in ["TI5AL25SN", "TI-5-2.5"]:
                    index[v] = key
            elif "6Al-6V" in key:
                for v in ["TI6AL6V2SN", "TI-6-6-2", "TI662"]:
                    index[v] = key
            elif "10V-2Fe" in key:
                for v in ["TI10V2FE3AL", "TI-10-2-3", "TI1023"]:
                    index[v] = key
            elif "15V" in key:
                for v in ["TI15V3CR3AL3SN", "TI-15-3-3-3", "TI15333", "BETA-C"]:
                    index[v] = key
        elif key.startswith("Inconel"):
            num = key.replace("Inconel", "").strip()
            for v in [f"IN{num}", f"INCONEL {num}", f"INCONEL{num}",
                      f"ALLOY {num}", f"IN {num}", f"INC {num}"]:
                index[v] = key
        elif key.startswith("Incoloy"):
            num = key.replace("Incoloy", "").strip()
            for v in [f"INCOLOY {num}", f"INCOLOY{num}", f"INCOLOY {num}H",
                      f"INCOLOY {num}HT"]:
                index[v] = key
        elif key.startswith("Waspaloy"):
            index["WASPALOY"] = key
        elif key.startswith("Hastelloy"):
            suffix = key.replace("Hastelloy ", "").replace("Hastelloy", "")
            for v in [f"HASTELLOY {suffix}", f"HASTELLOY{suffix}",
                      f"HASTELLOY_{suffix}", f"HAS {suffix}"]:
                index[v] = key
        elif key.startswith("Haynes"):
            num = key.replace("Haynes ", "").replace("Haynes", "")
            for v in [f"HAYNES {num}", f"HAYNES{num}", f"HA{num}",
                      f"HAYNES {num} (L-605)" if num == "25" else f"HAYNES{num}"]:
                index[v] = key
            if num == "25":
                index["L-605"] = key
                index["L605"] = key
        elif key.startswith("Nimonic"):
            num = key.replace("Nimonic", "").strip()
            for v in [f"NIMONIC {num}", f"NIMONIC{num}"]:
                index[v] = key
        elif key.startswith("Rene"):
            num = key.replace("Rene", "").strip()
            for v in [f"RENE {num}", f"RENE{num}", f"RENÉ {num}"]:
                index[v] = key
        elif key.startswith("Monel"):
            suffix = key.replace("Monel", "").strip()
            for v in [f"MONEL {suffix}", f"MONEL{suffix}"]:
                index[v] = key
        elif key.startswith("Tool "):
            code = key[5:]
            index[code] = key
            index[code.upper()] = key
            # "Tool H13" -> "H13", "AISI H13", "H 13"
            index[f"AISI {code}"] = key
            index[f"AISI {code.upper()}"] = key
            parts_m = re.match(r"([A-Z])(\d+)", code)
            if parts_m:
                index[f"{parts_m.group(1)} {parts_m.group(2)}"] = key
        elif key.startswith("Gray Iron"):
            # "Gray Iron Class 30" -> match "GG25", "GG30", etc.
            import re as _re
            cm = _re.search(r"Class (\d+)", key)
            if cm:
                cls = cm.group(1)
                index[f"GRAY IRON CLASS {cls}"] = key
                index[f"CLASS {cls} GRAY IRON"] = key
                index[f"CLASS {cls} GRAY"] = key
                # Map GG designations to closest class
                # GG15~Class20, GG20~Class20, GG25~Class25/30, GG30~Class30, GG35~Class35, GG40~Class40
        elif key.startswith("Ductile"):
            # "Ductile 65-45-12" -> match "DUCTILE 65-45-12"
            index[key.upper()] = key
            # Also match without "Ductile " prefix
            suffix = key[8:]  # e.g. "65-45-12"
            index[suffix] = key
        elif "ADI" in key:
            index[key.upper()] = key
            # "ADI Grade 1" -> "ADI 900/6", etc.
            import re as _re
            am = _re.search(r"ADI (\d+)", key)
            if am:
                index[f"ADI {am.group(1)}"] = key
                index[f"ADI GRADE {am.group(1)}"] = key
        elif key.startswith("Malleable"):
            index[key.upper()] = key
            index["MALLEABLE IRON"] = key
        elif key.startswith("CGI") or "Compacted" in key:
            index[key.upper()] = key
            import re as _re
            cm = _re.search(r"(\d+)", key)
            if cm:
                index[f"CGI {cm.group(1)}"] = key
                index[f"CGI GRADE {cm.group(1)}"] = key
                index[f"COMPACTED GRAPHITE {cm.group(1)}"] = key
        elif key.startswith("Cu "):
            num = key[3:]
            index[num] = key
            index[f"UNS {num}"] = key
            index[f"CDA {num}"] = key
        elif key.startswith("Mg "):
            # "Mg AZ31B" -> "AZ31B", "MG AZ31B"
            num = key[3:]
            index[num] = key
            index[num.upper()] = key
        elif key == "300M":
            index["300M"] = key
        elif key.startswith("17-") or key.startswith("15-") or key.startswith("13-"):
            index[key.replace("-", "")] = key
            # "17-4PH" -> "174PH", "17-4 PH", etc.
            index[key.replace("PH", " PH")] = key
            if "Mo" in key:  # 13-8Mo
                index["13-8MO"] = key
                index["138MO"] = key
                index["13-8 MO"] = key
                index["13-8 PH"] = key
                index["138PH"] = key
        elif key.startswith("Maraging"):
            import re as _re
            mm = _re.search(r"(\d+)", key)
            if mm:
                num = mm.group(1)
                index[f"MARAGING {num}"] = key
                index[f"MARAGING{num}"] = key
                index[f"MAR {num}"] = key
        elif key.startswith("A286"):
            index["A286"] = key
            index["A-286"] = key
            index["ALLOY A286"] = key
            index["ALLOY A-286"] = key
        elif key == "Ni 200" or key == "Ni 201":
            num = key[3:]
            index[f"NI {num}"] = key
            index[f"NICKEL {num}"] = key
        elif key.startswith("Alloy"):
            index[key.upper()] = key
        elif key.startswith("Invar"):
            index["INVAR 36"] = key
            index["INVAR36"] = key
        elif key == "Kovar":
            index["KOVAR"] = key
        elif key.startswith("AZ") or key.startswith("ZK"):
            # Magnesium alloys
            index[key] = key
            index[key.upper()] = key
        elif key.startswith("Zamak") or key.startswith("Zinc"):
            index[key.upper()] = key

    # ASTM structural steels
    for k in list(ALLOY_PHYSICAL_PROPERTIES.keys()):
        ku = k.upper()
        if k.startswith("A") and k[1:].replace("-", "").replace(" ", "")[0:1].isdigit():
            # A36, A514, A572-50, A588, A709-50
            index[ku] = k
            index[f"ASTM {ku}"] = k
            index[ku.replace("-", " ")] = k
            index[ku.replace("-", "")] = k
        elif k.startswith("API-"):
            # API-5L-X42 etc
            index[ku] = k
            index[ku.replace("-", " ")] = k
            index[ku.replace("API-5L-", "X")] = k  # just "X65"
            index[ku.replace("API-5L-", "API 5L ")] = k
            index[ku.replace("API-5L-", "")] = k  # just grade
        elif k.startswith("CPM"):
            index[ku] = k
            index[ku.replace("-", " ")] = k
            index[ku.replace("-", "")] = k
            index[ku.replace("CPM-", "CPM ")] = k
        elif k.startswith("ASP"):
            index[ku] = k
            index[ku.replace("-", " ")] = k
            index[ku.replace("-", "")] = k
        elif k in ("AERMET 100", "AF1410", "CUSTOM 465", "CUSTOM 450",
                    "NITRALLOY N", "4330V", "STELLITE 6"):
            index[ku] = k
            index[ku.replace(" ", "")] = k
            index[ku.replace(" ", "-")] = k
        elif k.startswith("NI-HARD"):
            index[ku] = k
            index[ku.replace("-", " ")] = k
            m = re.search(r"(\d+)", k)
            if m:
                index[f"NI-HARD {m.group(1)}"] = k
                index[f"NI-HARD TYPE {m.group(1)}"] = k
                index[f"NIHARD {m.group(1)}"] = k
                index[f"NI HARD {m.group(1)}"] = k
        elif k.startswith("AL-6XN") or k.startswith("ALLOY 20"):
            index[ku] = k
            index[ku.replace("-", "")] = k
            index[ku.replace(" ", "")] = k
        elif k.startswith("NITRONIC"):
            index[ku] = k
            m = re.search(r"(\d+)", k)
            if m:
                index[f"NITRONIC {m.group(1)}"] = k
                index[f"NITRONIC{m.group(1)}"] = k
        elif "SMO" in k:
            index[ku] = k
            index[ku.replace(" ", "")] = k
        elif k.startswith("17-7"):
            index["17-7PH"] = k
            index["177PH"] = k
            index["17-7 PH"] = k
        elif k == "926" or k == "654 SMO":
            index[ku] = k
            index[ku.replace(" ", "")] = k

    # Zamak / ZA zinc alloys
    for k in list(ALLOY_PHYSICAL_PROPERTIES.keys()):
        ku = k.upper()
        if k.startswith("Zamak") or k.startswith("ZA-"):
            index[ku] = k
            index[ku.replace("-", "")] = k
            index[ku.replace(" ", "")] = k
        elif k.startswith("Zr ") or k.startswith("Zircaloy"):
            index[ku] = k
            index[ku.replace(" ", "")] = k
            if "702" in k: index["ZIRCONIUM 702"] = k
            if "705" in k: index["ZIRCONIUM 705"] = k
            if "Zircaloy" in k:
                index[ku.replace("-", " ")] = k
        elif k.startswith("AZ") or k.startswith("AM") or k.startswith("EZ") or k.startswith("QE"):
            index[ku] = k
            index[ku.replace(" ", "")] = k
        elif k.startswith("Elektron"):
            index[ku] = k
            index["ELEKTRON21"] = k
            index["ELEKTRON 21"] = k
            index["E21"] = k

    # Add GG -> Gray Iron Class mapping (German DIN designation)
    gg_map = {"GG15": "Gray Iron Class 20", "GG20": "Gray Iron Class 20",
              "GG25": "Gray Iron Class 30", "GG26": "Gray Iron Class 30",
              "GG30": "Gray Iron Class 35", "GG35": "Gray Iron Class 40",
              "GG40": "Gray Iron Class 45", "GG45": "Gray Iron Class 50",
              "GG50": "Gray Iron Class 50", "GG60": "Gray Iron Class 60"}
    for gg, cls in gg_map.items():
        if cls in ALLOY_PHYSICAL_PROPERTIES:
            index[gg] = cls
            index[f"{gg} GRAY CAST IRON"] = cls

    # EN-GJL (European ductile/gray iron designations)
    en_gjl_map = {"EN-GJL-150": "Gray Iron Class 20", "EN-GJL-200": "Gray Iron Class 20",
                  "EN-GJL-250": "Gray Iron Class 30", "EN-GJL-300": "Gray Iron Class 40",
                  "EN-GJL-350": "Gray Iron Class 50"}
    for en, cls in en_gjl_map.items():
        if cls in ALLOY_PHYSICAL_PROPERTIES:
            index[en] = cls

    return index

VERIFIED_LOOKUP = _build_lookup_index()


def find_verified_props(mat: dict) -> dict:
    """Try to match a material to the verified properties database.
    Uses multi-strategy progressive matching."""
    name = mat.get("name", "").upper().strip()
    if not name:
        return None

    def _lookup(k):
        v = VERIFIED_LOOKUP.get(k)
        return ALLOY_PHYSICAL_PROPERTIES[v] if v else None

    # Strategy 0: Full name direct match (before stripping)
    if name in VERIFIED_LOOKUP:
        return ALLOY_PHYSICAL_PROPERTIES[VERIFIED_LOOKUP[name]]

    # Strip standard prefixes
    stripped = name
    for pfx in ["AISI ", "SAE ", "UNS ", "EN ", "DIN ", "AA ", "AMS ", "ASTM "]:
        if stripped.startswith(pfx):
            stripped = stripped[len(pfx):]
            break

    # Strategy 1: Strip condition suffixes to get base alloy
    base = re.sub(r"\s+(ANNEALED|NORMALIZED|Q&T|COLD|HOT|ROLLED|DRAWN|TEMPERED|AGED|"
                  r"STA|SOLUTION|TREATED|WORKED|HARD|QUENCHED|MILL|CAST|"
                  r"AS[- ]SUPPLIED|AS[- ]CAST|EBM|SLM|DMLS|ELI|"
                  r"\d+\s*HR?C|CONDITION\s*\w+|H\d+|T\d+|O\s*TEMPER|"
                  r"STANDARD|LOW\s*C|HIGH\s*C|[- ]\d+/\d+|"
                  r"CARBURIZED|NITRIDED|COATED|WROUGHT|FORGED|EXTRUDED|"
                  r"SHEET|PLATE|BAR|ROD|WIRE|TUBE|PIPE|BILLET|SLAB|"
                  r"1/[24]\s*HARD|FULL\s*HARD|HALF\s*HARD|"
                  r"PREMIUM|STANDARD|SURGICAL|IMPLANT|MARINE|ARMOR|"
                  r"AUTOMOTIVE|STRUCTURAL|GENERAL|HIGH\s*PURITY|"
                  r"ELECTRICAL|WELDABLE|MILITARY|ULTRA).*$",
                  "", stripped, flags=re.IGNORECASE).strip()
    base = re.sub(r"[- ](T\d+[A-Z]*|O|H\d+|F)\b.*$", "", base).strip()

    # Try direct lookup on base
    r = _lookup(base)
    if r: return r

    # Strategy 2: Numeric-only match (e.g. "1045" from "AISI 1045 Normalized")
    num_m = re.match(r"(\d{3,5}[A-Z]?)", base)
    if num_m:
        r = _lookup(num_m.group(1))
        if r: return r

    # Strategy 3: Named alloy families (superalloys, etc.)
    sa_patterns = [
        (r"INCONEL\s*(\d+)", "INCONEL {}"),
        (r"INCOLOY\s*(\d+)\w*", "INCOLOY {}"),
        (r"HASTELLOY\s*([A-Z])[- ]?(\d+)?", None),  # special handler
        (r"WASPALOY", "WASPALOY"),
        (r"HAYNES\s*(\d+)", "HAYNES {}"),
        (r"NIMONIC\s*(\d+\w*)", "NIMONIC {}"),
        (r"REN[EÉ]\s*(\d+)", "RENE {}"),
        (r"MONEL\s*([A-Z]?\d+)", "MONEL {}"),
    ]
    for pat, fmt in sa_patterns:
        m = re.search(pat, name)
        if m:
            if fmt is None:  # Hastelloy special case
                suffix = m.group(1)
                if m.lastindex >= 2 and m.group(2):
                    suffix = f"{m.group(1)}-{m.group(2)}"
                for try_key in [f"HASTELLOY {suffix}", f"HASTELLOY_{suffix}",
                                f"HASTELLOY {m.group(1)}"]:
                    r = _lookup(try_key)
                    if r: return r
                # Fallback: B-series→B-2, C-series→C-276, G-series→C-276
                fb_map = {"B": "HASTELLOY B-2", "C": "HASTELLOY C-276",
                          "G": "HASTELLOY C-276", "N": "HASTELLOY X", "S": "HASTELLOY X"}
                fb = fb_map.get(m.group(1))
                if fb:
                    r = _lookup(fb)
                    if r: return r
            elif "{}" in fmt:
                r = _lookup(fmt.format(m.group(1)))
                if r: return r
                # Nearest superalloy fallback within same family
                try:
                    num = int(m.group(1))
                    family = fmt.split(" ")[0]
                    best_k = None
                    best_d = 999
                    for lk in VERIFIED_LOOKUP:
                        if lk.startswith(family):
                            lk_num = re.search(r"(\d+)", lk)
                            if lk_num:
                                d = abs(int(lk_num.group(1)) - num)
                                if d < best_d:
                                    best_d = d
                                    best_k = lk
                    if best_k and best_d <= 100:
                        r = _lookup(best_k)
                        if r: return r
                except (ValueError, IndexError):
                    pass
            else:
                r = _lookup(fmt)
                if r: return r

    # Strategy 4: Titanium alloys
    if "TI" in name.replace("-", "").replace(" ", ""):
        compact = name.replace("-", "").replace(" ", "")
        if "6AL4V" in compact or "6AL 4V" in name or "6-4" in name:
            r = _lookup("TI6AL4V")
            if r: return r
        elif "6AL2SN" in compact or "6242" in name:
            r = _lookup("TI6AL2SN4ZR2MO")
            if r: return r
        elif "3AL2" in compact or "3-2.5" in name:
            r = _lookup("TI3AL25V")
            if r: return r
        elif "5AL2" in compact:
            r = _lookup("TI5AL25SN")
            if r: return r
        elif "6AL6V" in compact or "6-6-2" in name:
            r = _lookup("TI6AL6V2SN")
            if r: return r
        elif "10V" in name:
            r = _lookup("TI10V2FE3AL")
            if r: return r
        elif "15V" in name or "BETA" in name:
            r = _lookup("TI15V3CR3AL3SN")
            if r: return r
        gm = re.search(r"(?:CP|GRADE)\s*(\d)", name)
        if gm:
            r = _lookup(f"TICP{gm.group(1)}")
            if r: return r

    # Strategy 5: Tool steels (A2, D2, H13, etc.)
    tool_m = re.match(r"([ADHMOSWPLT]\d+)", base)
    if tool_m:
        r = _lookup(tool_m.group(1))
        if r: return r
    # Also try after "TOOL STEEL" prefix
    ts_m = re.search(r"\b([ADHMOSWPLT]\d+)\b", name)
    if ts_m:
        r = _lookup(ts_m.group(1))
        if r: return r
        # Nearest tool steel in same series (e.g., S53→S1, M10→M7)
        letter = ts_m.group(1)[0]
        try:
            num = int(ts_m.group(1)[1:])
        except ValueError:
            num = None
        if num is not None:
            best_key = None
            best_dist = 999
            for lk in VERIFIED_LOOKUP:
                if lk[0:1] == letter and lk[1:].isdigit():
                    dist = abs(int(lk[1:]) - num)
                    if dist < best_dist:
                        best_dist = dist
                        best_key = lk
            if best_key and best_dist <= 20:
                r = _lookup(best_key)
                if r: return r

    # Strategy 6: PH stainless (17-4PH, 15-5PH, 13-8Mo)
    ph_m = re.search(r"(\d+)[- ]?(\d+)\s*(?:PH|MO)", name)
    if ph_m:
        for fmt in [f"{ph_m.group(1)}-{ph_m.group(2)}PH",
                    f"{ph_m.group(1)}-{ph_m.group(2)}MO",
                    f"{ph_m.group(1)}{ph_m.group(2)}PH",
                    f"13-8MO", f"13-8 PH"]:
            r = _lookup(fmt)
            if r: return r
    if "13-8" in name or "138" in name.replace(" ", "").replace("-", ""):
        r = _lookup("13-8MO")
        if r: return r

    # Strategy 7: Duplex stainless
    for d in ["2507", "2205", "2304"]:
        if d in name:
            r = _lookup(d)
            if r: return r

    # Strategy 8: Cast iron (GG, EN-GJL, Ductile, ADI, CGI)
    if "GG" in name or "GRAY" in name or "GREY" in name or "GJL" in name:
        gg_m = re.search(r"GG(\d+)", name)
        if gg_m:
            r = _lookup(f"GG{gg_m.group(1)}")
            if r: return r
        gjl_m = re.search(r"GJL[- ]?(\d+)", name)
        if gjl_m:
            r = _lookup(f"EN-GJL-{gjl_m.group(1)}")
            if r: return r
        cls_m = re.search(r"CLASS\s*(\d+)", name)
        if cls_m:
            r = _lookup(f"GRAY IRON CLASS {cls_m.group(1)}")
            if r: return r

    if "DUCTILE" in name or "GJS" in name:
        duct_m = re.search(r"(\d+)[- ](\d+)[- ](\d+)", name)
        if duct_m:
            key = f"DUCTILE {duct_m.group(1)}-{duct_m.group(2)}-{duct_m.group(3)}"
            r = _lookup(key)
            if r: return r
            r = _lookup(f"{duct_m.group(1)}-{duct_m.group(2)}-{duct_m.group(3)}")
            if r: return r

    if "ADI" in name or "AUSTEMPER" in name:
        adi_m = re.search(r"(?:ADI|GRADE)\s*(\d+)", name)
        if adi_m:
            grade = int(adi_m.group(1))
            r = _lookup(f"ADI {grade}")
            if r: return r
            r = _lookup(f"ADI GRADE {grade}")
            if r: return r
            # ADI nearest grade fallback (Grades 1-5, or numeric 900-1400)
            if grade <= 5:
                for offset in [1, -1, 2, -2]:
                    r = _lookup(f"ADI {grade + offset}")
                    if r: return r
            else:
                # Numeric ADI (900, 1050, 1200, 1400) → nearest
                best_k, best_d = None, 9999
                for lk in VERIFIED_LOOKUP:
                    if "ADI" in lk:
                        lk_num = re.search(r"(\d{3,4})", lk)
                        if lk_num and int(lk_num.group(1)) >= 100:
                            d = abs(int(lk_num.group(1)) - grade)
                            if d < best_d:
                                best_d, best_k = d, lk
                if best_k and best_d <= 500:
                    r = _lookup(best_k)
                    if r: return r

    if "CGI" in name or "COMPACTED" in name or "VERMICULAR" in name or "GJV" in name:
        cgi_m = re.search(r"(\d{3})", name)
        if cgi_m:
            r = _lookup(f"CGI {cgi_m.group(1)}")
            if r: return r

    if "NI-HARD" in name or "NIHARD" in name or "WHITE IRON" in name:
        for wk in ["NI-HARD 1", "NI-HARD 4"]:
            r = _lookup(wk)
            if r: return r

    if "HIGH" in name and ("CHROME" in name or "CR" in name) and ("GRAY" in name or "IRON" in name):
        r = _lookup("NI-HARD 4")  # High-chrome wear iron ≈ Ni-Hard 4
        if r: return r

    if "HIGH" in name and "PHOSPHOR" in name and ("GRAY" in name or "IRON" in name):
        r = _lookup("GRAY IRON CLASS 25")  # High-P gray iron ≈ Class 25
        if r: return r

    if "MALLEABLE" in name:
        r = _lookup("MALLEABLE IRON")
        if r: return r

    # Strategy 9: Stainless steel numbers (with/without "SS"/"L" suffixes)
    ss_m = re.search(r"\b(3\d{2}|4[0-4]\d)[A-Z]?\b", base)
    if ss_m:
        code = ss_m.group(0)
        r = _lookup(code)
        if r: return r
        # Try without trailing letter (except L)
        r = _lookup(code.rstrip("ABCDEFGHIJKMNOPQRSTUVWXYZ"))
        if r: return r

    # Strategy 10: A286
    if "A286" in name or "A-286" in name:
        r = _lookup("A286")
        if r: return r

    # Strategy 11: Maraging steels
    mar_m = re.search(r"MARAGING\s*(\d+)", name)
    if mar_m:
        r = _lookup(f"MARAGING {mar_m.group(1)}")
        if r: return r

    # Strategy 12: Copper alloys — common name to UNS mapping
    cu_common = {
        "PHOSPHOR BRONZE": "C51000", "SILICON BRONZE": "C65500",
        "MUNTZ": "C28000", "CARTRIDGE BRASS": "C26000",
        "NAVAL BRASS": "C46400", "ADMIRALTY BRASS": "C44300",
        "FREE.CUTTING BRASS": "C36000", "FREE CUTTING BRASS": "C36000",
        "ALUMINUM BRONZE": "C63000", "ALUMINIUM BRONZE": "C63000",
        "BERYLLIUM COPPER": "C17200", "BECU": "C17200", "BERYLCO": "C17200",
        "CUPRONICKEL": "C71500", "TIN BRONZE": "C90300",
        "BEARING BRONZE": "C93200", "TELLURIUM": "C14500",
        "MANGANESE BRONZE": "C67500", "LEADED BRASS": "C35300",
        "RED BRASS": "C23000", "YELLOW BRASS": "C27000",
        "COMMERCIAL BRONZE": "C22000",
        "NICKEL SILVER": "C75200", "NI-SILV": "C75200",
        "DHP": "C11000",  # Deoxidized high-phosphorus copper ≈ pure Cu
    }
    for cname, uns in cu_common.items():
        if cname in name:
            r = _lookup(uns)
            if r: return r

    # Strategy 12b: Copper abbreviated code (C172→C17200, C260→C26000, etc.)
    cu_short = re.search(r"\bC(\d{3})\b", name)
    if cu_short:
        short = cu_short.group(1)
        # Pad to 5 digits with trailing zeros
        padded = short + "00"
        r = _lookup(f"C{padded}")
        if r: return r

    # Strategy 12c: Copper UNS code (C followed by 4-5 digits)
    cu_m = re.search(r"\bC(\d{4,5})\b", name)
    if cu_m:
        cu_num = cu_m.group(1)
        r = _lookup(f"C{cu_num}")
        if r: return r
        # Nearest copper alloy fallback — match within same series (same first 2 digits)
        n = int(cu_num)
        best_key = None
        best_dist = 99999
        for lk in VERIFIED_LOOKUP:
            if lk.startswith("C") and lk[1:].isdigit() and len(lk) >= 5:
                try:
                    lk_n = int(lk[1:])
                    # Same series = same first 2 digits (e.g., C1xxxx, C2xxxx)
                    if str(lk_n)[:2] == str(n)[:2]:
                        dist = abs(lk_n - n)
                        if dist < best_dist:
                            best_dist = dist
                            best_key = lk
                except ValueError:
                    pass
        if best_key and best_dist <= 10000:
            r = _lookup(best_key)
            if r: return r

    # Strategy 13: Magnesium alloys (AZ, AM, ZK, EZ, QE, WE, Elektron)
    mg_m = re.search(r"\b(AZ\d+[A-Z]?|ZK\d+[A-Z]?|AM\d+[A-Z]?|EZ\d+[A-Z]?|QE\d+[A-Z]?|WE\d+[A-Z]?)\b", name)
    if mg_m:
        r = _lookup(mg_m.group(1))
        if r: return r
    if "ELEKTRON" in name:
        r = _lookup("ELEKTRON 21") or _lookup("WE43")
        if r: return r
    if "PURE MAGNESIUM" in name:
        r = _lookup("AZ31B")  # Fallback to most common Mg
        if r: return r
    # Magnesium nearest-series fallback (AZ61→AZ91 if AZ61 not in DB)
    if mg_m:
        code = mg_m.group(1)
        prefix = re.match(r"([A-Z]{2})", code)
        if prefix:
            pfx = prefix.group(1)
            best_k, best_d = None, 999
            for lk in VERIFIED_LOOKUP:
                if lk.startswith(pfx):
                    lk_num = re.search(r"(\d+)", lk)
                    code_num = re.search(r"(\d+)", code)
                    if lk_num and code_num:
                        d = abs(int(lk_num.group(1)) - int(code_num.group(1)))
                        if d < best_d:
                            best_d, best_k = d, lk
            if best_k and best_d <= 50:
                r = _lookup(best_k)
                if r: return r

    # Strategy 13b: Zinc alloys (Zamak, ZA-series)
    zamak_m = re.search(r"ZAMAK\s*(\d+)", name)
    if zamak_m:
        r = _lookup(f"ZAMAK {zamak_m.group(1)}")
        if r: return r
    za_m = re.search(r"ZA[- ]?(\d+)", name)
    if za_m:
        r = _lookup(f"ZA-{za_m.group(1)}")
        if r: return r
    if "ILZRO" in name:
        r = _lookup("ZAMAK 3")  # ILZRO zinc alloy fallback
        if r: return r
    if "PURE ZINC" in name or "ZINC 99" in name:
        r = _lookup("ZAMAK 3")  # Pure zinc → Zamak 3 as baseline
        if r: return r
    if "PURE LEAD" in name or "LEAD 99" in name:
        r = _lookup("ZAMAK 3")  # Lead → Zamak 3 as soft metal baseline
        if r: return r

    # Strategy 13c: Zirconium alloys
    zr_m = re.search(r"ZIRCONIUM\s*(\d+)", name)
    if zr_m:
        r = _lookup(f"ZR {zr_m.group(1)}")
        if r: return r
    if "ZIRCALOY" in name:
        zrc_m = re.search(r"(\d)", name)
        if zrc_m:
            r = _lookup(f"ZIRCALOY-{zrc_m.group(1)}")
            if r: return r

    # Strategy 14: Nickel 200/201
    ni_m = re.search(r"NICKEL\s*(\d+)|NI\s*(\d+)", name)
    if ni_m:
        num = ni_m.group(1) or ni_m.group(2)
        r = _lookup(f"NI {num}")
        if r: return r

    # Strategy 15: 420SS-style names
    ss2_m = re.search(r"(\d{3})\s*SS", name)
    if ss2_m:
        r = _lookup(ss2_m.group(1))
        if r: return r

    # Strategy 15b: Al-Li designation (e.g., "Al-Li 2090-T83", "2090 Al-Li")
    alli_m = re.search(r"(?:AL[- ]?LI\s*)?(\d{4})", name)
    if alli_m and "AL" in name and "LI" in name:
        code = alli_m.group(1)
        r = _lookup(code)
        if r: return r

    # Strategy 16: Nearest alloy in same series (fallback for unmatched numerics)
    # E.g., "7085" -> nearest to 7075, "1055" -> nearest to 1050 or 1060
    num_m2 = re.search(r"\b(\d{4,5})\b", base)
    if num_m2:
        num = int(num_m2.group(1))
        best_key = None
        best_dist = 999
        for lk in VERIFIED_LOOKUP:
            if lk.isdigit() and len(lk) == len(num_m2.group(1)):
                dist = abs(int(lk) - num)
                # Only match within same series (same first 1-2 digits)
                if str(int(lk))[:2] == str(num)[:2] and dist < best_dist and dist <= 30:
                    best_dist = dist
                    best_key = lk
        if best_key:
            return ALLOY_PHYSICAL_PROPERTIES[VERIFIED_LOOKUP[best_key]]

    # Strategy 17: European steel designation cross-reference
    eu_patterns = {
        "22MNB5":    "1025",   # Boron steel ≈ 1025 (C=0.22, Mn=1.2)
        "27MNB5":    "1030",   # Boron steel ≈ 1030
        "16MNCR5":   "5120",   # Case hardening ≈ 5120
        "18CRNIMO":  "4320",   # NiCrMo ≈ 4320
        "20MNCR5":   "5120",   # Case hardening ≈ 5120
        "34CRNIMO6": "4340",   # High-strength ≈ 4340
        "36CRNIMO4": "4340",   # ≈ 4340
        "30CRNIMO8": "4340",   # ≈ 4340
        "42CRMO4":   "4140",   # Chromoly = 4140
        "40CRMO4":   "4140",   # ≈ 4140
        "25CRMO4":   "4130",   # Chromoly = 4130
        "51CRV4":    "6150",   # Spring = 6150
        "50CRV4":    "6150",   # ≈ 6150
        "100CR6":    "52100",  # Bearing = 52100
        "C45":       "1045",   # Plain carbon
        "CK45":      "1045",
        "C60":       "1060",
        "C40":       "1040",
        "S355":      "1030",   # Structural ≈ 1030
        "S275":      "1020",   # Structural ≈ 1020
        "S690":      "4340",   # High-strength structural ≈ 4340
        "17MNNI":    "1522",   # Cryogenic ≈ 15xx
        "4330V":     "4340",   # Hy-Tuf ≈ 4340
        "154CM":     "440C",   # Stainless blade ≈ 440C
        "AR400":     "4140",   # Abrasion resistant ≈ 4140
        "AR450":     "4140",
        "AR500":     "4150",   # Higher hardness
        "AR600":     "4150",
        "ARMOX":     "4340",   # Armor plate ≈ 4340
        "BISALLOY":  "4340",   # Australian armor ≈ 4340
        "HARDOX":    "4140",   # Wear plate ≈ 4140
        "12%CR":     "410",    # 12% Cr valve steel ≈ 410
        "12CR":      "410",
        "DOMEX":     "1020",   # Structural ≈ 1020
        "DOCOL":     "1045",   # Auto DP steel ≈ 1045
        "STRENX":    "4130",   # High-strength ≈ 4130
        "201LN":     "201",    # Stainless variant
        "254SMO":    "254 SMO",  # Super-austenitic (use own entry if exists, else 316)
        "303SE":     "303",    # Selenium free-machining ≈ 303
        "316TI":     "316",    # Ti-stabilized ≈ 316
        "330":       "310",    # High-Ni heat resistant ≈ 310
        # ASTM structural → own entry or nearest carbon steel
        "A36":       "A36",
        "A514":      "A514",
        "A572":      "A572-50",
        "A588":      "A588",
        "A709":      "A709-50",
        # API pipeline → own entry or nearest HSLA
        "API5L":     "API-5L-X65",
        # CPM powder steels → own entry
        "CPM10V":    "CPM-10V",
        "CPM3V":     "CPM-3V",
        "CPMS30V":   "CPM-S30V",
        "CPMS90V":   "CPM-S90V",
        "ASP2060":   "ASP-2060",
        # Specialty steels → own entry
        "AERMET100": "AERMET 100",
        "AERMET":    "AERMET 100",
        "AF1410":    "AF1410",
        "CUSTOM465": "CUSTOM 465",
        "CUSTOM450": "CUSTOM 450",
        "NITRALLOY": "NITRALLOY N",
        "4330V":     "4330V",
        "STELLITE":  "STELLITE 6",
        # More SS variants
        "AL6XN":     "AL-6XN",
        "ALLOY20":   "ALLOY 20",
        "20CB3":     "ALLOY 20",
        "20CB":      "ALLOY 20",
        # Boron steels → nearest plain carbon
        "15B35":     "1035",
        "15B41":     "1040",
        "15B48":     "1050",
        # Re-sulfurized free-machining
        "B1113":     "B1112",
        # Electric furnace premium
        "E4340":     "4340",
        "E4330":     "4340",
        "E52100":    "52100",
        # Pressure vessel steels
        "SA516":     "1020",
        "SA515":     "1020",
        "SA387":     "4130",
        # Valve/piping steels
        "F22":       "4130",     # 2.25Cr-1Mo
        "F6NM":      "410",      # 13-4 martensitic SS
        "F91":       "410",      # 9Cr-1Mo-V
        # PM/knife steels
        "CPMS35VN":  "CPM-S30V",
        "CPM20CV":   "CPM-S30V",
        "CPMS45VN":  "CPM-S30V",
        "VG10":      "440C",
        "VG1":       "440C",
        "AUS8":      "440B",
        "ZDP189":    "440C",
        # Specialty steels
        "HMX":       "4340",
        "HY80":      "4130",
        "HY100":     "4140",
        "HY130":     "4340",
        "FERRIUMS53":"4340",
        "CT15C":     "316",      # Carpenter corrosion resistant
        "MLX17":     "17-4PH",
        "REX734":    "316",      # Surgical stainless
        # AHSS / automotive
        "COMPLEXPHASE": "1045",
        "PRESSHARDENED": "1025",
        "TRIPLEX":   "1045",
        "CARBIDEFREE": "4140",
        "BAINITIC":  "4140",
        "TWINNING":  "1045",     # TWIP steel
        # HSLA
        "A656":      "4130",
        # High-Mn
        "1541":      "1045",
        "1548":      "1050",
        # Electrical wire aluminum
        "6201":      "6061",
        # DIN designations
        "1.7131":    "5120",
        "1.7225":    "4140",
        "1.2379":    "D2",
        "1.2080":    "D3",
        "1.4562":    "316",      # Alloy 31
        # Military armor steels
        "MILDTL12560": "4340",
        "MILDTL46100": "4340",
        "MILA46099":   "4340",
        "RAMOR":     "4340",
        # PM tool steels (Uddeholm/Bohler)
        "VANADIS":   "D2",
        "ELMAX":     "440C",
        "BOHLERK340":"D2",
        "K340":      "D2",
        "CALDIE":    "D2",
        "SVERKER":   "D2",
        # Super duplex stainless
        "ZERON100":  "2507",
        "S32760":    "2507",
        "SAF2906":   "2507",
        "FERRALIUM": "2507",
        "S32550":    "2507",
        # Specialty austenitic stainless
        "ALLOY31":   "316",
        "ALLOYB66":  "316",
        "NITRONIC30":"304",
        "NITRONIC32":"304",
        "NITRONIC40":"304",
        "XM18":      "304",
        "XM11":      "304",
        "S21904":    "304",
    }
    # Fallback chain: if primary target not in DB, try generic equivalent
    _eu_fallbacks = {
        "A36": "1020", "A514": "4130", "A572-50": "1045", "A588": "1020",
        "A709-50": "1045", "API-5L-X42": "1020", "API-5L-X52": "1030",
        "API-5L-X60": "1040", "API-5L-X65": "1045", "API-5L-X70": "1050",
        "API-5L-X80": "4130", "CPM-10V": "D2", "CPM-3V": "A2",
        "CPM-S30V": "440C", "CPM-S90V": "D2", "ASP-2060": "M2",
        "AERMET 100": "4340", "AF1410": "4340", "CUSTOM 465": "4340",
        "CUSTOM 450": "4340", "NITRALLOY N": "4140", "4330V": "4340",
        "STELLITE 6": "4340", "254 SMO": "316", "654 SMO": "316",
        "AL-6XN": "316", "ALLOY 20": "316", "NITRONIC 50": "304",
        "NITRONIC 60": "304", "926": "316",
    }
    name_nospace = name.replace(" ", "").replace("-", "")
    for eu_pat, aisi_num in eu_patterns.items():
        if eu_pat in name_nospace:
            r = _lookup(aisi_num)
            if r: return r
            # Try fallback
            fb = _eu_fallbacks.get(aisi_num)
            if fb:
                r = _lookup(fb)
                if r: return r

    # Strategy 18: Cast aluminum 3-digit match (356, 380, 413, etc.)
    # Handle A-prefix cast alloys (A356, A380, A413, A201, etc.)
    al_a_cast = re.search(r"\bA(\d{3})", name)
    if al_a_cast:
        code = al_a_cast.group(1)
        for pfx in [f"A{code}", code, f"AA{code}"]:
            r = _lookup(pfx)
            if r: return r
        # Nearest cast alloy fallback
        n = int(code)
        for near in [356, 380, 319, 413, 201]:
            if abs(n - near) <= 40:
                r = _lookup(str(near))
                if r: return r

    # ADC12/JIS cast aluminum → A380 equivalent
    if "ADC12" in name:
        r = _lookup("A380")
        if r: return r

    # MIC-6 / ALCA5 cast plate → A356 equivalent
    if "MIC" in name and "6" in name:
        r = _lookup("A356")
        if r: return r
    if "ALCA" in name:
        r = _lookup("A356")
        if r: return r

    al_cast_m = re.search(r"\b(\d{3})\b", base)
    if al_cast_m:
        code = al_cast_m.group(1)
        # Try as AA cast alloy (3xx series)
        for pfx in [f"AA{code}", code]:
            r = _lookup(pfx)
            if r: return r
        # Nearest 3-digit aluminum (for 383→380, 518→5052, etc.)
        n = int(code)
        if 300 <= n <= 399:
            r = _lookup("A380") or _lookup("A356")
            if r: return r
        elif 500 <= n <= 599:
            r = _lookup("5052") or _lookup("5083")
            if r: return r

    # Strategy 19: Stainless with modifier suffix (434=430+Mo, 309S=309, etc.)
    ss3_m = re.search(r"\b([2-4]\d{2})[A-Z]*\b", base)
    if ss3_m:
        code = ss3_m.group(1)
        r = _lookup(code)
        if r: return r
        # Try nearest in same series
        for offset in [1, -1, 2, -2, 5, -5, 10, -10]:
            r = _lookup(str(int(code) + offset))
            if r: return r

    # Strategy 20: ASTM structural grades from name/ID
    astm_m = re.search(r"\bA(\d{2,4})(?:[- ](?:GRADE|GR)?[- ]?(\w+))?\b", name)
    if astm_m:
        grade = f"A{astm_m.group(1)}"
        if astm_m.group(2):
            grade += f"-{astm_m.group(2)}"
        r = _lookup(grade)
        if r: return r
        r = _lookup(f"A{astm_m.group(1)}")
        if r: return r

    # Strategy 21: API 5L pipeline grades
    api_m = re.search(r"API[- ]?5L[- ]?(X\d+[A-Z]?)", name)
    if api_m:
        grade = api_m.group(1).upper()
        r = _lookup(f"API-5L-{grade}")
        if r: return r
        # Try nearest grade
        gnum = re.search(r"(\d+)", grade)
        if gnum:
            g = int(gnum.group(1))
            for try_g in [g, g-10, g+10, g-8, g+8, g-5, g+5]:
                r = _lookup(f"API-5L-X{try_g}")
                if r: return r

    # Strategy 22: CPM/ASP powder metallurgy tool steels
    cpm_m = re.search(r"(?:CPM|ASP)[- ]?(\w+)", name)
    if cpm_m:
        slug = cpm_m.group(1)
        for pfx in ["CPM-", "ASP-", "CPM ", "ASP "]:
            r = _lookup(f"{pfx}{slug}")
            if r: return r

    # Strategy 23: Specialty steel families
    spec_patterns = [
        (r"AERMET\s*(\d+)", "AERMET {}"),
        (r"AF\s*1410", "AF1410"),
        (r"CUSTOM\s*(\d+)", "CUSTOM {}"),
        (r"NITRALLOY\s*(\w+)", "NITRALLOY {}"),
        (r"STELLITE\s*(\d+)", "STELLITE {}"),
        (r"4330\s*V", "4330V"),
        (r"HY[\s-]*(\d+)", "HY-{}"),
        (r"HP\s*9[- ]?4[- ]?30", "4340"),  # HP 9-4-30 ≈ 4340
    ]
    for pat, fmt in spec_patterns:
        m = re.search(pat, name)
        if m:
            if "{}" in fmt:
                key = fmt.format(m.group(1))
            else:
                key = fmt
            r = _lookup(key)
            if r: return r

    # Strategy 24: Specialty stainless names
    spec_ss = [
        (r"NITRONIC\s*(\d+)", "NITRONIC {}"),
        (r"AL[- ]?6\s*XN", "AL-6XN"),
        (r"ALLOY\s*20|20CB", "ALLOY 20"),
        (r"254\s*SMO", "254 SMO"),
        (r"654\s*SMO", "654 SMO"),
        (r"904\s*L", "904L"),
        (r"\b926\b", "926"),
        (r"E[- ]?BRITE", "446"),    # E-Brite 26-1 ≈ 446
        (r"SEA[- ]?CURE", "444"),   # Sea-Cure SC-1 ≈ 444
        (r"FERRALIUM\s*255", "2507"),  # Ferralium 255 ≈ 2507
        (r"LEAN\s*DUPLEX\s*2101", "2205"),  # Lean Duplex 2101 ≈ 2205
        (r"XM[- ]?19|22[- ]?13[- ]?5", "NITRONIC 50"),
        (r"XM[- ]?10", "NITRONIC 50"),  # similar grade
        (r"XM[- ]?29", "NITRONIC 50"),  # similar grade
    ]
    for pat, key in spec_ss:
        m = re.search(pat, name)
        if m:
            if "{}" in key:
                actual_key = key.format(m.group(1))
            else:
                actual_key = key
            r = _lookup(actual_key)
            if r: return r

    # Strategy 25: More specialty alloy name patterns
    more_specs = [
        (r"E?52100", "52100"),       # E52100 electric furnace bearing
        (r"M50\b(?!NI)", "M2"),      # M50 bearing HSS ≈ M2
        (r"M50NIL", "M2"),           # M50NiL carburizing bearing ≈ M2
        (r"PYROWEAR\s*675", "4340"), # Pyrowear bearing ≈ 4340
        (r"FERRIUM\s*M54", "4340"),  # Ferrium gear/bearing ≈ 4340
        (r"EN8\b|080M40", "1040"),   # EN8 = BS 080M40 ≈ 1040
        (r"EN24\b|817M40", "4340"),  # EN24 ≈ 4340
        (r"EN19\b|709M40", "4140"),  # EN19 ≈ 4140
        (r"EN3\b|070M20", "1020"),   # EN3 ≈ 1020
        (r"EN1A\b|230M07", "1215"),  # EN1A free machining ≈ 1215
        (r"EN16\b|605M36", "4137"),  # EN16 ≈ 4137
        (r"EN9\b|070M55", "1055"),   # EN9 ≈ 1055
        (r"11L17", "1117"),          # 11L17 leaded ≈ 1117
        (r"12L14", "1215"),          # 12L14 leaded ≈ 1215
        (r"ELGILOY", "WASPALOY"),    # Elgiloy Co-Cr ≈ Waspaloy
        (r"TRIBALOY", "STELLITE 6"),
        (r"MAR[- ]?M\s*\d+", "WASPALOY"),  # MAR-M cast superalloy
        (r"ASTROLOY", "WASPALOY"),
        (r"UDIMET\s*\d+", "WASPALOY"),
        (r"CRONIFER", "316"),        # Cronifer = ThyssenKrupp stainless ≈ 316
        (r"UR\s*66", "316"),         # UR 66 super-austenitic
        (r"CMSX[- ]?\d", "WASPALOY"),  # CMSX single-crystal → Waspaloy
        (r"PWA\s*\d+", "WASPALOY"),    # PWA designations → Waspaloy
        (r"RR\s*\d+", "WASPALOY"),     # Rolls-Royce designations
    ]
    for pat, key in more_specs:
        m = re.search(pat, name)
        if m:
            r = _lookup(key)
            if r: return r

    # Strategy 25b: More aluminum alloys by number extraction
    al_m = re.search(r"\b(\d{4})[- ]?(?:T\d+|O|H\d+|F)?\b", base)
    if al_m and int(al_m.group(1)) >= 1000 and int(al_m.group(1)) <= 8999:
        num = al_m.group(1)
        r = _lookup(num)
        if r: return r
        # Try AA prefix
        r = _lookup(f"AA{num}")
        if r: return r
        # Try nearest in same series
        n = int(num)
        for offset in [1, -1, 5, -5, 10, -10, 25, -25, 50, -50]:
            candidate = str(n + offset)
            r = _lookup(candidate) or _lookup(f"AA{candidate}")
            if r: return r

    # Strategy 25c: Cast iron — Gray Iron Class XX, ADI grades, Ni-Hard
    if "GRAY" in name or "GREY" in name:
        cls_m = re.search(r"(\d{2,3})", name)
        if cls_m:
            cls = int(cls_m.group(1))
            # Try exact, then nearest standard class
            for c in [cls, 20, 25, 30, 35, 40, 45, 50, 55, 60]:
                r = _lookup(f"GRAY IRON CLASS {c}")
                if r:
                    if abs(c - cls) <= 10:
                        return r
    if "NI-HARD" in name or "NI HARD" in name or "NIHARD" in name:
        nh_m = re.search(r"(\d)", name)
        if nh_m:
            r = _lookup(f"NI-HARD {nh_m.group(1)}")
            if r: return r
    if "WHITE IRON" in name or "HIGH CHROME" in name or "CHILLED" in name:
        r = _lookup("NI-HARD 4") or _lookup("NI-HARD 1")
        if r: return r
    if "MEEHANITE" in name:
        r = _lookup("GRAY IRON CLASS 30")
        if r: return r
    if "GGG" in name or "GJS" in name:
        ggm = re.search(r"(\d{2,3})", name)
        if ggm:
            grade = int(ggm.group(1))
            # Map GGG tensile strength to nearest ductile iron
            for key in VERIFIED_LOOKUP:
                if "DUCTILE" in key or "GJS" in key:
                    r = _lookup(key)
                    if r: return r

    # Strategy 25d: More superalloy names
    sa_extra = [
        (r"HAYNES\s*(\d+)", "HAYNES {}"),
        (r"REN[EÉ]\s*(\d+)", "RENE {}"),
        (r"MONEL\s*([A-Z]?\d+|[A-Z]-\d+)", "MONEL {}"),
    ]
    for pat, fmt in sa_extra:
        m = re.search(pat, name)
        if m:
            key = fmt.format(m.group(1))
            r = _lookup(key)
            if r: return r
            # Fallback to nearest known superalloy
            r = _lookup("WASPALOY") or _lookup("INCONEL 718")
            if r: return r

    # Strategy 25e: JIS steel designation cross-reference
    jis_map = {
        "S45C": "1045", "S50C": "1050", "S55C": "1055", "S35C": "1035",
        "S20C": "1020", "S25C": "1025", "S30C": "1030", "S40C": "1040",
        "S10C": "1010", "S15C": "1015", "S60C": "1060",
        "SCM415": "4118", "SCM420": "4120", "SCM435": "4135",
        "SCM440": "4140", "SCM445": "4145",
        "SNCM439": "4340", "SNCM447": "4340", "SNCM630": "4340",
        "SUJ2": "52100", "SUJ3": "52100",
        "SKD11": "D2", "SKD61": "H13", "SKH51": "M2",
        "SS400": "A36", "SM490": "A572-50",
        "SUS304": "304", "SUS316": "316", "SUS316L": "316L",
        "SUS430": "430", "SUS410": "410", "SUS420": "420",
    }
    for jis, aisi in jis_map.items():
        if jis in name.replace(" ", "").replace("-", ""):
            r = _lookup(aisi)
            if r: return r

    # Strategy 26: Boron steels (10B21, 15B35, 50B44, etc.) → nearest AISI
    boron_m = re.search(r"(\d{2})B(\d{2})", name)
    if boron_m:
        prefix = boron_m.group(1)
        suffix = boron_m.group(2)
        # Map to nearest non-boron grade
        approx = f"{prefix}{suffix}"
        r = _lookup(approx)
        if r: return r
        # Try nearest in 10xx or 15xx series
        for lk in VERIFIED_LOOKUP:
            if lk.isdigit() and len(lk) == 4 and lk[:2] == prefix:
                r = _lookup(lk)
                if r: return r

    # Strategy 26: H-suffix grades (4118H, 5120H, 4820H) → base grade
    h_grade_m = re.search(r"\b(\d{4})H\b", name)
    if h_grade_m:
        base_num = h_grade_m.group(1)
        r = _lookup(base_num)
        if r: return r
        # Try nearest
        num = int(base_num)
        for offset in [5, -5, 10, -10, 20, -20]:
            r = _lookup(str(num + offset))
            if r: return r

    # Strategy 27: Dual-phase / TRIP / TWIP / Q&P advanced steels → nearest by carbon
    if any(x in name for x in ["DUAL PHASE", "DP ", "TRIP ", "TWIP ", "Q&P ", "Q P "]):
        # These are typically 0.1-0.2%C, ≈ 1020
        r = _lookup("1020")
        if r: return r

    # Strategy 28: Rail / structural steel names
    if "RAIL" in name:
        r = _lookup("1080")  # Rail steel is typically high-carbon ~0.80%
        if r: return r
    if "ELECTRICAL" in name and ("M19" in name or "M6" in name):
        r = _lookup("1010")  # Electrical steel ≈ low-carbon Si steel
        if r: return r

    # Strategy 29: Cryogenic steels (Ni content)
    if "CRYOGENIC" in name or "CRYO" in name:
        r = _lookup("4340")  # Ni steels for cryogenic ≈ 4340
        if r: return r

    # Strategy 30: Alloy 31 and similar numeric "Alloy" names
    alloy_m = re.search(r"ALLOY\s*(\d+)", name)
    if alloy_m:
        r = _lookup(f"ALLOY {alloy_m.group(1)}")
        if r: return r
        # Try as stainless number
        r = _lookup(alloy_m.group(1))
        if r: return r

    # Strategy 31: 440F free-machining → 440C
    if "440F" in name:
        r = _lookup("440C")
        if r: return r

    return None


# ══════════════════════════════════════════════════════════════════════════════
# COMPOSITION ENRICHMENT
# ══════════════════════════════════════════════════════════════════════════════

def _build_comp_lookup():
    """Build lookup index from material names to composition DB keys."""
    index = {}
    for key in ALLOY_COMPOSITIONS:
        index[key] = key
        index[key.upper()] = key

        # Numeric keys -> add AISI/SAE prefixed versions
        if re.match(r"^\d{3,5}[A-Z]?$", key):
            index[f"AISI {key}"] = key
            index[f"SAE {key}"] = key
        # SS keys -> add SS-prefixed versions
        elif re.match(r"^[234]\d{2}[A-Z]*$", key):
            index[f"SS {key}"] = key
            index[f"AISI {key}"] = key
        # Tool steel keys -> add "Tool " prefixed version
        elif re.match(r"^[ADHMOSWPLT]\d+$", key):
            index[f"TOOL {key}"] = key
            index[f"Tool {key}"] = key
        elif key.startswith("AA"):
            index[key[2:]] = key
        elif key.startswith("Ti"):
            index[key.upper()] = key
        elif key.startswith("Inconel") or key.startswith("Incoloy"):
            num = key.replace("Inconel", "").replace("Incoloy", "")
            for pfx in ["IN", "INCONEL", "INCONEL ", "INCOLOY", "INCOLOY "]:
                index[f"{pfx}{num}"] = key
        elif key.startswith("Hastelloy"):
            suffix = key.replace("Hastelloy", "")
            for pfx in ["HASTELLOY", "HASTELLOY "]:
                index[f"{pfx}{suffix}"] = key
        elif key.startswith("Haynes"):
            num = key.replace("Haynes", "")
            for pfx in ["HAYNES", "HAYNES "]:
                index[f"{pfx}{num}"] = key
        elif key.startswith("Monel"):
            suffix = key.replace("Monel", "")
            for pfx in ["MONEL", "MONEL "]:
                index[f"{pfx}{suffix}"] = key
        elif key.startswith("Nimonic"):
            suffix = key.replace("Nimonic", "")
            for pfx in ["NIMONIC", "NIMONIC "]:
                index[f"{pfx}{suffix}"] = key
        elif key.startswith("Rene"):
            num = key.replace("Rene", "")
            for pfx in ["RENE", "RENE ", "RENÉ "]:
                index[f"{pfx}{num}"] = key
        elif key.startswith("Stellite"):
            num = key.replace("Stellite", "")
            for pfx in ["STELLITE", "STELLITE "]:
                index[f"{pfx}{num}"] = key
        elif key.startswith("Udimet"):
            num = key.replace("Udimet", "")
            for pfx in ["UDIMET", "UDIMET "]:
                index[f"{pfx}{num}"] = key
        elif key.startswith("Maraging"):
            num = key.replace("Maraging", "")
            for pfx in ["MARAGING", "MARAGING "]:
                index[f"{pfx}{num}"] = key
        elif key.startswith("Mg "):
            # "Mg AZ31B" -> "AZ31B"
            code = key[3:]
            index[code] = key
            index[code.upper()] = key
        elif key.startswith("Cu "):
            # "Cu C17200" -> "C17200"
            code = key[3:]
            index[code] = key
            index[code.upper()] = key

    # Cross-reference common alternative keys
    _xref = {
        "B1112": "12L14", "11L17": "12L14", "86L20": "8620",
        "17-7PH": "17-7PH", "SS 17-7PH": "17-7PH",
        "13-8MO": "13-8Mo", "15-5PH": "15-5PH",
        "ALLOY 20": "Alloy20", "ALLOY20": "Alloy20",
        "AL-6XN": "AL-6XN", "AL6XN": "AL-6XN",
        "254 SMO": "254SMO", "254SMO": "254SMO",
        "654 SMO": "654SMO", "654SMO": "654SMO",
        "NITRONIC 50": "Nitronic50", "NITRONIC50": "Nitronic50",
        "NITRONIC 60": "Nitronic60", "NITRONIC60": "Nitronic60",
        "CUSTOM 450": "Custom450", "CUSTOM450": "Custom450",
        "CUSTOM 465": "Custom465", "CUSTOM465": "Custom465",
        "CUSTOM 455": "Custom455", "CUSTOM455": "Custom455",
        "A286": "A-286", "PYROMET A-286": "A-286", "A-286": "A-286",
        "N-155": "N-155", "N155": "N-155",
        "MP35N": "MP35N",
        "STELLITE 6": "Stellite6", "STELLITE6": "Stellite6",
        "STELLITE 21": "Stellite 21", "STELLITE21": "Stellite 21",
        "AERMET 100": "AERMET100", "AERMET100": "AERMET100",
        "AF1410": "AF1410",
        "NITRALLOY N": "NitralloyN", "NITRALLOYN": "NitralloyN",
        "NITRALLOY 135M": "Nitralloy135M", "NITRALLOY135M": "Nitralloy135M",
        "300M": "300M",
        "CPM-10V": "CPM10V", "CPM10V": "CPM10V",
        "CPM-3V": "CPM3V", "CPM3V": "CPM3V",
        "CPM-S30V": "CPMS30V", "CPMS30V": "CPMS30V",
        "CPM-S90V": "CPMS90V", "CPMS90V": "CPMS90V",
        "ASP-2060": "ASP2060", "ASP2060": "ASP2060",
        "4330V": "4330V",
        "INVAR 36": "Invar36", "INVAR36": "Invar36",
        # New additions
        "8622": "8622", "4118": "4118", "4118H": "4118H",
        "E52100": "E52100", "52100": "52100",
        "M50": "M50", "M50NIL": "M50NiL", "M50 NIL": "M50NiL",
        "PYROWEAR 675": "Pyrowear675", "PYROWEAR675": "Pyrowear675",
        "FERRIUM M54": "FerriumM54", "FERRIUMM54": "FerriumM54",
        "9310": "9310", "9310H": "9310H",
        "3310": "3310",
        "430F": "430F", "430TI": "430Ti", "410CB": "410Cb",
        "304N": "304N", "316N": "316N", "201LN": "201LN",
        "418": "418", "GREEK ASCOLOY": "Greek Ascoloy",
        "CGI 300": "CGI 300", "CGI 350": "CGI 350", "CGI 400": "CGI 400",
        "CGI300": "CGI 300", "CGI350": "CGI 350", "CGI400": "CGI 400",
        "MEEHANITE GB": "Meehanite GB", "MEEHANITE GD": "Meehanite GD",
        "WHITE IRON": "White Iron",
        "HIGH CHROME WHITE IRON": "High Chrome White Iron",
        "NI-HARD 1": "NI-HARD 1", "NI-HARD 4": "NI-HARD 4",
        "ELGILOY": "Elgiloy",
        "TRIBALOY T-800": "Tribaloy T-800", "TRIBALOY T800": "Tribaloy T-800",
        "MAR-M 247": "MAR-M 247", "MAR-M247": "MAR-M 247",
        "MAR-M 509": "MAR-M 509", "MAR-M509": "MAR-M 509",
        "ASTROLOY": "Astroloy",
        "CMSX-4": "CMSX-4", "CMSX4": "CMSX-4",
        "HAYNES 242": "Haynes 242", "HAYNES242": "Haynes 242",
        "A357": "A357",
        "VANADIS 4E": "Vanadis 4E", "ELMAX": "Elmax",
        "BOHLER K340": "Bohler K340", "CALDIE": "Caldie",
        "CRONIFER 1925": "Cronifer 1925", "ALLOY B66": "Alloy B66",
        "ADI 1": "ADI 1", "ADI 2": "ADI 2", "ADI 3": "ADI 3",
        "ADI 4": "ADI 4", "ADI 5": "ADI 5",
        "CARPENTER 20CB-3": "Carpenter 20Cb-3", "20CB-3": "Carpenter 20Cb-3",
        # Round 2 additions
        "UDIMET 520": "Udimet520", "UDIMET520": "Udimet520",
        "UDIMET 700": "Udimet700", "UDIMET700": "Udimet700",
        "INCONEL 725": "Inconel725", "INCONEL725": "Inconel725",
        "INCONEL 751": "Inconel751", "INCONEL751": "Inconel751",
        "HASTELLOY B-3": "HastelloyB-3", "HASTELLOYB-3": "HastelloyB-3",
        "HASTELLOY B-2": "HastelloyB-2", "HASTELLOYB-2": "HastelloyB-2",
        "HASTELLOY C-22": "HastelloyC-22", "HASTELLOYC-22": "HastelloyC-22",
        "HASTELLOY C-276": "HastelloyC-276", "HASTELLOYC-276": "HastelloyC-276",
        "AR400": "AR400", "AR450": "AR450", "AR500": "AR500",
        "AR500F": "AR500F", "AR600": "AR600",
        "304LN": "304LN", "316LN": "316LN", "316LVM": "316LVM",
        "317LMN": "317LMN", "410NIMO": "410NiMo",
        "S45C": "S45C", "S50C": "S50C", "S55C": "S55C",
        "SCM440": "SCM440", "SCM435": "SCM435", "SCM420": "SCM420", "SCM415": "SCM415",
        "SNCM439": "SNCM439", "SK5": "SK5",
        "SKD11": "SKD11", "SKD61": "SKD61", "SKH51": "SKH51", "SUJ2": "SUJ2",
        "SUS304": "SUS304", "SUS316": "SUS316", "SUS430": "SUS430",
        "FC200": "FC200", "FC300": "FC300", "FCD450": "FCD450",
        "ZA-8": "ZA-8", "ZA-12": "ZA-12", "ZA-27": "ZA-27",
        # Round 3
        "MARAGING 200": "Maraging200", "MARAGING200": "Maraging200",
        "ARMOX440T": "Armox440T", "ARMOX500T": "Armox500T",
        "ARMOX560T": "Armox560T", "ARMOX600T": "Armox600T",
        "RAMOR500": "Ramor500", "RAMOR550": "Ramor550",
        "HARDOX400": "Hardox400", "HARDOX450": "Hardox450", "HARDOX500": "Hardox500",
        "DUALPHASE590": "DualPhase590", "DUALPHASE780": "DualPhase780",
        "DUALPHASE980": "DualPhase980",
        "HASTELLOY G-30": "HastelloyG-30", "HASTELLOYG-30": "HastelloyG-30",
        "HASTELLOY G30": "HastelloyG-30",
        "INCOLOY 925": "Incoloy925", "INCOLOY925": "Incoloy925",
        "NITRONIC 30": "Nitronic30", "NITRONIC30": "Nitronic30",
        "NITRONIC 32": "Nitronic32", "NITRONIC32": "Nitronic32",
        "NITRONIC 40": "Nitronic40", "NITRONIC40": "Nitronic40",
        "ALLOY 31": "Alloy31", "ALLOY31": "Alloy31",
        "22-13-5": "22-13-5",
        "NIHARD4": "NiHard4", "CHILLED": "ChilledCastIron",
        "AA518": "AA518", "518": "AA518",
        # Round 4
        "22MNB5": "22MnB5", "22 MNB5": "22MnB5",
        "SA516-70": "SA516-70", "SA516-60": "SA516-60",
        "SA-516-70": "SA516-70", "SA-516-60": "SA516-60",
        "R260": "R260", "R350HT": "R350HT",
        "9NI": "9Ni", "5NI": "5Ni", "3.5NI": "3.5Ni",
        "API-5L-X100": "API-5L-X100",
        "154CM": "154CM", "VG-10": "VG-10",
        "CPMS35VN": "CPMS35VN", "CPM-S35VN": "CPMS35VN",
        "CPM20CV": "CPM20CV", "CPM-20CV": "CPM20CV",
        "QP980": "QP980", "QP1180": "QP1180",
        "TRIP780": "TRIP780", "TRIP980": "TRIP980",
        "TWIP": "TWIP", "CP800": "CP800",
        "DUALPHASE1180": "DualPhase1180", "DP1180": "DualPhase1180",
        "MS1500": "MS1500",
        "BAINITIC300": "Bainitic300",
        "M6": "M6",
        "422": "422", "440F": "440F",
        "XM-29": "XM-29", "XM29": "XM-29",
        "XM-11": "XM-11", "XM11": "XM-11",
        "XM-19": "XM-19", "XM19": "XM-19",
        "S31277": "S31277",
        "REX734": "Rex734", "REX 734": "Rex734",
        "BISALLOY360": "Bisalloy360", "BISALLOY400": "Bisalloy400",
        "BISALLOY500": "Bisalloy500",
        "F91": "F91",
        "C93200": "C93200", "C18150": "C18150", "C97600": "C97600",
        "RAMOR600": "Ramor600",
        # Round 5
        "HY-80": "HY-80", "HY-100": "HY-100", "HY-130": "HY-130",
        "HP9-4-30": "HP9-4-30", "HP 9-4-30": "HP9-4-30",
        "FERRIUMS53": "FerriumS53", "FERRIUM S53": "FerriumS53",
        "HMX": "HMX",
        "SA387-11": "SA387-11", "SA387-22": "SA387-22",
        "F22": "F22", "F6NM": "F6NM", "F11": "F11", "F9": "F9",
        "50B44": "50B44",
        "TRIP590": "TRIP590",
        "PHS1900": "PHS1900", "PHS 1900": "PHS1900",
        "M19": "M19", "M33": "M33", "M36": "M36", "M47": "M47",
        "A607-50": "A607-50", "A656-80": "A656-80",
        "F138": "F138", "34CRNIMO6": "34CrNiMo6",
        "ASP2030": "ASP2030", "ASP 2030": "ASP2030",
        "X70MNALSI": "X70MnAlSi",
        "CT15C": "CT15C",
        "12CRVALVE": "12CrValve",
        "PRESSHARDENED1500": "PressHardened1500",
        "330": "330",
        "DUPLEX2003": "Duplex2003", "DUPLEX2101": "Duplex2101",
        "SAF2906": "SAF2906",
        "FERRALIUM255": "Ferralium255",
        "S32760": "S32760", "ZERON100": "S32760",
        "EBRITE26-1": "EBrite26-1",
        "SEACURE": "SeaCure",
        "S31266": "S31266",
        "AA2124": "AA2124", "AA6070": "AA6070", "AA6201": "AA6201",
        "AA7150": "AA7150", "AA7175": "AA7175",
        "TI-3AL-8V-6CR-4MO-4ZR": "Ti-3Al-8V-6Cr-4Mo-4Zr",
        "TI-15V-3CR-3SN-3AL": "Ti-15V-3Cr-3Sn-3Al",
        "TI-15MO-3NB-3AL-0.2SI": "Ti-15Mo-3Nb-3Al-0.2Si",
        "TI-5AL-2SN-2ZR-4MO-4CR": "Ti-5Al-2Sn-2Zr-4Mo-4Cr",
        "TI-6AL-7NB": "Ti-6Al-7Nb",
        "TI-35NB-7ZR-5TA": "Ti-35Nb-7Zr-5Ta",
        "HIGHCHROMEGRAYIRON": "HighChromeGrayIron",
        "HIGHPHOSPHORUSGRAYIRON": "HighPhosphorusGrayIron",
    }
    for alias, target in _xref.items():
        if target in ALLOY_COMPOSITIONS:
            index[alias] = target

    return index

COMP_LOOKUP = _build_comp_lookup()


def _comp(key):
    """Shorthand: look up COMP_LOOKUP -> ALLOY_COMPOSITIONS."""
    if key in COMP_LOOKUP:
        return ALLOY_COMPOSITIONS[COMP_LOOKUP[key]]
    return None


def _clean_name(raw: str) -> str:
    """Strip parenthetical text, conditions, tempers, and descriptions from
    a material name, returning a clean alloy designation."""
    # Strip parenthetical text first: "(Pure, Annealed)", "(Aerospace)", etc.
    s = re.sub(r"\s*\([^)]*\)", "", raw).strip()
    # Strip condition / heat-treatment descriptions
    s = re.sub(r"\s+(ANNEALED|NORMALIZED|Q&T|COLD|HOT|ROLLED|DRAWN|TEMPERED|AGED|"
               r"STA|SOLUTION|TREATED|WORKED|HARD|QUENCHED|MILL|CAST|WROUGHT|"
               r"AS[- ]SUPPLIED|AS[- ]CAST|AS[- ]RECEIVED|EBM|SLM|DMLS|"
               r"FREE[- ]?MACHINING|GALLING\s+RESISTANT|NITROGEN\s+ENHANCED|"
               r"COLUMBIUM\s+BEARING|TITANIUM\s+STABILIZED|"
               r"ELECTRIC\s+FURNACE|HIGH\s+SPEED|BEARING\s+STEEL|"
               r"GEAR\s+STEEL|FORGING\s+DIE|ULTRA[- ]THICK|HIGH\s+PURITY|"
               r"PREMIUM|MILITARY|MARINE|ELECTRICAL|WIRE|LOW[- ]DUCTILITY|"
               r"HIGH\s+STRENGTH|HIGH\s+TOUGHNESS|"
               r"SPHEROIDIZE|OVERAGED|CARBURIZED|CASE\s+HARDENED|NITRIDED|"
               r"LEADED|RESULPHUR|RE[- ]?SULF|HSS|TOOL\b|"
               r"GRADE\s+\d+|SINGLE\s+CRYSTAL|POWDER\s+METAL|"
               r"STRESS\s+RELIEV|STRAIN\s+HARDEN|"
               r"\d+\s*HR?C(?:\s+CASE)?|CONDITION\s*\w+|"
               r"H\d+|T\d+|O\s*TEMPER|STANDARD|LOW\s*C|HIGH\s*C|"
               r"1/4\s*HARD|HALF[- ]HARD|FULL[- ]HARD|"
               r"PEARLITIC|FERRITIC|MARTENSITIC|AUSTENITIC|BAINITIC|"
               r"BLACKHEART|WHITEHEART|SAND|PERMANENT\s+MOLD|DIE).*$",
               "", s, flags=re.IGNORECASE).strip()
    # Strip trailing temper designations: -T6, -O, -H14, -F
    s = re.sub(r"[- ](T\d+[A-Z]*|O|H\d+|F)\b.*$", "", s).strip()
    return s


# Proprietary / trade-name -> comp DB key mapping
_TRADE_NAME_MAP = {
    "VANADIS 4E": "Vanadis 4E", "VANADIS4E": "Vanadis 4E",
    "ELMAX": "Elmax", "BOHLER K340": "Bohler K340", "BOHLERK340": "Bohler K340",
    "CALDIE": "Caldie", "VANCRON 40": "Vancron 40", "VANCRON40": "Vancron 40",
    "CRONIFER 1925": "Cronifer 1925", "CRONIFER1925": "Cronifer 1925",
    "ALLOY B66": "Alloy B66", "ALLOYB66": "Alloy B66",
    "PYROWEAR 675": "Pyrowear675", "PYROWEAR675": "Pyrowear675",
    "FERRIUM M54": "FerriumM54", "FERRIUMM54": "FerriumM54",
    "NITRALLOY 135M": "Nitralloy135M", "NITRALLOY135M": "Nitralloy135M",
    "NITRALLOY 135": "Nitralloy135M",
    "M50NIL": "M50NiL", "M50 NIL": "M50NiL",
    "GREEK ASCOLOY": "Greek Ascoloy",
    "ELGILOY": "Elgiloy", "TRIBALOY T-800": "Tribaloy T-800",
    "TRIBALOY T800": "Tribaloy T-800",
    "MAR-M 247": "MAR-M 247", "MARM247": "MAR-M 247", "MAR-M247": "MAR-M 247",
    "MAR-M 509": "MAR-M 509", "MARM509": "MAR-M 509", "MAR-M509": "MAR-M 509",
    "ASTROLOY": "Astroloy",
    "CMSX-4": "CMSX-4", "CMSX4": "CMSX-4",
    "HAYNES 242": "Haynes 242",
    "STELLITE 21": "Stellite 21", "STELLITE21": "Stellite 21",
    "E52100": "E52100",
    "9310": "9310", "9310H": "9310H",
    "CARPENTER 20CB-3": "Carpenter 20Cb-3", "20CB-3": "Carpenter 20Cb-3",
    "CRONIFER 1925 HMO": "Cronifer 1925",
    # Round 3
    "ARMOX 440": "Armox440T", "ARMOX440": "Armox440T", "ARMOX 440T": "Armox440T",
    "ARMOX 500": "Armox500T", "ARMOX500": "Armox500T", "ARMOX 500T": "Armox500T",
    "ARMOX 560": "Armox560T", "ARMOX560": "Armox560T", "ARMOX 560T": "Armox560T",
    "ARMOX 600": "Armox600T", "ARMOX600": "Armox600T", "ARMOX 600T": "Armox600T",
    "RAMOR 500": "Ramor500", "RAMOR500": "Ramor500",
    "RAMOR 550": "Ramor550", "RAMOR550": "Ramor550",
    "HARDOX 400": "Hardox400", "HARDOX400": "Hardox400",
    "HARDOX 450": "Hardox450", "HARDOX450": "Hardox450",
    "HARDOX 500": "Hardox500", "HARDOX500": "Hardox500",
    "DUAL PHASE 590": "DualPhase590", "DUAL PHASE 780": "DualPhase780",
    "DUAL PHASE 980": "DualPhase980",
    "DP590": "DualPhase590", "DP780": "DualPhase780", "DP980": "DualPhase980",
    "MARAGING 200": "Maraging200",
    "NI-HARD TYPE 4": "NiHard4", "NI-HARD 4": "NiHard4",
    "CHILLED CAST IRON": "ChilledCastIron", "CHILL CAST": "ChilledCastIron",
    "ALLOY 31": "Alloy31", "ALLOY31": "Alloy31",
    "NITRONIC 30": "Nitronic30", "NITRONIC30": "Nitronic30",
    "NITRONIC 32": "Nitronic32", "NITRONIC32": "Nitronic32",
    "NITRONIC 40": "Nitronic40", "NITRONIC40": "Nitronic40",
    "22-13-5": "22-13-5",
    "HASTELLOY G-30": "HastelloyG-30", "HASTELLOYG-30": "HastelloyG-30",
    "INCOLOY 925": "Incoloy925", "INCOLOY925": "Incoloy925",
    # Round 4
    "22MNB5": "22MnB5", "22 MNB5": "22MnB5",
    "SA516": "SA516-70", "SA-516": "SA516-70",
    "RAIL STEEL R260": "R260", "RAIL R260": "R260",
    "RAIL STEEL R350HT": "R350HT", "RAIL R350HT": "R350HT",
    "154CM": "154CM", "ATS-34": "154CM",
    "VG-10": "VG-10", "VG10": "VG-10",
    "CPM S35VN": "CPMS35VN", "CPMS35VN": "CPMS35VN", "CPM-S35VN": "CPMS35VN",
    "CPM 20CV": "CPM20CV", "CPM20CV": "CPM20CV", "CPM-20CV": "CPM20CV",
    "REX 734": "Rex734", "REX734": "Rex734",
    "MLX-17": "17-4PH",  # MLX-17 is a variant of 17-4PH
    "BISALLOY 360": "Bisalloy360", "BISALLOY360": "Bisalloy360",
    "BISALLOY 400": "Bisalloy400", "BISALLOY400": "Bisalloy400",
    "BISALLOY 500": "Bisalloy500", "BISALLOY500": "Bisalloy500",
    "RAMOR 600": "Ramor600", "RAMOR600": "Ramor600",
    "F91": "F91",
    "BAINITIC STEEL 300": "Bainitic300", "BAINITIC 300": "Bainitic300",
    "M6 ELECTRICAL": "M6",
    "XM-29": "XM-29", "XM29": "XM-29", "S24000": "XM-29",
    "XM-11": "XM-11", "XM11": "XM-11", "S21904": "XM-11",
    "XM-19": "XM-19", "XM19": "XM-19",
    "S31277": "S31277", "27-7MO": "S31277",
    "MIC-6": "AA356", "MIC 6": "AA356", "ALCA5": "AA356",
    # Round 5 — comprehensive gap closure
    "CPM 10V": "CPM10V", "CPM-10V": "CPM10V", "CPM10V": "CPM10V",
    "CPM 3V": "CPM3V", "CPM-3V": "CPM3V", "CPM3V": "CPM3V",
    "CPM S30V": "CPMS30V", "CPM-S30V": "CPMS30V",
    "CPM S90V": "CPMS90V", "CPM-S90V": "CPMS90V",
    "AERMET 100": "AERMET100", "AERMET100": "AERMET100",
    "AF1410": "AF1410",
    "HY-80": "HY-80", "HY80": "HY-80", "HY 80": "HY-80",
    "HY-100": "HY-100", "HY100": "HY-100", "HY 100": "HY-100",
    "HY-130": "HY-130", "HY130": "HY-130", "HY 130": "HY-130",
    "HP 9-4-30": "HP9-4-30", "HP9-4-30": "HP9-4-30", "HP 9-4": "HP9-4-30",
    "ASP 2030": "ASP2030", "ASP2030": "ASP2030",
    "ASP 2060": "ASP2060", "ASP2060": "ASP2060",
    "SA387": "SA387-22",
    "A607": "A607-50", "A607-50": "A607-50",
    "A656": "A656-80", "A656-80": "A656-80",
    "F138": "F138", "ASTM F138": "F138", "SURGICAL STEEL": "F138",
    "F6NM": "F6NM", "CA6NM": "F6NM",
    "FERRIUM S53": "FerriumS53", "FERRIUMS53": "FerriumS53",
    "HMX": "HMX",
    "M33": "M33",
    "M19": "M19",
    "34CRNIMO6": "34CrNiMo6", "34CRNIMO6": "34CrNiMo6",
    "PRESS HARDENED": "PressHardened1500", "PHS 1500": "PressHardened1500",
    "PHS 1900": "PHS1900", "PHS1900": "PHS1900",
    "TRIP 590": "TRIP590", "TRIP590": "TRIP590",
    "X70MNALSI": "X70MnAlSi", "TRIPLEX": "X70MnAlSi",
    "CARBIDE-FREE BAINITIC": "Bainitic300", "CARBIDE FREE BAINITIC": "Bainitic300",
    "CT15C": "CT15C", "CARPENTER CT15C": "CT15C",
    "12% CR VALVE": "12CrValve", "12 CR VALVE": "12CrValve",
    "50B44": "50B44",
    "254 SMO": "254SMO", "254SMO": "254SMO",
    "AL-6XN": "AL-6XN", "AL6XN": "AL-6XN",
    "A-286": "A-286", "A286": "A-286",
    "FERRALIUM 255": "Ferralium255", "FERRALIUM255": "Ferralium255",
    "FERRALIUM": "Ferralium255",
    "E-BRITE": "EBrite26-1", "EBRITE": "EBrite26-1",
    "SEA-CURE": "SeaCure", "SEACURE": "SeaCure", "SC-1": "SeaCure",
    "ZERON 100": "S32760", "ZERON100": "S32760",
    "S32760": "S32760",
    "S31266": "S31266", "UR 66": "S31266", "UR66": "S31266",
    "SAF 2906": "SAF2906", "SAF2906": "SAF2906",
    "LDX 2101": "Duplex2101", "LDX2101": "Duplex2101", "LEAN DUPLEX 2101": "Duplex2101",
    "DUPLEX 2003": "Duplex2003", "DUPLEX2003": "Duplex2003",
    "DUPLEX 2101": "Duplex2101", "DUPLEX2101": "Duplex2101",
    "BETA-C": "Ti-3Al-8V-6Cr-4Mo-4Zr", "BETA C": "Ti-3Al-8V-6Cr-4Mo-4Zr",
    "BETA 21S": "Ti-15Mo-3Nb-3Al-0.2Si",
    "TI-15-3-3-3": "Ti-15V-3Cr-3Sn-3Al", "TI-15-3": "Ti-15V-3Cr-3Sn-3Al",
    "TI-17": "Ti-5Al-2Sn-2Zr-4Mo-4Cr",
    "TI-6AL-7NB": "Ti-6Al-7Nb",
    "TNZT": "Ti-35Nb-7Zr-5Ta",
    "HIGH-CHROME WEAR": "HighChromeGrayIron", "HIGH CHROME WEAR": "HighChromeGrayIron",
    "HIGH-PHOSPHORUS GRAY": "HighPhosphorusGrayIron", "HIGH PHOSPHORUS GRAY": "HighPhosphorusGrayIron",
    # Round 5b — final gaps
    "18CRNIMO7-6": "18CrNiMo7-6", "18CRNIMO7": "18CrNiMo7-6",
    "1.6587": "18CrNiMo7-6",
    "TWIP STEEL 980": "TWIP", "TWIP STEEL": "TWIP", "TWIP980": "TWIP",
    "PRESS HARDENED STEEL": "PressHardened1500",
    "PRESS ANNEALED": "PressHardened1500",
    "TI-6246": "Ti-6Al-2Sn-4Zr-6Mo", "TI 6246": "Ti-6Al-2Sn-4Zr-6Mo",
    "TI-6AL-2SN-4ZR-6MO": "Ti-6Al-2Sn-4Zr-6Mo",
    # Round 5c — final remaining
    "TI-5553": "Ti-5Al-5V-5Mo-3Cr", "TI-5AL-5V-5MO-3CR": "Ti-5Al-5V-5Mo-3Cr",
    "360 DIE CAST": "AA360", "383 DIE CAST": "AA383",
    "ADC12": "AA383",
    "PURE LEAD": "PureLead", "PURE ZINC": "PureZinc",
    "PURE MAGNESIUM": "PureMagnesium",
    "ZINC 99": "PureZinc",
    "WE43": "Mg WE43A", "WE43A": "Mg WE43A",
    "ZE41": "Mg ZE41A", "ZE41A": "Mg ZE41A",
    "ZIRCONIUM 702": "Zr702", "ZR702": "Zr702", "ZR 702": "Zr702",
    "ZIRCONIUM 705": "Zr705", "ZR705": "Zr705", "ZR 705": "Zr705",
    "ILZRO 12": "ILZRO12", "ILZRO12": "ILZRO12",
    # Round 5d — X_SPECIALTY metals
    "ALLOY 42": "Alloy42", "ALLOY42": "Alloy42",
    "ALLOY 48": "Alloy48", "ALLOY48": "Alloy48",
    "ALLOY 52": "Alloy52", "ALLOY52": "Alloy52",
    "SUPER INVAR": "SuperInvar", "SUPERINVAR": "SuperInvar",
    "SUPERMALLOY": "Supermalloy",
    "PERMALLOY 80": "Permalloy80", "PERMALLOY80": "Permalloy80",
    "PURE TUNGSTEN": "PureTungsten", "PURE MOLYBDENUM": "PureMolybdenum",
    "W-90": "W-90", "W-95": "W-95", "W 90": "W-90", "W 95": "W-95",
    "SCALMALLOY": "Scalmalloy",
    "MARAGING STEEL MS1": "MaragingMS1", "MARAGING MS1": "MaragingMS1",
    "MS1": "MaragingMS1",
    "HIP SUPERALLOY IN718": "Inconel718", "HIP IN718": "Inconel718",
    "HIP TOOL STEEL M2": "M2", "TOOL STEEL H13 SLM": "H13",
    "TOOL STEEL M2 SLM": "M2",
    "BRONZE CUSN10": "Cu C52400",
    "SAE 841": "PMBronzeSAE841", "SAE841": "PMBronzeSAE841",
    "SAE 863": "PMBronzeSAE863", "SAE863": "PMBronzeSAE863",
    "F-0000": "SinteredIronF0000", "F0000": "SinteredIronF0000",
    "F-0005": "SinteredIronF0005", "F0005": "SinteredIronF0005",
    "F-0008": "SinteredIronF0008", "F0008": "SinteredIronF0008",
    "FC-0205": "SinteredSteelFC0205", "FC0205": "SinteredSteelFC0205",
    "FC-0208": "SinteredSteelFC0208", "FC0208": "SinteredSteelFC0208",
    "FN-0205": "SinteredSteelFN0205", "FN0205": "SinteredSteelFN0205",
    "SILICON IRON GO": "SiliconIronGO", "SILICON IRON NGO": "SiliconIronNGO",
    "MIM TUNGSTEN": "PureTungsten",
    "PM ALUMINUM 601": "AA6061",
    # Round 5e — precious metals
    "24K GOLD": "24KGold", "PURE GOLD": "24KGold",
    "22K GOLD": "22KGold",
    "18K GOLD": "18KGold",
    "14K GOLD": "14KGold",
    "10K GOLD": "10KGold",
    "DENTAL GOLD": "DentalGold",
    "PD WHITE GOLD": "PdWhiteGold",
    "WHITE GOLD 18K": "White18KGold", "WHITE GOLD": "White18KGold",
    "PURE SILVER 999": "PureSilver", "PURE SILVER": "PureSilver",
    "STERLING SILVER": "SterlingSilver",
    "COIN SILVER": "CoinSilver",
    "ARGENTIUM SILVER": "ArgentiumSilver", "ARGENTIUM": "ArgentiumSilver",
    "PURE PLATINUM": "PurePlatinum",
    "PURE PALLADIUM": "PurePalladium",
    "AG-PD": "AgPdAlloy", "AGPD": "AgPdAlloy",
    "CUSN10": "CuSn10", "CU SN10": "CuSn10",
    # Round 6 — final completeness
    "NITINOL": "Nitinol", "NITI": "Nitinol",
    "MU-METAL": "MuMetal", "MU METAL": "MuMetal", "MUMETAL": "MuMetal",
    "LIQUIDMETAL": "Liquidmetal", "VITRELOY": "Liquidmetal",
    "PURE CHROMIUM": "PureChromium", "PURE CR": "PureChromium",
    "PURE NIOBIUM": "PureNiobium", "PURE NB": "PureNiobium",
    "PURE TANTALUM": "PureTantalum", "PURE TA": "PureTantalum",
    "HF-TA": "HfTaAlloy", "HFTA": "HfTaAlloy",
    "RE-MO": "ReMoAlloy", "REMO": "ReMoAlloy",
    "CZ-0000": "PMBronzeCZ0000", "CZ0000": "PMBronzeCZ0000",
    "POROUS BRONZE": "PorousBronzeFilter",
    "IRON-BRONZE BEARING": "IronBronzeBearing", "IRON BRONZE BEARING": "IronBronzeBearing",
    "SOFT MAGNETIC FE-P": "PMSoftMagFeP", "SOFT MAGNETIC FE": "PMSoftMagFeP",
    "AL-SIC": "AlSiCMatrix", "AL SIC": "AlSiCMatrix",
    "MG-SIC": "MgSiCMatrix", "MG SIC": "MgSiCMatrix",
    "STEEL-TIC": "SinteredSteelFC0208",  # cermet, approximate as high-C sintered steel matrix
    "TA CLAD": "PureTantalum",  # clad layer composition
}

# Cast iron name -> comp DB key mapping
_CAST_IRON_MAP = {
    "ADI GRADE 1": "ADI 1", "ADI GRADE 2": "ADI 2", "ADI GRADE 3": "ADI 3",
    "ADI GRADE 4": "ADI 4", "ADI GRADE 5": "ADI 5",
    "ADI 900": "ADI 1", "ADI 1050": "ADI 2", "ADI 1200": "ADI 3",
    "ADI 1400": "ADI 4", "ADI 1600": "ADI 5",
    "WHITE IRON NI-HARD 1": "NI-HARD 1", "WHITE IRON NI-HARD 4": "NiHard4",
    "NI-HARD 1": "NI-HARD 1", "NI-HARD 4": "NiHard4",
    "NI-HARD TYPE 4": "NiHard4", "NI HARD TYPE 4": "NiHard4",
    "CHILLED CAST IRON": "ChilledCastIron", "CHILL CAST": "ChilledCastIron",
    "INDEFINITE CHILL": "ChilledCastIron",
    "HIGH CHROME WHITE IRON": "High Chrome White Iron",
    "HIGH-CHROME WHITE IRON": "High Chrome White Iron",
    "MEEHANITE GRADE GB": "Meehanite GB", "MEEHANITE GB": "Meehanite GB",
    "MEEHANITE GRADE GD": "Meehanite GD", "MEEHANITE GD": "Meehanite GD",
    "WHITE IRON": "White Iron",
}

# Copper trade names -> Cu CDA number
_COPPER_NAME_MAP = {
    "NAVAL BRASS": "Cu C46400", "ADMIRALTY BRASS": "Cu C44300",
    "RED BRASS": "Cu C23000", "YELLOW BRASS": "Cu C26800",
    "CARTRIDGE BRASS": "Cu C26000", "FREE CUTTING BRASS": "Cu C36000",
    "FREE-CUTTING BRASS": "Cu C36000", "MUNTZ METAL": "Cu C28000",
    "PHOSPHOR BRONZE": "Cu C51000", "ALUMINUM BRONZE": "Cu C63000",
    "SILICON BRONZE": "Cu C65500", "BERYLLIUM COPPER": "Cu C17200",
    "BERYLLIUM-COPPER": "Cu C17200", "BECU": "Cu C17200",
    "CUPRONICKEL 70/30": "Cu C71500", "CUPRONICKEL 90/10": "Cu C70600",
    "NICKEL SILVER": "Cu C75200", "GERMAN SILVER": "Cu C75200",
    "TELLURIUM COPPER": "Cu C14500", "DHP COPPER": "Cu C12200",
    "OFHC COPPER": "Cu C10100", "ETP COPPER": "Cu C11000",
    "LEADED BRASS": "Cu C36000", "TIN BRONZE": "Cu C90300",
}


def find_composition(mat: dict) -> dict:
    """Multi-strategy composition lookup. Tries progressively looser matches."""
    raw_name = mat.get("name", "").strip()
    if not raw_name:
        return None
    name = raw_name.upper()

    # ── Strategy 0: Trade-name / proprietary direct map ──────────────
    for tname, tkey in _TRADE_NAME_MAP.items():
        if tname in name:
            r = _comp(tkey)
            if r:
                return r

    # ── Strategy 0b: Underscore-formatted names ────────────────────
    # "GRAY_CLASS_20" -> "GRAY CLASS 20", "CUSTOM_455" -> "CUSTOM 455"
    if "_" in name:
        name = name.replace("_", " ")

    # ── Strategy 1: Strip standard prefixes ──────────────────────────
    stripped = name
    for pfx in ["AISI ", "SAE ", "UNS ", "EN ", "DIN ", "AA ", "AMS ",
                "ASTM ", "JIS ", "BS ", "AFNOR ", "WERKSTOFF ", "W.NR. "]:
        if stripped.startswith(pfx):
            stripped = stripped[len(pfx):]
            break

    # ── Strategy 2: Strip material-type word prefixes ────────────────
    for wpfx in ["ALUMINUM ", "ALUMINIUM ", "COPPER ", "TITANIUM ", "MAGNESIUM ",
                 "ZINC ", "NICKEL ALLOY ", "NICKEL ", "COBALT ", "COBALT ALLOY "]:
        if stripped.startswith(wpfx):
            stripped = stripped[len(wpfx):]
            break

    # ── Strategy 3: Clean conditions/tempers → direct lookup ─────────
    base = _clean_name(stripped)
    r = _comp(base)
    if r:
        return r

    # ── Strategy 4: Extract numeric alloy code ───────────────────────
    # Use lookahead instead of \b to handle "304LN" where L is followed by N
    num_m = re.search(r"(\d{3,5}[A-Z]?)(?=[^A-Z0-9]|$)", base)
    if num_m:
        num = num_m.group(1)
        r = _comp(num)
        if r:
            return r
    # Also try pure digits only
    digits_m = re.search(r"(\d{3,5})", base)
    if digits_m:
        r = _comp(digits_m.group(1))
        if r:
            return r

    # ── Strategy 5: Tool steel code from descriptions ────────────────
    # "A2 Tool 58 HRC" -> "A2", "M2 HSS 62 HRC" -> "M2", "D2 Tool" -> "D2"
    tool_m = re.search(r"\b([ADHMOSWPLT]\d+(?:NI[L]?)?)\b", base)
    if tool_m:
        code = tool_m.group(1)
        r = _comp(code)
        if r:
            return r

    # ── Strategy 6: Superalloy name extraction ───────────────────────
    for pat_key in ["INCONEL", "INCOLOY", "HASTELLOY", "WASPALOY",
                    "MONEL", "NIMONIC", "HAYNES", "RENE", "STELLITE",
                    "UDIMET", "MARAGING"]:
        m = re.search(rf"{pat_key}\s*([A-Z]?[\-]?\d+[A-Z]?(?:\-\d+)?)", name)
        if m:
            suffix = m.group(1).strip()
            # Try with space and without
            for lookup in [f"{pat_key} {suffix}", f"{pat_key}{suffix}",
                          f"{pat_key} {suffix.replace('-','')}", f"{pat_key}{suffix.replace('-','')}",
                          f"{pat_key}{suffix.split('-')[0]}"]:
                r = _comp(lookup)
                if r:
                    return r

    # ── Strategy 7: PH stainless (17-4PH, 15-5PH, 13-8Mo) ──────────
    ph_m = re.search(r"(\d+)[- ]?(\d+)\s*PH", name)
    if ph_m:
        ph_key = f"{ph_m.group(1)}-{ph_m.group(2)}PH"
        r = _comp(ph_key)
        if r:
            return r
        # 13-8PH is also known as 13-8Mo
        if ph_key == "13-8PH":
            r = _comp("13-8Mo")
            if r:
                return r

    # ── Strategy 8: Duplex stainless (2205, 2507, 2304, 2003, 2101) ─
    for d in ["2205", "2507", "2304", "2003", "2101", "2906"]:
        if d in name:
            r = _comp(d) or _comp(f"Duplex{d}") or _comp(f"SAF{d}")
            if r:
                return r

    # ── Strategy 9: Cast iron names ──────────────────────────────────
    for ci_pat, ci_key in _CAST_IRON_MAP.items():
        if ci_pat in name:
            r = _comp(ci_key)
            if r:
                return r

    # Gray Iron Class XX (also handles "GRAY CLASS 20" without "IRON")
    gi_m = re.search(r"GR[AE]Y\s+(?:IRON\s+)?CLASS\s+(\d+)", name)
    if gi_m:
        r = _comp(f"Gray Iron Class {gi_m.group(1)}")
        if r:
            return r

    # Ductile Iron XX-XX-XX
    di_m = re.search(r"DUCTILE[^0-9]*(\d+)[- ](\d+)[- ](\d+)", name)
    if di_m:
        dk = f"Ductile {di_m.group(1)}-{di_m.group(2)}-{di_m.group(3)}"
        r = _comp(dk)
        if r:
            return r

    # Compacted Graphite / CGI
    cgi_m = re.search(r"(?:COMPACTED\s+GRAPHITE|CGI)\s*(?:GRADE\s*)?(\d+)", name)
    if cgi_m:
        num = cgi_m.group(1)
        for ck in [f"CGI {num}", f"CGI{num}", "CGI 450", "CGI400", "CGI300"]:
            r = _comp(ck)
            if r:
                return r

    # Malleable Iron
    if "MALLEABLE" in name:
        mal_m = re.search(r"M(\d+)", name)
        if mal_m:
            r = _comp(f"Malleable Iron M{mal_m.group(1)}")
            if r:
                return r
        r = _comp("Malleable Iron M3210") or _comp("MalleableM3210")
        if r:
            return r

    # ── Strategy 10: Copper alloy by trade name ──────────────────────
    for cn, ck in _COPPER_NAME_MAP.items():
        if cn in name:
            r = _comp(ck)
            if r:
                return r

    # Copper by CDA number: "C36000", "CDA 360"
    cu_m = re.search(r"\bC(\d{4,5})\b", name)
    if cu_m:
        cda = f"Cu C{cu_m.group(1)}"
        r = _comp(cda)
        if r:
            return r
        # Also try bare code
        r = _comp(f"C{cu_m.group(1)}")
        if r:
            return r

    # ── Strategy 11: Aluminum by alloy number ────────────────────────
    al_m = re.search(r"\b([1-8]\d{3})\b", base)
    if al_m and ("ALUMINUM" in name or "ALUMINIUM" in name or "AL " in name[:4]
                 or mat.get("iso_group", "") == "N_NONFERROUS"):
        alloy_num = al_m.group(1)
        # Direct match
        r = _comp(f"AA{alloy_num}") or _comp(alloy_num)
        if r:
            return r
        # Cast aluminum A-prefix: A356 -> AA356
        if base.startswith("A") and len(base) >= 4:
            r = _comp(f"AA{base[1:5].rstrip()}")
            if r:
                return r

    # ── Strategy 12: Titanium by designation ─────────────────────────
    if "TITANIUM" in name or "TI-" in name or "CP TI" in name or "TI " in name[:4]:
        # CP Grade
        cp_m = re.search(r"(?:CP|COMMERCIALLY\s+PURE)\s*(?:TI(?:TANIUM)?)?\s*GRADE\s*(\d)", name)
        if cp_m:
            r = _comp(f"Ti CP Grade {cp_m.group(1)}")
            if r:
                return r
        # Complex Ti designation: Ti-XAl-YV-ZCr-... (full multi-element designation)
        ti_full = re.search(r"(TI[- ]\d+\w+(?:[- ]\d+\.?\d*\w+)+)", name)
        if ti_full:
            desig = ti_full.group(1).replace(" ", "-")
            if desig.upper().startswith("TI-"):
                desig = "Ti-" + desig[3:]
            r = _comp(desig)
            if r:
                return r
            r = _comp(desig.upper())
            if r:
                return r
        # Simple Ti-XAl-YV
        ti_m = re.search(r"TI[- ]*(\d+AL[- ]\d+V(?:[- ]\d+\w+)*)", name)
        if ti_m:
            ti_desig = f"Ti-{ti_m.group(1).replace(' ','-')}"
            r = _comp(ti_desig)
            if r:
                return r
        # Generic Ti-alloy name from original (longest match first)
        ti_keys = sorted([tk for tk in COMP_LOOKUP if tk.upper().startswith("TI")],
                         key=len, reverse=True)
        for tk in ti_keys:
            if tk.upper() in name:
                return ALLOY_COMPOSITIONS[COMP_LOOKUP[tk]]

    # ── Strategy 13: Magnesium by designation ────────────────────────
    mg_m = re.search(r"\b(AZ\d+[A-Z]?|WE\d+[A-Z]?|ZK\d+[A-Z]?|AM\d+[A-Z]?|EZ\d+[A-Z]?|QE\d+[A-Z]?|ELEKTRON\s*\d+)\b", name)
    if mg_m:
        mg_code = mg_m.group(1).replace(" ", "")
        for mk in [f"Mg {mg_code}", mg_code, mg_code.upper()]:
            r = _comp(mk)
            if r:
                return r

    # ── Strategy 14: Stainless/steel variant fallback ────────────────
    # 304LN -> 304L -> 304, 430F -> 430, 316LVM -> 316L -> 316, 410NiMo -> 410
    # Try progressively shorter suffixes from the cleaned base
    variant_m = re.search(r"(\d{3,5})([A-Z]+)", base)
    if variant_m:
        digits = variant_m.group(1)
        letters = variant_m.group(2)
        # Try removing letters one at a time from the right
        for i in range(len(letters), 0, -1):
            candidate = digits + letters[:i]
            r = _comp(candidate)
            if r:
                return r
        # Try just the digits
        r = _comp(digits)
        if r:
            return r

    # ── Strategy 15: Nearest-grade steel fallback ────────────────────
    # 8622 -> try 8620, 4118 -> try 4120 -> 4140
    if num_m:
        num = num_m.group(1)
        if re.match(r"^\d{4,5}$", num):
            num_int = int(num)
            series = (num_int // 100) * 100  # e.g., 8600
            # Try rounding to nearest common grade within series
            for offset in [0, -2, 2, -5, 5, -10, 10, -20, 20, -22, 22]:
                candidate = str(num_int + offset)
                if candidate != num:
                    r = _comp(candidate)
                    if r:
                        return r
            # Try common grades in same series
            base2 = num[:2]  # e.g., "86" from "8622"
            for common_suffix in ["20", "40", "15", "30", "50", "60"]:
                candidate = base2 + common_suffix
                if candidate != num:
                    r = _comp(candidate)
                    if r:
                        return r

    # ── Strategy 16: Aluminum nearest-series ─────────────────────────
    if al_m and ("ALUMINUM" in name or "ALUMINIUM" in name or "AL " in name[:4]
                 or mat.get("iso_group", "") == "N_NONFERROUS"):
        alloy_num = int(al_m.group(1))
        series = (alloy_num // 1000) * 1000
        # Known major alloys per series for fallback
        _al_fallback = {
            1000: [1100, 1350], 2000: [2024, 2014, 2011, 2017, 2218],
            3000: [3003, 3004], 4000: [4032, 4043],
            5000: [5052, 5083, 5086, 5056], 6000: [6061, 6063, 6082],
            7000: [7075, 7050, 7475, 7005], 8000: [8090],
        }
        candidates = _al_fallback.get(series, [])
        # Sort by distance to target
        candidates.sort(key=lambda c: abs(c - alloy_num))
        for c in candidates[:3]:
            r = _comp(f"AA{c}") or _comp(str(c))
            if r:
                return r

    # ── Strategy 17: ASTM grade resolution ──────────────────────────
    # "A572 Grade 50" -> "A572-50", "A514" -> "A514"
    astm_m = re.search(r"\bA(\d{3,4})\b", name)
    if astm_m:
        astm_num = astm_m.group(1)
        # Check for Grade suffix
        grade_m = re.search(r"GRADE\s*(\d+)", name)
        if grade_m:
            astm_key = f"A{astm_num}-{grade_m.group(1)}"
            r = _comp(astm_key)
            if r:
                return r
        # Try without grade
        r = _comp(f"A{astm_num}")
        if r:
            return r

    # ── Strategy 18: API pipe grades ─────────────────────────────────
    api_m = re.search(r"API\s*(?:5L)?\s*[- ]?\s*X?(\d+)", name)
    if api_m:
        grade = api_m.group(1)
        for ak in [f"API-5L-X{grade}", f"API-5L-X{grade}0" if len(grade) < 3 else ""]:
            if ak:
                r = _comp(ak)
                if r:
                    return r

    # ── Strategy 19: BS/EN designation cross-reference ───────────────
    _en_to_aisi = {
        "080M40": "1040", "080M15": "1015", "080M50": "1050",
        "070M55": "1055", "070M20": "1020", "709M40": "4140",
        "817M40": "4340", "655M13": "9310", "835M30": "4130",
        "EN3": "1020", "EN8": "1040", "EN9": "1055",
        "EN16": "4340", "EN19": "4140", "EN24": "4340",
        "EN26": "4340", "EN30B": "8620", "EN31": "52100",
        "EN36": "9310", "EN40B": "4140", "EN41B": "4140",
        "EN43": "1050", "EN47": "6150",
        "42CRMO4": "4140", "34CRMO4": "4135", "25CRMO4": "4130",
        "16MNCR5": "5120", "20MNCR5": "5120",
        "18CRNIMO76": "18CrNiMo7-6", "18CRNIMO7-6": "18CrNiMo7-6",
        "C45": "1045", "CK45": "1045", "C60": "1060",
        "ST37": "A36", "ST52": "A572-50",
        "X5CRNI18-10": "304", "X2CRNI19-11": "304L",
        "X5CRNIMO17-12-2": "316", "X2CRNIMO17-12-2": "316L",
    }
    for en_key, aisi_val in _en_to_aisi.items():
        if en_key in name.replace(" ", "").replace("-", ""):
            r = _comp(aisi_val)
            if r:
                return r

    # ── Strategy 20: Leaded/free-machining steel variants ────────────
    lead_m = re.search(r"\b(\d{1,2}L\d{2})\b", stripped)
    if lead_m:
        code = lead_m.group(1)
        r = _comp(code)
        if r:
            return r

    # ── Strategy 21: Cast aluminum by number ─────────────────────────
    # 383, 319, A356 etc. without "Aluminum" prefix
    if mat.get("iso_group", "") in ("N_NONFERROUS", "X_SPECIALTY"):
        cast_m = re.search(r"\b([A]?\d{3})\b", base)
        if cast_m:
            num = cast_m.group(1)
            # Try A-prefix and AA-prefix
            for prefix in ["AA", "A", ""]:
                r = _comp(f"{prefix}{num}")
                if r:
                    return r
            # Cast alloy nearest fallback
            if num.isdigit():
                num_int = int(num)
                for offset in [-3, 3, -10, 10, -20, 20]:
                    r = _comp(f"AA{num_int + offset}")
                    if r:
                        return r

    # ── Strategy 22: Boron steels (10Bxx, 15Bxx) ─────────────────────
    boron_m = re.search(r"\b(\d{2}B\d{2})\b", name)
    if boron_m:
        bcode = boron_m.group(1)
        r = _comp(bcode)
        if r:
            return r
        # Fallback: strip B → plain carbon equivalent
        plain = bcode.replace("B", "")
        r = _comp(plain)
        if r:
            return r

    # ── Strategy 23: JIS designation resolution ────────────────────
    jis_m = re.search(r"\b(S\d{2}C|SCM\d{3}|SNCM\d{3}|SK\d+|SKD\d+|SKH\d+|SUJ\d|SUS\d{3}[A-Z]?|FC\d{3}|FCD\d{3})\b", name)
    if jis_m:
        jis_code = jis_m.group(1)
        r = _comp(jis_code)
        if r:
            return r

    # ── Strategy 24: German DIN cast iron (GG20, GGG40) ────────────
    gg_m = re.search(r"\b(GGG?)(\d{2,3})\b", name)
    if gg_m:
        prefix = gg_m.group(1)
        num = int(gg_m.group(2))
        if prefix == "GG":
            # GG20 = Gray Iron Class 20
            r = _comp(f"Gray Iron Class {num}")
            if r:
                return r
        elif prefix == "GGG":
            # GGG40 = Ductile 60-40-18, GGG50 = Ductile 65-45-12, etc.
            _ggg_map = {40: "Ductile 60-40-18", 50: "Ductile 65-45-12",
                        60: "Ductile 80-55-06", 70: "Ductile 100-70-03"}
            dk = _ggg_map.get(num)
            if dk:
                r = _comp(dk)
                if r:
                    return r

    # ── Strategy 25: AR plate (Abrasion Resistant) ─────────────────
    ar_m = re.search(r"\bAR\s*(\d{3}[A-Z]?)\b", name)
    if ar_m:
        r = _comp(f"AR{ar_m.group(1)}")
        if r:
            return r

    # ── Strategy 26: ZA zinc-aluminum alloys ───────────────────────
    za_m = re.search(r"\bZA[- ]?(\d+)\b", name)
    if za_m:
        r = _comp(f"ZA-{za_m.group(1)}")
        if r:
            return r

    # ── Strategy 27: Dual Phase / AHSS automotive steels ───────────
    dp_m = re.search(r"(?:DUAL\s*PHASE|DP)\s*(\d{3,4})", name)
    if dp_m:
        r = _comp(f"DualPhase{dp_m.group(1)}")
        if r:
            return r

    # ── Strategy 28: Ductile iron underscore format ────────────────
    # "DUCTILE 60 40 18" or "DUCTILE60_40_18"
    duct_m = re.search(r"DUCTILE\s*(\d+)\s+(\d+)\s+(\d+)", name)
    if duct_m:
        dk = f"Ductile {duct_m.group(1)}-{duct_m.group(2)}-{duct_m.group(3)}"
        r = _comp(dk)
        if r:
            return r

    # ── Strategy 29: 27-7MO / XM-19 specialty stainless ───────────
    mo_m = re.search(r"(\d+)[- ](\d+)[- ]?MO", name)
    if mo_m:
        key = f"{mo_m.group(1)}-{mo_m.group(2)}MO"
        r = _comp(key)
        if r:
            return r

    # ── Strategy 30: SA/ASME pressure vessel grades ──────────────
    # "SA-516 Grade 70", "SA516 GR 60", "ASME SA-516-70", "SA387 Grade 22"
    sa_m = re.search(r"SA[- ]?(\d{3})[- ]*(?:GR(?:ADE)?\s*)?(\d{1,3})?", name)
    if sa_m:
        spec = sa_m.group(1)
        grade = sa_m.group(2)
        if grade:
            r = _comp(f"SA{spec}-{grade}")
            if r:
                return r
        # Without grade -> defaults
        defaults = {"516": "SA516-70", "387": "SA387-22"}
        if spec in defaults:
            r = _comp(defaults[spec])
            if r:
                return r

    # ── Strategy 31: Cryogenic nickel steels ──────────────────────
    # "9% Nickel Steel", "3.5 Ni Steel", "5 Nickel Cryogenic"
    cryo_m = re.search(r"(\d+\.?\d*)\s*%?\s*(?:NI(?:CKEL)?)\b", name)
    if cryo_m:
        pct = cryo_m.group(1)
        for key in [f"{pct}Ni", pct + "Ni", f"{int(float(pct))}Ni"]:
            r = _comp(key)
            if r:
                return r

    # ── Strategy 32: Q&P / TRIP / CP / MS AHSS steels ────────────
    # "Q&P 980", "QP-1180", "TRIP 780", "CP 800", "MS 1500"
    ahss_m = re.search(r"(Q&?P|TRIP|CP|MS|COMPLEX\s*PHASE|MARTENSITIC\s*STEEL)\s*[-_ ]?\s*(\d{3,4})", name)
    if ahss_m:
        prefix_raw = ahss_m.group(1).strip()
        grade = ahss_m.group(2)
        prefix_map = {"Q&P": "QP", "QP": "QP", "TRIP": "TRIP", "CP": "CP",
                      "MS": "MS", "COMPLEX PHASE": "CP", "MARTENSITIC STEEL": "MS",
                      "COMPLEXPHASE": "CP", "MARTENSITICSTEEL": "MS"}
        pfx = prefix_map.get(prefix_raw.replace(" ", ""), prefix_raw.replace("&", "").replace(" ", ""))
        r = _comp(f"{pfx}{grade}")
        if r:
            return r

    # ── Strategy 33: Copper short CDA codes (C110 -> Cu C11000) ──
    # Materials dir uses "C110", "C360", "C172" etc. (3-digit CDA shorthand)
    cu_short_m = re.search(r"\bC(\d{3})\b", name)
    if cu_short_m and ("COPPER" in name or "BRONZE" in name or "BRASS" in name
                       or mat.get("iso_group", "") == "N_NONFERROUS"):
        short = cu_short_m.group(1)
        # Expand: C360 -> C36000, C172 -> C17200
        expanded = f"Cu C{short}00"
        r = _comp(expanded)
        if r:
            return r
        # Also try direct
        r = _comp(f"C{short}00")
        if r:
            return r

    # ── Strategy 34: Rail steel grades ────────────────────────────
    # "Rail Steel R260", "Rail R350HT", "UIC 900A"
    rail_m = re.search(r"(?:RAIL|UIC)\s*(?:STEEL\s*)?([A-Z]?\d{3,4}[A-Z]*)", name)
    if rail_m:
        rcode = rail_m.group(1)
        r = _comp(rcode)
        if r:
            return r

    # ── Strategy 35: 12% Cr valve/turbine steels (F91, 422, X20) ─
    if "VALVE" in name or "TURBINE" in name or "STEAM" in name or "CREEP" in name:
        for vk in ["F91", "422", "F22", "F11", "F9"]:
            if vk in base:
                r = _comp(vk)
                if r:
                    return r

    # ── Strategy 36: Electrical / silicon steel (M6, M19, M36) ───
    elec_m = re.search(r"\bM(\d+)\b", name)
    if elec_m and ("ELECTRIC" in name or "SILICON" in name or "GRAIN" in name
                   or "LAMINATION" in name or "TRANSFORMER" in name):
        r = _comp(f"M{elec_m.group(1)}")
        if r:
            return r

    # ── Strategy 37: Armor/ballistic plate brands ─────────────────
    for brand in ["BISALLOY", "ARMOX", "RAMOR", "HARDOX"]:
        bm = re.search(rf"{brand}\s*(\d{{3,4}}[A-Z]?)", name)
        if bm:
            r = _comp(f"{brand.capitalize()}{bm.group(1)}")
            if r:
                return r

    # ── Strategy 38: Knife / blade steel by name ──────────────────
    for ks_name, ks_key in [("154CM", "154CM"), ("154 CM", "154CM"),
                            ("ATS-34", "154CM"), ("ATS34", "154CM"),
                            ("VG-10", "VG-10"), ("VG10", "VG-10"),
                            ("CPM S35VN", "CPMS35VN"), ("S35VN", "CPMS35VN"),
                            ("CPM 20CV", "CPM20CV"), ("20CV", "CPM20CV"),
                            ("M390", "CPM20CV"),  # Bohler M390 ≈ CPM 20CV
                            ("CTS-204P", "CPM20CV"),
                            ("ELMAX", "Elmax")]:
        if ks_name in name:
            r = _comp(ks_key)
            if r:
                return r

    # ── Strategy 39: Generic numeric fallback for stainless (3xx) ─
    # Catches "STAINLESS 321H" etc. that didn't match earlier
    if "STAINLESS" in name or "SS " in name or mat.get("iso_group", "") == "M_STAINLESS":
        ss_m = re.search(r"\b([2-5]\d{2}[A-Z]{0,3})\b", base)
        if ss_m:
            code = ss_m.group(1)
            r = _comp(code)
            if r:
                return r
            # Strip all trailing letters
            digits_only = re.match(r"(\d+)", code)
            if digits_only:
                r = _comp(digits_only.group(1))
                if r:
                    return r

    return None


def enrich_composition(mat: dict, comp: dict, corrections: list):
    """Add composition data to material and optionally refine density from it."""
    if not comp:
        return

    existing_comp = mat.get("composition", {})
    if not existing_comp or not isinstance(existing_comp, dict):
        mat["composition"] = dict(comp)
        corrections.append("composition: added from standard specs")
    elif len(existing_comp) < len(comp):
        mat["composition"] = dict(comp)
        corrections.append(f"composition: enriched ({len(existing_comp)} -> {len(comp)} elements)")

    phys = mat.get("physical", {})
    if not isinstance(phys, dict):
        return

    is_ferrous = comp.get("Fe", 0) > 50 or (
        sum(v for k, v in comp.items() if k not in ("Fe",)) < 50 and
        not any(comp.get(e, 0) > 50 for e in ["Al", "Cu", "Ni", "Ti", "Mg", "Co", "W"]))

    if is_ferrous:
        current_rho = _num(phys.get("density", 0))
        calc_rho = calc_density_steel(comp)
        if current_rho <= 0:
            phys["density"] = calc_rho * 1000 if current_rho == 0 else calc_rho
            corrections.append(f"density: calculated {calc_rho:.3f} g/cc from composition")


# ══════════════════════════════════════════════════════════════════════════════
# VALIDATION AND CORRECTION FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def validate_and_correct_physical(mat: dict, verified: dict, corrections: list):
    """Correct physical properties from verified database."""
    phys = mat.setdefault("physical", {})
    if not isinstance(phys, dict):
        return

    # Density
    v_density = verified.get("density")
    if v_density:
        current = _num(phys.get("density", 0))
        # Convert g/cm3 to kg/m3 if stored that way
        if current > 1000:
            current_gcc = current / 1000.0
        else:
            current_gcc = current
        if current_gcc <= 0 or abs(current_gcc - v_density) / v_density > 0.05:
            if current > 1000:
                phys["density"] = v_density * 1000  # keep kg/m3 format
            else:
                phys["density"] = v_density
            corrections.append(f"density: {current_gcc:.2f} -> {v_density}")

    # Thermal conductivity
    v_k = verified.get("thermal_cond")
    if v_k:
        current = _num(phys.get("thermal_conductivity", 0))
        if current > 0:
            if abs(current - v_k) / v_k > 0.20:
                phys["thermal_conductivity"] = v_k
                corrections.append(f"thermal_conductivity: {current:.1f} -> {v_k}")
        else:
            phys["thermal_conductivity"] = v_k
            corrections.append(f"thermal_conductivity: set to {v_k}")

    # Specific heat
    v_cp = verified.get("specific_heat")
    if v_cp:
        current = _num(phys.get("specific_heat", 0))
        if current > 0:
            if abs(current - v_cp) / v_cp > 0.15:
                phys["specific_heat"] = v_cp
                corrections.append(f"specific_heat: {current:.0f} -> {v_cp}")
        else:
            phys["specific_heat"] = v_cp
            corrections.append(f"specific_heat: set to {v_cp}")

    # Elastic modulus
    v_e = verified.get("elastic_mod")
    if v_e:
        current = _num(phys.get("elastic_modulus", 0))
        if current > 0:
            # Could be in GPa or MPa
            if current > 1000:  # stored in MPa
                current_gpa = current / 1000.0
            else:
                current_gpa = current
            if abs(current_gpa - v_e) / v_e > 0.10:
                if current > 1000:
                    phys["elastic_modulus"] = v_e * 1000
                else:
                    phys["elastic_modulus"] = v_e
                corrections.append(f"elastic_modulus: {current_gpa:.0f} -> {v_e} GPa")
        else:
            phys["elastic_modulus"] = v_e * 1000  # store in MPa
            corrections.append(f"elastic_modulus: set to {v_e} GPa")

    # Melting temperatures
    v_sol = verified.get("solidus")
    v_liq = verified.get("liquidus")
    if v_sol:
        current = _num(phys.get("solidus_temperature", phys.get("melting_point", 0)))
        if current > 0:
            if abs(current - v_sol) / v_sol > 0.05:
                phys["solidus_temperature"] = v_sol
                if "melting_point" in phys:
                    phys["melting_point"] = v_sol
                corrections.append(f"solidus: {current:.0f} -> {v_sol}")
        else:
            phys["solidus_temperature"] = v_sol
            phys["melting_point"] = v_sol
    if v_liq:
        current = _num(phys.get("liquidus_temperature", 0))
        if current > 0:
            if abs(current - v_liq) / v_liq > 0.05:
                phys["liquidus_temperature"] = v_liq
                corrections.append(f"liquidus: {current:.0f} -> {v_liq}")
        else:
            phys["liquidus_temperature"] = v_liq


def validate_and_correct_mechanical(mat: dict, verified: dict, corrections: list):
    """Cross-validate mechanical properties against verified data."""
    mech = mat.setdefault("mechanical", {})
    if not isinstance(mech, dict):
        return

    # Hardness
    v_bhn = verified.get("hardness_bhn")
    if v_bhn:
        h = mech.get("hardness", {})
        if isinstance(h, dict):
            current = _num(h.get("brinell", 0))
            if not current or current <= 0:
                h["brinell"] = v_bhn
                mech["hardness"] = h
                corrections.append(f"hardness_bhn: set to {v_bhn}")

    # UTS - only set if missing or wildly off
    v_uts = verified.get("uts_annealed")
    if v_uts:
        ts = mech.get("tensile_strength", {})
        if isinstance(ts, dict):
            current = ts.get("typical", ts.get("min", 0))
        elif isinstance(ts, (int, float)):
            current = ts
        else:
            current = 0

    # Yield - validate J-C A parameter against verified yield
    v_yield = verified.get("yield_annealed")
    if v_yield and v_yield > 0:
        jc = mat.get("johnson_cook", {})
        if not isinstance(jc, dict):
            jc = {}
        jc_a = _num(jc.get("A", 0))
        if jc_a > 0:
            # J-C A should be within 0.5x - 2.0x of annealed yield
            # (depends on condition: Q&T has higher yield than annealed)
            ratio = jc_a / v_yield
            if ratio > 3.0:
                # A is way too high relative to annealed yield
                # Check if material might be in hardened condition
                name = mat.get("name", "").upper()
                if any(x in name for x in ["Q&T", "QUENCH", "TEMPER", "HRC", "HARD"]):
                    pass  # Expected: hardened materials have higher yield
                else:
                    old_a = jc_a
                    jc["A"] = round(v_yield * 1.2, 1)  # slight overshoot for strain rate
                    corrections.append(f"jc_A: {old_a:.0f} -> {jc['A']:.0f} (was {ratio:.1f}x annealed yield)")
            elif ratio < 0.3:
                # A is way too low
                old_a = jc_a
                jc["A"] = round(v_yield * 0.8, 1)
                corrections.append(f"jc_A: {old_a:.0f} -> {jc['A']:.0f} (was only {ratio:.1f}x yield)")


def validate_jc_ab_vs_uts(mat: dict, verified: dict, corrections: list):
    """Cross-validate J-C (A + B*0.2^n) against UTS within 30%.
    The Considère criterion: at necking strain ε ≈ n, flow stress ≈ A + B*n^n.
    For engineering check, use ε=0.2 as representative plastic strain at UTS."""
    jc = mat.get("johnson_cook", {})
    if not isinstance(jc, dict):
        return

    A = _num(jc.get("A", 0))
    B = _num(jc.get("B", 0))
    n = _num(jc.get("n", 0))
    if A <= 0 or B <= 0 or n <= 0 or n >= 1:
        return

    # Get UTS from verified data or from material's own mechanical props
    v_uts = 0
    if verified:
        v_uts = verified.get("uts_annealed", 0) or 0
    if v_uts <= 0:
        mech = mat.get("mechanical", {})
        if isinstance(mech, dict):
            ts = mech.get("tensile_strength", {})
            if isinstance(ts, dict):
                v_uts = _num(ts.get("typical", ts.get("min", 0)))
            elif isinstance(ts, (int, float)):
                v_uts = ts
    if v_uts <= 0:
        return

    # Calculate approximate flow stress at representative strain
    # Use Considère criterion: necking at ε=n, so σ_UTS ≈ A + B*n^n
    # Also check the simpler A + B*0.2^n estimate
    sigma_02 = A + B * (0.2 ** n)
    sigma_neck = A + B * (n ** n)

    # Use whichever is closer to UTS as the model estimate
    est_uts = min(sigma_02, sigma_neck)

    ratio = est_uts / v_uts

    # Hardened materials can have much higher yield than annealed UTS
    name = mat.get("name", "").upper()
    is_hardened = any(x in name for x in ["Q&T", "QUENCH", "TEMPER", "HRC", "HARD", "STA", "AGED"])

    if is_hardened:
        # For hardened materials, allow much wider range (yield >> annealed UTS)
        return

    if ratio > 1.5:
        # A+B estimate way above UTS — B is too high
        # Scale B so that A + B*n^n ≈ UTS * 1.1
        target_uts = v_uts * 1.1
        new_B = max(50, round((target_uts - A) / max(n ** n, 0.01), 1))
        if new_B != B:
            old_est = est_uts
            jc["B"] = new_B
            corrections.append(f"jc_B: {B:.0f} -> {new_B:.0f} (A+B*n^n={old_est:.0f} vs UTS={v_uts:.0f})")
    elif ratio < 0.5 and not is_hardened:
        # A+B estimate way below UTS — B is too low
        target_uts = v_uts * 0.95
        new_B = max(50, round((target_uts - A) / max(n ** n, 0.01), 1))
        if new_B != B:
            old_est = est_uts
            jc["B"] = new_B
            corrections.append(f"jc_B: {B:.0f} -> {new_B:.0f} (A+B*n^n={old_est:.0f} vs UTS={v_uts:.0f})")


def _num(val, default=0):
    """Safely extract a numeric value, returning default if dict/None/str."""
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, dict):
        return val.get("typical", val.get("value", val.get("min", default)))
    return default


def validate_jc_bounds(mat: dict, corrections: list):
    """Validate J-C parameters are within physical bounds."""
    jc = mat.get("johnson_cook", {})
    if not jc or not isinstance(jc, dict):
        return

    changed = False
    A = _num(jc.get("A", 0))
    B = _num(jc.get("B", 0))
    n = _num(jc.get("n", 0))
    C = _num(jc.get("C", 0))
    m = _num(jc.get("m", 0))

    # Bound checks
    if n <= 0 or n >= 1:
        jc["n"] = max(0.05, min(0.95, n))
        corrections.append(f"jc_n: {n:.4f} -> {jc['n']:.4f} (out of 0-1 range)")
        changed = True
    if C < 0 or C > 0.3:
        jc["C"] = max(0.001, min(0.25, C))
        corrections.append(f"jc_C: {C:.4f} -> {jc['C']:.4f} (out of 0-0.3 range)")
        changed = True
    if m < 0.3 or m > 3.0:
        jc["m"] = max(0.4, min(2.5, m))
        corrections.append(f"jc_m: {m:.2f} -> {jc['m']:.2f} (out of 0.3-3.0 range)")
        changed = True
    if A <= 0:
        corrections.append(f"jc_A: {A:.0f} is non-positive (invalid)")
    if B <= 0:
        corrections.append(f"jc_B: {B:.0f} is non-positive (invalid)")

    # Cross-check: T_melt vs physical solidus
    t_melt = _num(jc.get("T_melt", 0))
    phys = mat.get("physical", {})
    if not isinstance(phys, dict):
        phys = {}
    solidus = _num(phys.get("solidus_temperature", phys.get("melting_point", 0)))
    if t_melt > 0 and solidus > 0 and abs(t_melt - solidus) / solidus > 0.10:
        jc["T_melt"] = solidus
        corrections.append(f"jc_T_melt: {t_melt:.0f} -> {solidus:.0f} (match solidus)")


def validate_kienzle_vs_uts(mat: dict, corrections: list):
    """Validate kc1.1 against UTS correlation: kc1.1 ≈ 2.5-4.0 × UTS for metals."""
    kz = mat.get("kienzle", {})
    if not isinstance(kz, dict):
        return
    kc11 = _num(kz.get("kc1_1", 0))
    if kc11 <= 0:
        return

    mech = mat.get("mechanical", {})
    ts = mech.get("tensile_strength", {})
    if isinstance(ts, dict):
        uts = ts.get("typical", ts.get("min", 0))
    elif isinstance(ts, (int, float)):
        uts = ts
    else:
        uts = 0

    if uts <= 0:
        return

    iso = mat.get("iso_group", "")
    ratio = kc11 / uts

    # Expected ratios by ISO group
    expected = {
        "P": (2.0, 5.0),
        "M": (2.5, 6.0),
        "K": (1.5, 5.0),
        "N": (2.0, 6.0),
        "S": (2.5, 6.0),
        "H": (3.0, 7.0),
    }
    low, high = expected.get(iso, (1.5, 7.0))

    if ratio < low * 0.8:
        # kc1.1 too low relative to UTS
        new_kc = round(uts * (low + high) / 2, 1)
        kz["kc1_1"] = new_kc
        corrections.append(f"kc1.1: {kc11:.0f} -> {new_kc:.0f} (ratio {ratio:.1f} < {low})")
    elif ratio > high * 1.2:
        # kc1.1 too high
        new_kc = round(uts * (low + high) / 2, 1)
        kz["kc1_1"] = new_kc
        corrections.append(f"kc1.1: {kc11:.0f} -> {new_kc:.0f} (ratio {ratio:.1f} > {high})")


def validate_cutting_speeds(mat: dict, corrections: list):
    """Validate cutting speeds against published catalog ranges."""
    cr = mat.get("cutting_recommendations", {})
    if not isinstance(cr, dict):
        return
    turn = cr.get("turning", {})
    if not isinstance(turn, dict):
        return
    v_rough = _num(turn.get("speed_roughing", 0))
    if v_rough <= 0:
        return

    iso = mat.get("iso_group", "")
    # Carbide turning speed ranges (m/min) from Sandvik general recommendations
    speed_ranges = {
        "P": (80, 500),
        "M": (60, 300),
        "K": (80, 400),
        "N": (200, 2000),
        "S": (15, 80),
        "H": (40, 200),
        "X": (10, 600),
    }
    low, high = speed_ranges.get(iso, (10, 600))

    if v_rough < low * 0.5:
        new_v = round(low * 0.8, 1)
        turn["speed_roughing"] = new_v
        turn["speed_finishing"] = round(new_v * 1.8, 1)
        corrections.append(f"V_rough: {v_rough:.0f} -> {new_v:.0f} (below range {low})")
    elif v_rough > high * 1.5:
        new_v = round(high * 0.8, 1)
        turn["speed_roughing"] = new_v
        turn["speed_finishing"] = round(new_v * 1.8, 1)
        corrections.append(f"V_rough: {v_rough:.0f} -> {new_v:.0f} (above range {high})")


def validate_internal_consistency(mat: dict, corrections: list):
    """Cross-check internal consistency of physical/mechanical/JC properties."""
    phys = mat.get("physical", {})
    mech = mat.get("mechanical", {})
    jc = mat.get("johnson_cook", {})
    iso = mat.get("iso_group", "")
    if not isinstance(phys, dict) or not isinstance(mech, dict):
        return

    # Check 1: Density within expected range for ISO group
    density = _num(phys.get("density", 0))
    if density > 100:  # kg/m³
        density_gcc = density / 1000.0
    else:
        density_gcc = density
    density_ranges = {
        "P": (7.5, 8.2), "M": (7.5, 8.2), "K": (6.8, 7.8),
        "H": (7.5, 8.5), "S": (4.0, 9.0), "N": (1.7, 9.0), "X": (0.5, 20.0),
    }
    low_rho, high_rho = density_ranges.get(iso, (0.5, 20.0))
    if density_gcc > 0 and (density_gcc < low_rho or density_gcc > high_rho):
        # Clamp to nearest bound
        new_rho = max(low_rho, min(high_rho, density_gcc))
        if density > 100:
            phys["density"] = new_rho * 1000
        else:
            phys["density"] = new_rho
        corrections.append(f"density: {density_gcc:.2f} -> {new_rho:.2f} g/cc (out of {iso} range)")

    # Check 2: Hardness-yield consistency (Tabor: yield ≈ BHN/3 in MPa for steels)
    h = mech.get("hardness", {})
    if isinstance(h, dict):
        bhn = _num(h.get("brinell", 0))
        if bhn > 0 and isinstance(jc, dict):
            jc_a = _num(jc.get("A", 0))
            if jc_a > 0 and iso in ("P", "M", "H"):
                # Tabor relation: yield ≈ BHN * 3.45 (in MPa)
                expected_yield = bhn * 3.45
                ratio = jc_a / expected_yield
                if ratio > 3.0 or ratio < 0.15:
                    # Extreme mismatch — likely wrong hardness or A
                    corrections.append(
                        f"consistency: JC_A={jc_a:.0f} vs BHN*3.45={expected_yield:.0f} "
                        f"(ratio {ratio:.2f}) — flagged")

    # Check 3: J-C A should not exceed UTS (for annealed condition)
    ts = mech.get("tensile_strength", {})
    if isinstance(ts, dict):
        uts = _num(ts.get("typical", ts.get("min", 0)))
    elif isinstance(ts, (int, float)):
        uts = ts
    else:
        uts = 0
    if uts > 0 and isinstance(jc, dict):
        jc_a = _num(jc.get("A", 0))
        if jc_a > uts * 1.5:
            name = mat.get("name", "").upper()
            is_hardened = any(x in name for x in ["Q&T", "QUENCH", "TEMPER", "HRC", "HARD", "STA", "AGED"])
            if not is_hardened:
                old_a = jc_a
                jc["A"] = round(uts * 0.85, 1)
                corrections.append(f"jc_A: {old_a:.0f} -> {jc['A']:.0f} (exceeded UTS={uts:.0f})")

    # Check 4: Elastic modulus in expected range
    e_mod = _num(phys.get("elastic_modulus", 0))
    if e_mod > 0:
        if e_mod > 1000:  # stored in MPa
            e_gpa = e_mod / 1000
        else:
            e_gpa = e_mod
        e_ranges = {
            "P": (180, 220), "M": (170, 220), "K": (80, 190),
            "H": (180, 230), "S": (90, 240), "N": (40, 140), "X": (0.1, 500),
        }
        low_e, high_e = e_ranges.get(iso, (0.1, 500))
        if e_gpa < low_e * 0.7 or e_gpa > high_e * 1.3:
            new_e = (low_e + high_e) / 2
            if e_mod > 1000:
                phys["elastic_modulus"] = new_e * 1000
            else:
                phys["elastic_modulus"] = new_e
            corrections.append(f"E_mod: {e_gpa:.0f} -> {new_e:.0f} GPa (out of {iso} range)")


def update_confidence(mat: dict, verified_match: bool, corrections: list,
                      has_composition: bool = False):
    """Update confidence tags with honest, granular categories."""
    acc = mat.get("_accuracy", {})
    acc["pass"] = "deep_accuracy_v2"
    acc["date"] = datetime.now().strftime("%Y-%m-%d")
    acc["v2_corrections"] = len(corrections)
    acc["has_composition"] = has_composition

    if verified_match:
        acc["physical_properties"] = {"confidence": "VERIFIED", "source": "web_database"}
    else:
        acc["physical_properties"] = acc.get("physical_properties",
            {"confidence": "PARAMETRIC_MODEL", "source": "composition_or_group"})

    # Retag J-C confidence with honest labels
    jc_acc = acc.get("johnson_cook", {})
    jc_src = jc_acc.get("source", "")
    if "Interpolated" in jc_src or "Derived" in jc_src:
        jc_acc["confidence"] = "INTERPOLATED"
    elif "Subcategory" in jc_src:
        jc_acc["confidence"] = "SUBCATEGORY_SPECIFIC"

    # Retag Kienzle
    kz_acc = acc.get("kienzle", {})
    kz_src = kz_acc.get("source", "")
    if "HB_scaled" in kz_src:
        kz_acc["confidence"] = "SUBCATEGORY_SPECIFIC"
    elif "VDI3323" in kz_src:
        kz_acc["confidence"] = "SUBCATEGORY_SPECIFIC"

    # Recalculate overall
    conf_score = {"VERIFIED": 5, "PUBLISHED": 4, "HIGH": 4,
                  "INTERPOLATED": 3, "SUBCATEGORY_SPECIFIC": 3, "MEDIUM_HIGH": 3,
                  "PARAMETRIC_MODEL": 2, "MEDIUM": 2,
                  "GROUP_DEFAULT": 1, "LOW": 1}
    scores = []
    for prop in ["johnson_cook", "kienzle", "taylor", "chip_formation",
                 "cutting_recommendations", "tribology", "surface_integrity",
                 "thermal_machining", "physical_properties"]:
        p = acc.get(prop, {})
        if isinstance(p, dict):
            c = p.get("confidence", "LOW")
            scores.append(conf_score.get(c, 1))

    if scores:
        avg = sum(scores) / len(scores)
        if avg >= 4.0:
            acc["overall_confidence"] = "VERIFIED"
        elif avg >= 3.0:
            acc["overall_confidence"] = "SUBCATEGORY_SPECIFIC"
        elif avg >= 2.0:
            acc["overall_confidence"] = "PARAMETRIC_MODEL"
        else:
            acc["overall_confidence"] = "GROUP_DEFAULT"

    # Floor: verified DB match guarantees at least SUBCATEGORY_SPECIFIC
    if verified_match and acc.get("overall_confidence") in ("PARAMETRIC_MODEL", "GROUP_DEFAULT"):
        acc["overall_confidence"] = "SUBCATEGORY_SPECIFIC"

    mat["_accuracy"] = acc

    # Update data quality
    oc = acc["overall_confidence"]
    if oc in ("VERIFIED",):
        mat["data_quality"] = "verified"
    elif oc in ("SUBCATEGORY_SPECIFIC", "PUBLISHED", "INTERPOLATED"):
        mat["data_quality"] = "reference"
    elif oc in ("PARAMETRIC_MODEL",):
        mat["data_quality"] = "calculated"
    else:
        mat["data_quality"] = "estimated"

    sources = mat.get("data_sources", [])
    if not isinstance(sources, list):
        sources = []
    if "deep_accuracy_v2" not in sources:
        sources.append("deep_accuracy_v2")
    mat["data_sources"] = sources


# ══════════════════════════════════════════════════════════════════════════════
# PIPELINE
# ══════════════════════════════════════════════════════════════════════════════

def process_material(mat: dict) -> dict:
    """Run v2 validation and correction on a single material."""
    corrections = []

    # Step 1: Try to match to verified properties database
    verified = find_verified_props(mat)
    verified_match = verified is not None

    # Step 1b: Composition enrichment
    comp = find_composition(mat)
    if comp:
        enrich_composition(mat, comp, corrections)

    # Step 2: Correct physical properties from verified data
    if verified:
        validate_and_correct_physical(mat, verified, corrections)
        validate_and_correct_mechanical(mat, verified, corrections)

    # Step 3: J-C parameter bounds check (all materials)
    validate_jc_bounds(mat, corrections)

    # Step 3b: A+B vs UTS cross-validation
    validate_jc_ab_vs_uts(mat, verified, corrections)

    # Step 4: Kienzle vs UTS correlation check
    validate_kienzle_vs_uts(mat, corrections)

    # Step 5: Cutting speed range validation
    validate_cutting_speeds(mat, corrections)

    # Step 5b: Internal consistency cross-checks
    validate_internal_consistency(mat, corrections)

    # Step 6: Update confidence with honest tags
    update_confidence(mat, verified_match, corrections, has_composition=comp is not None)

    # Step 7: Update param_count
    def _count_params(obj, depth=0):
        if depth > 5: return 0
        if isinstance(obj, dict):
            return sum(_count_params(v, depth+1) for k, v in obj.items() if not k.startswith('_'))
        elif isinstance(obj, list):
            return sum(_count_params(x, depth+1) for x in obj)
        elif obj is not None:
            return 1
        return 0
    mat["param_count"] = _count_params(mat)

    return {"verified_match": verified_match, "corrections": corrections,
            "has_composition": comp is not None}


def process_file(filepath: Path) -> dict:
    """Process all materials in a JSON file."""
    result = {"file": str(filepath), "materials": 0, "verified_matches": 0,
              "composition_matches": 0, "total_corrections": 0, "errors": []}

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        result["errors"].append(f"Read failed: {e}")
        return result

    materials = data.get("materials", [])
    if not materials or not isinstance(materials, list):
        return result

    result["materials"] = len(materials)

    for mat in materials:
        if not isinstance(mat, dict):
            continue
        try:
            info = process_material(mat)
            if info["verified_match"]:
                result["verified_matches"] += 1
            if info.get("has_composition"):
                result["composition_matches"] += 1
            result["total_corrections"] += len(info["corrections"])
        except Exception as e:
            result["errors"].append(f"{mat.get('name', '?')}: {e}")

    # Write back atomically
    try:
        tmp_path = filepath.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        tmp_path.replace(filepath)
    except (OSError, IOError) as e:
        result["errors"].append(f"Write failed: {e}")

    return result


def update_master_index():
    """Update MASTER_INDEX version."""
    if not MASTER_INDEX.exists():
        return
    try:
        with open(MASTER_INDEX, "r", encoding="utf-8") as f:
            data = json.load(f)
        meta = data.setdefault("metadata", {})
        meta["version"] = "10.2"
        meta["deep_accuracy_v2_pass"] = datetime.now().isoformat()
        tmp = MASTER_INDEX.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        tmp.replace(MASTER_INDEX)
        log.info("Updated MASTER_INDEX.json to version 10.2")
    except (json.JSONDecodeError, OSError) as e:
        log.error(f"Failed to update MASTER_INDEX: {e}")


def main():
    log.info("=" * 60)
    log.info("PRISM Materials Deep Accuracy Pass v2 — Validation & Correction")
    log.info(f"Verified properties database: {len(ALLOY_PHYSICAL_PROPERTIES)} alloys")
    log.info("=" * 60)
    start = datetime.now()

    json_files = []
    for cat_dir in CATEGORY_DIRS:
        cat_path = MATERIALS_ROOT / cat_dir
        if not cat_path.exists():
            continue
        for f in cat_path.iterdir():
            if f.suffix == ".json" and f.name not in SKIP_FILES:
                json_files.append(f)

    log.info(f"Found {len(json_files)} JSON files")

    results = []
    total_mat = total_verified = total_comp = total_corrections = total_errors = 0

    for i, fp in enumerate(sorted(json_files)):
        log.info(f"[{i+1}/{len(json_files)}] {fp.parent.name}/{fp.name}")
        r = process_file(fp)
        results.append(r)
        total_mat += r["materials"]
        total_verified += r["verified_matches"]
        total_comp += r.get("composition_matches", 0)
        total_corrections += r["total_corrections"]
        total_errors += len(r["errors"])

    update_master_index()

    elapsed = (datetime.now() - start).total_seconds()

    # Confidence distribution
    conf_dist = {}
    for fp in sorted(json_files):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
            for mat in data.get("materials", []):
                oc = mat.get("_accuracy", {}).get("overall_confidence", "UNKNOWN")
                conf_dist[oc] = conf_dist.get(oc, 0) + 1
        except (json.JSONDecodeError, OSError):
            pass

    log.info("")
    log.info("=" * 60)
    log.info("SUMMARY")
    log.info("=" * 60)
    log.info(f"Files processed:       {len(json_files)}")
    log.info(f"Materials processed:   {total_mat}")
    log.info(f"Verified DB matches:   {total_verified} ({total_verified*100/max(total_mat,1):.1f}%)")
    log.info(f"Composition matches:   {total_comp} ({total_comp*100/max(total_mat,1):.1f}%)")
    log.info(f"Total corrections:     {total_corrections}")
    log.info(f"Errors:                {total_errors}")
    log.info(f"Elapsed:               {elapsed:.1f}s")
    log.info("")
    log.info("Confidence Distribution (v2 honest tags):")
    for level in ["VERIFIED", "SUBCATEGORY_SPECIFIC", "PARAMETRIC_MODEL", "GROUP_DEFAULT", "UNKNOWN"]:
        count = conf_dist.get(level, 0)
        pct = count * 100 / max(total_mat, 1)
        if count > 0:
            log.info(f"  {level:25s}: {count:5d} ({pct:5.1f}%)")

    # Write log
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "version": "deep_accuracy_v2",
        "verified_db_size": len(ALLOY_PHYSICAL_PROPERTIES),
        "total_files": len(json_files),
        "total_materials": total_mat,
        "verified_matches": total_verified,
        "composition_matches": total_comp,
        "total_corrections": total_corrections,
        "total_errors": total_errors,
        "elapsed_seconds": elapsed,
        "confidence_distribution": conf_dist,
        "files": results,
    }
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        log.info(f"\nLog: {LOG_FILE}")
    except (OSError, IOError) as e:
        log.error(f"Failed to write log: {e}")

    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
