#!/usr/bin/env python3
"""
fill-material-hardness.py
Fills missing hardness_HB (and hardness_HRC) across all 3,181 PRISM materials.

Two distinct JSON schemas are handled:
  Schema A (P_STEELS, M_STAINLESS, K_CAST_IRON, S_SUPERALLOYS):
    - mechanical.hardness.brinell / .rockwell_c / .vickers
    - mechanical.tensile_strength.typical
    - kienzle.kc1_1  (flat number)
    - condition (string)

  Schema B (H_HARDENED, N_NONFERROUS, X_SPECIALTY):
    - hardness_hb.value / hardness_hrc.value / hardness_hv.value
    - tensile_strength.value
    - kc1_1.value  (nested dict)
    - name contains condition clues

Priority for estimating hardness:
  1. Existing hardness_HB (or hardness_HRC -> convert) already populated  -> keep
  2. Tensile strength available  -> HB = tensile / ratio (group-dependent)
  3. Condition string implies range  -> use midpoint for alloy group
  4. Material name contains HRC/HB numbers  -> parse them
  5. Fallback to typical hardness for ISO group
"""

import json
import os
import re
import sys
import math
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(r"C:\PRISM\archives\materials-variants\materials_complete")

# --- Conversion tables ---

def hrc_to_hb(hrc):
    """ASTM E140 approximate conversion HRC -> HB (for steel)."""
    if hrc is None or hrc <= 0:
        return 0
    # Piecewise linear approximation of ASTM E140 table
    # HRC 20->226, 25->253, 30->286, 35->327, 40->371, 45->421,
    # 50->480, 55->560, 60->654, 65->739, 68->?? (extrapolate)
    table = [
        (20, 226), (21, 229), (22, 233), (23, 237), (24, 245),
        (25, 253), (26, 258), (27, 264), (28, 271), (29, 279),
        (30, 286), (31, 294), (32, 301), (33, 311), (34, 319),
        (35, 327), (36, 336), (37, 344), (38, 353), (39, 362),
        (40, 371), (41, 381), (42, 390), (43, 400), (44, 409),
        (45, 421), (46, 432), (47, 442), (48, 455), (49, 469),
        (50, 480), (51, 495), (52, 509), (53, 524), (54, 542),
        (55, 560), (56, 577), (57, 595), (58, 614), (59, 634),
        (60, 654), (61, 670), (62, 688), (63, 706), (64, 722),
        (65, 739), (66, 758), (67, 778), (68, 800),
    ]
    if hrc <= table[0][0]:
        return table[0][1]
    if hrc >= table[-1][0]:
        return table[-1][1]
    for i in range(len(table) - 1):
        if table[i][0] <= hrc <= table[i+1][0]:
            frac = (hrc - table[i][0]) / (table[i+1][0] - table[i][0])
            return int(round(table[i][1] + frac * (table[i+1][1] - table[i][1])))
    return 0

def hb_to_hrc(hb):
    """Approximate HB -> HRC (only valid for HB >= ~226 i.e. HRC >= 20)."""
    if hb is None or hb < 200:
        return None  # Below HRC range
    table = [
        (226, 20), (253, 25), (286, 30), (327, 35), (371, 40),
        (421, 45), (480, 50), (560, 55), (654, 60), (739, 65), (800, 68),
    ]
    if hb <= table[0][0]:
        return table[0][1]
    if hb >= table[-1][0]:
        return table[-1][1]
    for i in range(len(table) - 1):
        if table[i][0] <= hb <= table[i+1][0]:
            frac = (hb - table[i][0]) / (table[i+1][0] - table[i][0])
            return round(table[i][1] + frac * (table[i+1][1] - table[i][1]), 1)
    return None

def hv_to_hb(hv):
    """Approximate Vickers to Brinell. For HV < 350 they are nearly 1:1,
    above that Brinell diverges lower."""
    if hv is None or hv <= 0:
        return 0
    if hv <= 350:
        return int(round(hv * 0.95))
    else:
        return int(round(350 * 0.95 + (hv - 350) * 0.88))


# --- Tensile-to-HB ratios by ISO group ---
# For steels (P): HB ~ tensile_MPa / 3.45
# For stainless (M): HB ~ tensile_MPa / 3.55 (austenitic work-harden)
# For cast iron (K): HB ~ tensile_MPa / 2.5 (brittle, different relationship)
# For nonferrous (N): HB ~ tensile_MPa / 3.7 for Al, / 3.0 for Ti, / 3.5 general
# For superalloys (S): HB ~ tensile_MPa / 3.5
# For hardened (H): HB ~ tensile_MPa / 3.45 (same base steel)
# For specialty (X): HB ~ tensile_MPa / 3.45 (default steel-like)

TENSILE_TO_HB_RATIO = {
    "P": 3.45,
    "M": 3.55,
    "K": 2.5,
    "N": 3.5,
    "S": 3.5,
    "H": 3.45,
    "X": 3.45,
}

# --- Condition-based hardness defaults ---
# {iso_group: {condition_keyword: (HB_low, HB_high)}}
CONDITION_RANGES = {
    "P": {
        "annealed": (140, 200),
        "normalized": (170, 260),
        "quenched": (280, 400),
        "tempered": (200, 350),
        "hardened": (300, 450),
        "cold drawn": (180, 280),
        "cold worked": (200, 300),
        "hot rolled": (150, 230),
        "stress relieved": (170, 250),
        "as-rolled": (150, 230),
        "spring": (300, 450),
    },
    "M": {
        "annealed": (140, 200),
        "solution annealed": (140, 200),
        "solution treated": (140, 200),
        "cold worked": (200, 320),
        "cold drawn": (200, 320),
        "condition a": (140, 200),
        "condition h": (280, 390),
        "h900": (350, 420),
        "h925": (340, 400),
        "h1025": (310, 370),
        "h1050": (290, 350),
        "h1075": (280, 340),
        "h1100": (270, 330),
        "h1150": (260, 310),
        "aged": (280, 380),
        "overaged": (250, 310),
        "hardened": (280, 400),
        "quenched": (280, 400),
        "tempered": (200, 350),
        "martensitic": (250, 350),
        "ferritic": (140, 200),
        "austenitic": (140, 210),
        "duplex": (220, 310),
    },
    "K": {
        "as-cast": (150, 260),
        "annealed": (120, 190),
        "normalized": (160, 240),
        "stress relieved": (150, 250),
        "heat treated": (200, 320),
        "pearlitic": (200, 290),
        "ferritic": (120, 180),
        "austenitic": (120, 200),
        "martensitic": (250, 350),
    },
    "N": {
        "annealed": (20, 60),
        "o temper": (20, 50),
        "h temper": (50, 120),
        "t3": (80, 120),
        "t4": (80, 120),
        "t6": (100, 160),
        "t651": (100, 160),
        "t7": (90, 140),
        "as-cast": (40, 90),
        "cold worked": (50, 120),
        "solution treated": (60, 110),
        "aged": (80, 150),
        "mill annealed": (250, 350),  # titanium
        "sta": (300, 380),  # titanium solution treated + aged
    },
    "S": {
        "annealed": (200, 280),
        "solution annealed": (200, 280),
        "solution treated": (200, 280),
        "aged": (300, 420),
        "precipitation hardened": (300, 420),
        "as-cast": (250, 400),
        "hot rolled": (220, 310),
        "wrought": (220, 330),
    },
    "H": {
        "hardened": (450, 700),
        "quenched": (500, 700),
        "tempered": (400, 600),
    },
    "X": {
        "annealed": (140, 220),
        "as-built": (200, 350),
        "aged": (280, 420),
        "solution treated": (180, 280),
        "stress relieved": (200, 320),
    },
}

# --- Fallback defaults by ISO group ---
FALLBACK_HB = {
    "P": 220,   # middle of 150-350
    "M": 200,   # middle of 150-250 (austenitic default)
    "K": 200,   # middle of 150-300
    "N": 75,    # middle of 30-150
    "S": 300,   # middle of 250-400
    "H": 550,   # middle of 450-700 (hard steels)
    "X": 200,   # varies widely, pick middle-ish
}

# More specific fallbacks for subcategories detected from material_class or file path
SUBGROUP_FALLBACK_HB = {
    # Stainless subgroups
    "austenitic_stainless": 170,
    "ferritic_stainless": 170,
    "martensitic_stainless": 280,
    "duplex_stainless": 270,
    "ph_stainless": 320,
    # Cast iron subgroups
    "gray_iron": 200,
    "ductile_iron": 220,
    "malleable_iron": 180,
    "compacted_graphite": 210,
    # Nonferrous subgroups
    "aluminum": 60,
    "copper": 80,
    "titanium": 300,
    "magnesium": 55,
    "zinc": 80,
    # Steel subgroups
    "carbon_steel": 180,
    "alloy_steel": 230,
    "tool_steel": 280,
    "bearing_steel": 250,
    "spring_steel": 300,
    "free_machining": 170,
    "structural_steel": 190,
    # Specialty subgroups
    "polymer": 20,
    "engineering_polymer": 25,
    "composite": 30,
    "ceramic": 1200,  # ceramics are measured differently but we store HB equiv
    "graphite": 40,
    "wood": 15,
    "rubber": 10,
    "elastomer": 10,
    "honeycomb": 30,
    "additive_manufacturing": 300,
    "precious_metal": 60,
    "refractory": 250,
}


def parse_hrc_from_name(name):
    """Try to extract HRC value from material name like 'AISI 4140 28-32 HRC'."""
    if not name:
        return None
    # Pattern: digits-digits HRC or digits HRC
    m = re.search(r'(\d+)\s*[-–]\s*(\d+)\s*HRC', name, re.IGNORECASE)
    if m:
        return (int(m.group(1)) + int(m.group(2))) / 2
    m = re.search(r'(\d+)\s*HRC', name, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None

def parse_hb_from_name(name):
    """Try to extract HB value from material name."""
    if not name:
        return None
    m = re.search(r'(\d+)\s*[-–]\s*(\d+)\s*HB', name, re.IGNORECASE)
    if m:
        return (int(m.group(1)) + int(m.group(2))) / 2
    m = re.search(r'(\d+)\s*HB[NW]?(?:\s|$|,)', name, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


def detect_iso_group(mat, category_str):
    """Determine the ISO group letter from material data."""
    # Schema A has iso_group field
    if isinstance(mat.get("iso_group"), str) and mat["iso_group"] in "PMKNSHX":
        return mat["iso_group"]
    # Schema B: infer from category field or parent dir
    cat = category_str.upper()
    if "P_STEEL" in cat or cat.startswith("P"):
        return "P"
    if "M_STAINLESS" in cat or cat.startswith("M"):
        return "M"
    if "K_CAST" in cat or cat.startswith("K"):
        return "K"
    if "N_NONFERROUS" in cat or cat.startswith("N"):
        return "N"
    if "S_SUPER" in cat or cat.startswith("S"):
        return "S"
    if "H_HARD" in cat or cat.startswith("H"):
        return "H"
    return "X"


def detect_subgroup(mat, filepath_str):
    """Detect material subgroup from material_class, name, or file path for better fallbacks."""
    name = (mat.get("name") or "").lower()
    mat_class = (mat.get("material_class") or "").lower()
    fpath = filepath_str.lower()
    desc = (mat.get("description") or "").lower()
    combined = f"{name} {mat_class} {fpath} {desc}"

    # Stainless subtypes
    if "austenitic" in combined and "stainless" in combined:
        return "austenitic_stainless"
    if "ferritic" in combined and "stainless" in combined:
        return "ferritic_stainless"
    if "martensitic" in combined and "stainless" in combined:
        return "martensitic_stainless"
    if "duplex" in combined:
        return "duplex_stainless"
    if ("precipitation" in combined or "ph" in mat_class) and "stainless" in combined:
        return "ph_stainless"

    # Cast iron subtypes
    if "gray" in combined or "grey" in combined:
        return "gray_iron"
    if "ductile" in combined or "nodular" in combined or "sg_iron" in combined:
        return "ductile_iron"
    if "malleable" in combined:
        return "malleable_iron"
    if "compacted" in combined or "cgi" in combined:
        return "compacted_graphite"

    # Nonferrous subtypes
    if "aluminum" in combined or "aluminium" in combined or "al-" in name or "aa " in name:
        return "aluminum"
    if "copper" in combined or "bronze" in combined or "brass" in combined:
        return "copper"
    if "titanium" in combined or "ti-" in name or "ti " in name:
        return "titanium"
    if "magnesium" in combined or "mg" in mat_class:
        return "magnesium"
    if "zinc" in combined:
        return "zinc"

    # Steel subtypes (for P group)
    if "tool_steel" in fpath or "tool steel" in mat_class:
        return "tool_steel"
    if "bearing" in combined:
        return "bearing_steel"
    if "spring" in combined:
        return "spring_steel"
    if "free_machining" in fpath or "free machining" in mat_class:
        return "free_machining"
    if "structural" in combined:
        return "structural_steel"
    if "carbon_steel" in fpath or "carbon steel" in mat_class:
        return "carbon_steel"
    if "alloy_steel" in fpath or "alloy steel" in mat_class:
        return "alloy_steel"

    # Specialty subtypes
    if "polymer" in combined and "engineering" in combined:
        return "engineering_polymer"
    if "polymer" in combined or "plastic" in combined or "nylon" in combined:
        return "polymer"
    if "composite" in combined or "cfrp" in combined or "gfrp" in combined:
        return "composite"
    if "ceramic" in combined and "not" not in combined:
        return "ceramic"
    if "graphite" in combined:
        return "graphite"
    if "wood" in combined:
        return "wood"
    if "rubber" in combined:
        return "rubber"
    if "elastomer" in combined:
        return "elastomer"
    if "honeycomb" in combined:
        return "honeycomb"
    if "additive" in combined or "am " in combined or "3d print" in combined:
        return "additive_manufacturing"
    if "precious" in combined or "gold" in combined or "platinum" in combined:
        return "precious_metal"
    if "refractory" in combined or "tungsten" in mat_class or "molybdenum" in mat_class:
        return "refractory"

    return None


def get_condition_hb(condition_str, iso_group):
    """Look up HB range from condition keywords."""
    if not condition_str:
        return None
    cond = condition_str.lower().strip()
    ranges = CONDITION_RANGES.get(iso_group, {})

    # Try exact match first, then substring
    for keyword, (lo, hi) in sorted(ranges.items(), key=lambda x: -len(x[0])):
        if keyword in cond:
            return int(round((lo + hi) / 2))
    return None


# =========================================================================
# Schema A processing (P_STEELS, M_STAINLESS, K_CAST_IRON, S_SUPERALLOYS)
# =========================================================================
def process_schema_a(mat, iso_group, filepath_str, stats):
    """Process material with Schema A structure. Returns True if modified."""
    mech = mat.get("mechanical", {})
    hardness = mech.get("hardness", {})

    existing_hb = hardness.get("brinell")
    existing_hrc = hardness.get("rockwell_c")
    existing_hv = hardness.get("vickers")

    # 1. Already populated?
    if existing_hb and existing_hb > 0:
        # Already has HB. Check if HRC is missing and we can fill it.
        if not existing_hrc or existing_hrc <= 0:
            calc_hrc = hb_to_hrc(existing_hb)
            if calc_hrc is not None:
                hardness["rockwell_c"] = calc_hrc
        stats["existing"] += 1
        return False  # No HB change needed

    name = mat.get("name", "")
    condition = mat.get("condition", "")
    tensile = None
    ts_obj = mech.get("tensile_strength", {})
    if isinstance(ts_obj, dict):
        tensile = ts_obj.get("typical") or ts_obj.get("min")
    elif isinstance(ts_obj, (int, float)) and ts_obj > 0:
        tensile = ts_obj

    # 2. Convert from existing HRC or HV?
    if existing_hrc and existing_hrc > 0:
        hb = hrc_to_hb(existing_hrc)
        if hb > 0:
            hardness["brinell"] = hb
            stats["converted_hrc"] += 1
            return True

    if existing_hv and existing_hv > 0:
        hb = hv_to_hb(existing_hv)
        if hb > 0:
            hardness["brinell"] = hb
            hrc = hb_to_hrc(hb)
            if hrc is not None and (not existing_hrc or existing_hrc <= 0):
                hardness["rockwell_c"] = hrc
            stats["converted_hv"] += 1
            return True

    # 3. Derive from tensile strength?
    if tensile and tensile > 0:
        ratio = TENSILE_TO_HB_RATIO.get(iso_group, 3.45)
        hb = int(round(tensile / ratio))
        # Sanity clamp
        hb = max(80, min(hb, 800))
        hardness["brinell"] = hb
        hrc = hb_to_hrc(hb)
        if hrc is not None:
            hardness["rockwell_c"] = hrc
        stats["tensile"] += 1
        return True

    # 4. Parse from name?
    hrc_from_name = parse_hrc_from_name(name)
    if hrc_from_name:
        hb = hrc_to_hb(hrc_from_name)
        hardness["brinell"] = hb
        hardness["rockwell_c"] = hrc_from_name
        stats["name_parsed"] += 1
        return True

    hb_from_name = parse_hb_from_name(name)
    if hb_from_name and hb_from_name > 0:
        hardness["brinell"] = int(round(hb_from_name))
        hrc = hb_to_hrc(int(round(hb_from_name)))
        if hrc is not None:
            hardness["rockwell_c"] = hrc
        stats["name_parsed"] += 1
        return True

    # 5. Derive from condition?
    cond_hb = get_condition_hb(condition, iso_group)
    if cond_hb:
        hardness["brinell"] = cond_hb
        hrc = hb_to_hrc(cond_hb)
        if hrc is not None:
            hardness["rockwell_c"] = hrc
        stats["condition"] += 1
        return True

    # 6. Fallback
    subgroup = detect_subgroup(mat, filepath_str)
    if subgroup and subgroup in SUBGROUP_FALLBACK_HB:
        hb = SUBGROUP_FALLBACK_HB[subgroup]
    else:
        hb = FALLBACK_HB.get(iso_group, 200)
    hardness["brinell"] = hb
    hrc = hb_to_hrc(hb)
    if hrc is not None:
        hardness["rockwell_c"] = hrc
    stats["fallback"] += 1
    return True


# =========================================================================
# Schema B processing (H_HARDENED, N_NONFERROUS, X_SPECIALTY)
# =========================================================================
def process_schema_b(mat, iso_group, filepath_str, stats):
    """Process material with Schema B structure. Returns True if modified."""
    hb_obj = mat.get("hardness_hb", {})
    hrc_obj = mat.get("hardness_hrc", {})
    hv_obj = mat.get("hardness_hv", {})

    existing_hb = hb_obj.get("value") if isinstance(hb_obj, dict) else None
    existing_hrc = hrc_obj.get("value") if isinstance(hrc_obj, dict) else None
    existing_hv = hv_obj.get("value") if isinstance(hv_obj, dict) else None

    # 1. Already populated?
    if existing_hb and existing_hb > 0:
        # Fill HRC if missing
        if isinstance(hrc_obj, dict) and (not existing_hrc or existing_hrc <= 0):
            calc_hrc = hb_to_hrc(existing_hb)
            if calc_hrc is not None:
                hrc_obj["value"] = calc_hrc
                hrc_obj["source"] = "derived_from_hb"
        stats["existing"] += 1
        return False

    name = mat.get("name", "")
    # Schema B has no explicit 'condition' field; check description or name
    condition = mat.get("description", "") or name

    tensile_obj = mat.get("tensile_strength", {})
    tensile = None
    if isinstance(tensile_obj, dict):
        tensile = tensile_obj.get("value")
    elif isinstance(tensile_obj, (int, float)):
        tensile = tensile_obj

    # 2. Convert from existing HRC?
    if existing_hrc and existing_hrc > 0:
        hb = hrc_to_hb(existing_hrc)
        if hb > 0:
            if isinstance(hb_obj, dict):
                hb_obj["value"] = hb
                hb_obj["source"] = "derived_from_hrc"
            else:
                mat["hardness_hb"] = {"value": hb, "unit": "HB", "source": "derived_from_hrc", "confidence": 0.8}
            stats["converted_hrc"] += 1
            return True

    # Convert from HV?
    if existing_hv and existing_hv > 0:
        hb = hv_to_hb(existing_hv)
        if hb > 0:
            if isinstance(hb_obj, dict):
                hb_obj["value"] = hb
                hb_obj["source"] = "derived_from_hv"
            else:
                mat["hardness_hb"] = {"value": hb, "unit": "HB", "source": "derived_from_hv", "confidence": 0.7}
            hrc = hb_to_hrc(hb)
            if hrc is not None and isinstance(hrc_obj, dict) and (not existing_hrc or existing_hrc <= 0):
                hrc_obj["value"] = hrc
                hrc_obj["source"] = "derived_from_hv"
            stats["converted_hv"] += 1
            return True

    # 3. Derive from tensile strength?
    if tensile and tensile > 0:
        ratio = TENSILE_TO_HB_RATIO.get(iso_group, 3.45)
        hb = int(round(tensile / ratio))
        hb = max(10, min(hb, 900))
        if isinstance(hb_obj, dict):
            hb_obj["value"] = hb
            hb_obj["source"] = "derived_from_tensile"
        else:
            mat["hardness_hb"] = {"value": hb, "unit": "HB", "source": "derived_from_tensile", "confidence": 0.7}
        hrc = hb_to_hrc(hb)
        if hrc is not None and isinstance(hrc_obj, dict) and (not existing_hrc or existing_hrc <= 0):
            hrc_obj["value"] = hrc
            hrc_obj["source"] = "derived_from_tensile"
        stats["tensile"] += 1
        return True

    # 4. Parse from name?
    hrc_from_name = parse_hrc_from_name(name)
    if hrc_from_name:
        hb = hrc_to_hb(hrc_from_name)
        if isinstance(hb_obj, dict):
            hb_obj["value"] = hb
            hb_obj["source"] = "parsed_from_name"
        else:
            mat["hardness_hb"] = {"value": hb, "unit": "HB", "source": "parsed_from_name", "confidence": 0.8}
        if isinstance(hrc_obj, dict):
            hrc_obj["value"] = hrc_from_name
            hrc_obj["source"] = "parsed_from_name"
        stats["name_parsed"] += 1
        return True

    hb_from_name = parse_hb_from_name(name)
    if hb_from_name and hb_from_name > 0:
        hb_val = int(round(hb_from_name))
        if isinstance(hb_obj, dict):
            hb_obj["value"] = hb_val
            hb_obj["source"] = "parsed_from_name"
        else:
            mat["hardness_hb"] = {"value": hb_val, "unit": "HB", "source": "parsed_from_name", "confidence": 0.8}
        hrc = hb_to_hrc(hb_val)
        if hrc is not None and isinstance(hrc_obj, dict) and (not existing_hrc or existing_hrc <= 0):
            hrc_obj["value"] = hrc
            hrc_obj["source"] = "parsed_from_name"
        stats["name_parsed"] += 1
        return True

    # 5. Derive from condition in name/description?
    cond_hb = get_condition_hb(condition, iso_group)
    if cond_hb:
        if isinstance(hb_obj, dict):
            hb_obj["value"] = cond_hb
            hb_obj["source"] = "derived_from_condition"
        else:
            mat["hardness_hb"] = {"value": cond_hb, "unit": "HB", "source": "derived_from_condition", "confidence": 0.6}
        hrc = hb_to_hrc(cond_hb)
        if hrc is not None and isinstance(hrc_obj, dict) and (not existing_hrc or existing_hrc <= 0):
            hrc_obj["value"] = hrc
            hrc_obj["source"] = "derived_from_condition"
        stats["condition"] += 1
        return True

    # 6. Fallback
    subgroup = detect_subgroup(mat, filepath_str)
    if subgroup and subgroup in SUBGROUP_FALLBACK_HB:
        hb = SUBGROUP_FALLBACK_HB[subgroup]
    else:
        hb = FALLBACK_HB.get(iso_group, 200)
    if isinstance(hb_obj, dict):
        hb_obj["value"] = hb
        hb_obj["source"] = "group_fallback"
    else:
        mat["hardness_hb"] = {"value": hb, "unit": "HB", "source": "group_fallback", "confidence": 0.5}
    hrc = hb_to_hrc(hb)
    if hrc is not None and isinstance(hrc_obj, dict) and (not existing_hrc or existing_hrc <= 0):
        hrc_obj["value"] = hrc
        hrc_obj["source"] = "group_fallback"
    stats["fallback"] += 1
    return True


def is_schema_a(category_dir):
    """Schema A dirs use the nested mechanical.hardness structure."""
    return category_dir in ("P_STEELS", "M_STAINLESS", "K_CAST_IRON", "S_SUPERALLOYS")


def process_file(filepath, stats_by_group, correlation_data):
    """Process a single JSON file. Returns (total_mats, modified_count)."""
    filepath_str = str(filepath)
    # Determine category from path
    parts = filepath.parts
    # The category dir is the parent of the JSON file
    category_dir = parts[-2] if len(parts) >= 2 else "X_SPECIALTY"

    schema_a = is_schema_a(category_dir)

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    materials = data.get("materials", [])
    if not materials:
        return 0, 0

    total = len(materials)
    modified = 0

    for mat in materials:
        iso_group = detect_iso_group(mat, category_dir)
        stats = stats_by_group[iso_group]

        if schema_a:
            did_modify = process_schema_a(mat, iso_group, filepath_str, stats)
        else:
            did_modify = process_schema_b(mat, iso_group, filepath_str, stats)

        if did_modify:
            modified += 1

        # --- Collect correlation data (kc1_1 vs hardness_HB) ---
        hb_val = None
        kc_val = None

        if schema_a:
            mech = mat.get("mechanical", {})
            hardness = mech.get("hardness", {})
            hb_val = hardness.get("brinell")
            kienzle = mat.get("kienzle", {})
            if isinstance(kienzle, dict):
                kc_val = kienzle.get("kc1_1")
        else:
            hb_obj = mat.get("hardness_hb", {})
            if isinstance(hb_obj, dict):
                hb_val = hb_obj.get("value")
            kc_obj = mat.get("kc1_1", {})
            if isinstance(kc_obj, dict):
                kc_val = kc_obj.get("value")
            elif isinstance(kc_obj, (int, float)):
                kc_val = kc_obj

        if hb_val and hb_val > 0 and kc_val and kc_val > 0:
            correlation_data.append({
                "id": mat.get("id", "?"),
                "name": mat.get("name", "?"),
                "iso": iso_group,
                "hb": hb_val,
                "kc1_1": kc_val,
            })

    # Write back
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return total, modified


def compute_correlation(data):
    """Compute Pearson correlation between HB and kc1_1."""
    if len(data) < 3:
        return None, None
    hb_vals = [d["hb"] for d in data]
    kc_vals = [d["kc1_1"] for d in data]
    n = len(hb_vals)
    mean_hb = sum(hb_vals) / n
    mean_kc = sum(kc_vals) / n
    cov = sum((h - mean_hb) * (k - mean_kc) for h, k in zip(hb_vals, kc_vals)) / n
    var_hb = sum((h - mean_hb) ** 2 for h in hb_vals) / n
    var_kc = sum((k - mean_kc) ** 2 for k in kc_vals) / n
    if var_hb == 0 or var_kc == 0:
        return None, None
    r = cov / math.sqrt(var_hb * var_kc)
    # Simple linear regression: kc = a * hb + b
    a = cov / var_hb
    b = mean_kc - a * mean_hb
    return r, (a, b)


def main():
    print("=" * 70)
    print("PRISM Material Hardness Fill")
    print("=" * 70)

    # Gather all JSON files
    json_files = sorted(BASE_DIR.rglob("*.json"))
    print(f"\nFound {len(json_files)} JSON files in {BASE_DIR}")

    stats_by_group = defaultdict(lambda: defaultdict(int))
    correlation_data = []
    total_materials = 0
    total_modified = 0
    file_count = 0

    for fpath in json_files:
        t, m = process_file(fpath, stats_by_group, correlation_data)
        total_materials += t
        total_modified += m
        file_count += 1
        print(f"  {fpath.relative_to(BASE_DIR)}: {t} materials, {m} updated")

    print(f"\n{'=' * 70}")
    print(f"SUMMARY")
    print(f"{'=' * 70}")
    print(f"Files processed:      {file_count}")
    print(f"Total materials:      {total_materials}")
    print(f"Materials updated:    {total_modified}")
    print(f"Already had HB:       {total_materials - total_modified}")

    print(f"\n--- Method breakdown by ISO group ---")
    methods = ["existing", "converted_hrc", "converted_hv", "tensile", "name_parsed", "condition", "fallback"]
    header = f"{'Group':<8}" + "".join(f"{m:<16}" for m in methods) + "TOTAL"
    print(header)
    print("-" * len(header))
    grand_totals = defaultdict(int)
    for group in sorted(stats_by_group.keys()):
        s = stats_by_group[group]
        row_total = sum(s[m] for m in methods)
        row = f"{group:<8}" + "".join(f"{s[m]:<16}" for m in methods) + str(row_total)
        print(row)
        for m in methods:
            grand_totals[m] += s[m]

    total_row = sum(grand_totals.values())
    print("-" * len(header))
    print(f"{'TOTAL':<8}" + "".join(f"{grand_totals[m]:<16}" for m in methods) + str(total_row))

    # --- Correlation analysis ---
    print(f"\n{'=' * 70}")
    print(f"HARDNESS vs kc1_1 CORRELATION ANALYSIS")
    print(f"{'=' * 70}")
    print(f"Data points with both HB > 0 and kc1_1 > 0: {len(correlation_data)}")

    if len(correlation_data) >= 3:
        r, coeffs = compute_correlation(correlation_data)
        if r is not None:
            a, b = coeffs
            print(f"\nOverall Pearson r = {r:.4f}")
            print(f"Linear fit: kc1_1 = {a:.2f} * HB + {b:.1f}")
            print(f"Interpretation: {'STRONG' if abs(r) > 0.7 else 'MODERATE' if abs(r) > 0.4 else 'WEAK'} "
                  f"{'positive' if r > 0 else 'negative'} correlation")

        # Per-group correlation
        print(f"\nPer-group correlations:")
        for group in sorted(set(d["iso"] for d in correlation_data)):
            gdata = [d for d in correlation_data if d["iso"] == group]
            if len(gdata) >= 3:
                gr, gc = compute_correlation(gdata)
                hb_vals = [d["hb"] for d in gdata]
                kc_vals = [d["kc1_1"] for d in gdata]
                if gr is not None:
                    ga, gb = gc
                    print(f"  {group}: n={len(gdata):>4}, r={gr:>7.4f}, "
                          f"HB range=[{min(hb_vals)}-{max(hb_vals)}], "
                          f"kc range=[{min(kc_vals)}-{max(kc_vals)}], "
                          f"fit: kc = {ga:.1f}*HB + {gb:.0f}")
            else:
                print(f"  {group}: n={len(gdata):>4} (too few for correlation)")

        # Show some sample points
        print(f"\nSample data points (first 10 by HB):")
        sorted_data = sorted(correlation_data, key=lambda d: d["hb"])
        for d in sorted_data[:5]:
            print(f"  HB={d['hb']:>5}, kc1_1={d['kc1_1']:>5}, iso={d['iso']}, {d['name'][:50]}")
        print(f"  ...")
        for d in sorted_data[-5:]:
            print(f"  HB={d['hb']:>5}, kc1_1={d['kc1_1']:>5}, iso={d['iso']}, {d['name'][:50]}")

    print(f"\nDone.")


if __name__ == "__main__":
    main()
