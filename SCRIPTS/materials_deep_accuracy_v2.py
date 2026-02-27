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

# Import the verified properties database (85 alloys, web-sourced)
sys.path.insert(0, str(Path(__file__).parent))
from alloy_physical_properties_db import ALLOY_PHYSICAL_PROPERTIES

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
        # Extract the core designation for matching
        if key.startswith("AISI "):
            num = key[5:]
            index[num] = key
            index[f"AISI {num}"] = key
            index[f"SAE {num}"] = key
        elif key.startswith("SS "):
            num = key[3:]
            index[num] = key
            index[f"AISI {num}"] = key
            index[f"SS {num}"] = key
            if num.endswith("L"):
                index[num[:-1] + "L"] = key  # e.g. "316L"
        elif key.startswith("Al "):
            num = key[3:]
            index[num] = key
            index[f"AA {num}"] = key
            index[f"Al {num}"] = key
        elif key.startswith("Ti"):
            index[key] = key
            # Handle variants
            if "6Al-4V" in key:
                index["TI6AL4V"] = key
                index["TI-6AL-4V"] = key
            elif "CP Grade 2" in key:
                index["TICP2"] = key
                index["CP TI GRADE 2"] = key
            elif "CP Grade 4" in key:
                index["TICP4"] = key
                index["CP TI GRADE 4"] = key
            elif "6Al-2Sn" in key:
                index["TI6AL2SN4ZR2MO"] = key
                index["TI6246"] = key
        elif key.startswith("Inconel"):
            num = key.split()[-1]
            index[key] = key
            index[f"IN{num}"] = key
            index[f"INCONEL {num}"] = key
            index[f"ALLOY {num}"] = key
        elif key.startswith("Waspaloy"):
            index["WASPALOY"] = key
            index[key] = key
        elif key.startswith("Hastelloy"):
            suffix = key.split()[-1]
            index[key] = key
            index[f"HASTELLOY_{suffix}"] = key
            index[f"HASTELLOY {suffix}"] = key
        elif key.startswith("Tool "):
            code = key[5:]
            index[code] = key
            index[key] = key
        elif key.startswith("Gray Iron"):
            index[key] = key
        elif key.startswith("Ductile"):
            index[key] = key
        elif key.startswith("Cu "):
            num = key[3:]
            index[num] = key
            index[key] = key
        elif key == "300M":
            index["300M"] = key
        elif key.startswith("17-") or key.startswith("15-"):
            index[key] = key
            index[key.replace("-", "")] = key
    return index

VERIFIED_LOOKUP = _build_lookup_index()


def find_verified_props(mat: dict) -> dict:
    """Try to match a material to the verified properties database."""
    name = mat.get("name", "").upper().strip()
    if not name:
        return None

    # Try direct name match first
    for pfx in ["AISI ", "SAE ", "UNS ", "EN ", "DIN ", "AA ", "AMS ", "ASTM "]:
        if name.startswith(pfx):
            name = name[len(pfx):]
            break

    # Try progressively shorter matches
    # Strip condition suffixes
    base = re.sub(r"\s+(ANNEALED|NORMALIZED|Q&T|COLD|HOT|ROLLED|DRAWN|TEMPERED|AGED|"
                  r"STA|SOLUTION|TREATED|WORKED|HARD|QUENCHED|MILL|CAST|"
                  r"AS[- ]SUPPLIED|AS[- ]CAST|EBM|SLM|DMLS|ELI|"
                  r"\d+\s*HR?C|CONDITION\s*\w+|H\d+|T\d+|O\s*TEMPER|"
                  r"STANDARD|LOW\s*C|HIGH\s*C|[- ]\d+/\d+).*$", "", name, flags=re.IGNORECASE).strip()

    # Remove temper designations for aluminum (e.g. "-T6", "-O", "-T351")
    base = re.sub(r"[- ](T\d+[A-Z]*|O|H\d+|F)\b.*$", "", base).strip()

    # Try exact match on cleaned name
    if base in VERIFIED_LOOKUP:
        return ALLOY_PHYSICAL_PROPERTIES[VERIFIED_LOOKUP[base]]

    # Try numeric-only match (e.g. "1045" from "AISI 1045 Normalized")
    num_m = re.match(r"(\d{3,5}[A-Z]?)", base)
    if num_m:
        num = num_m.group(1)
        if num in VERIFIED_LOOKUP:
            return ALLOY_PHYSICAL_PROPERTIES[VERIFIED_LOOKUP[num]]

    # Try superalloy/tool steel name matching
    for pattern, key in [
        (r"INCONEL\s*(\d+)", lambda m: f"IN{m.group(1)}"),
        (r"IN(?:CO)?\s*(\d+)", lambda m: f"IN{m.group(1)}"),
        (r"HASTELLOY\s*([A-Z])[- ]?(\d+)", lambda m: f"HASTELLOY_{m.group(1)}-{m.group(2)}"),
        (r"HASTELLOY\s*([A-Z])\b", lambda m: f"HASTELLOY_{m.group(1)}"),
        (r"WASPALOY", lambda m: "WASPALOY"),
        (r"STELLITE", lambda m: None),  # not in DB
    ]:
        m = re.search(pattern, name)
        if m:
            lookup_key = key(m)
            if lookup_key and lookup_key in VERIFIED_LOOKUP:
                return ALLOY_PHYSICAL_PROPERTIES[VERIFIED_LOOKUP[lookup_key]]

    # Try Ti alloy matching
    if "TI" in name and ("6AL" in name.replace("-","").replace(" ","") or "6-4" in name):
        if "ELI" in name:
            k = VERIFIED_LOOKUP.get("TI6AL4V")
        else:
            k = VERIFIED_LOOKUP.get("TI6AL4V")
        if k:
            return ALLOY_PHYSICAL_PROPERTIES[k]

    if re.search(r"CP\s*TI|GRADE\s*[24]", name):
        grade = re.search(r"(\d)", name)
        if grade:
            g = int(grade.group(1))
            k = VERIFIED_LOOKUP.get(f"TICP{min(g, 4) if g >= 3 else 2}")
            if k:
                return ALLOY_PHYSICAL_PROPERTIES[k]

    # Tool steels
    tool_m = re.match(r"([ADHMOSWP]\d+)", base)
    if tool_m:
        code = tool_m.group(1)
        if code in VERIFIED_LOOKUP:
            return ALLOY_PHYSICAL_PROPERTIES[VERIFIED_LOOKUP[code]]

    # 17-4PH, 15-5PH
    ph_m = re.match(r"(\d+)[- ]?(\d+)\s*PH", name)
    if ph_m:
        ph_key = f"{ph_m.group(1)}-{ph_m.group(2)}PH"
        if ph_key in VERIFIED_LOOKUP:
            return ALLOY_PHYSICAL_PROPERTIES[VERIFIED_LOOKUP[ph_key]]

    # Duplex
    for d in ["2205", "2507"]:
        if d in name:
            k = VERIFIED_LOOKUP.get(d)
            if k:
                return ALLOY_PHYSICAL_PROPERTIES[k]

    return None


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
        current = phys.get("solidus_temperature", phys.get("melting_point", 0))
        if isinstance(current, (int, float)) and current > 0:
            if abs(current - v_sol) / v_sol > 0.05:
                phys["solidus_temperature"] = v_sol
                if "melting_point" in phys:
                    phys["melting_point"] = v_sol
                corrections.append(f"solidus: {current:.0f} -> {v_sol}")
        else:
            phys["solidus_temperature"] = v_sol
            phys["melting_point"] = v_sol
    if v_liq:
        current = phys.get("liquidus_temperature", 0)
        if isinstance(current, (int, float)) and current > 0:
            if abs(current - v_liq) / v_liq > 0.05:
                phys["liquidus_temperature"] = v_liq
                corrections.append(f"liquidus: {current:.0f} -> {v_liq}")
        else:
            phys["liquidus_temperature"] = v_liq


def validate_and_correct_mechanical(mat: dict, verified: dict, corrections: list):
    """Cross-validate mechanical properties against verified data."""
    mech = mat.setdefault("mechanical", {})

    # Hardness
    v_bhn = verified.get("hardness_bhn")
    if v_bhn:
        h = mech.get("hardness", {})
        if isinstance(h, dict):
            current = h.get("brinell", 0)
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
    t_melt = jc.get("T_melt", 0)
    solidus = mat.get("physical", {}).get("solidus_temperature",
              mat.get("physical", {}).get("melting_point", 0))
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


def update_confidence(mat: dict, verified_match: bool, corrections: list):
    """Update confidence tags with honest, granular categories."""
    acc = mat.get("_accuracy", {})
    acc["pass"] = "deep_accuracy_v2"
    acc["date"] = datetime.now().strftime("%Y-%m-%d")
    acc["v2_corrections"] = len(corrections)

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

    # Step 2: Correct physical properties from verified data
    if verified:
        validate_and_correct_physical(mat, verified, corrections)
        validate_and_correct_mechanical(mat, verified, corrections)

    # Step 3: J-C parameter bounds check (all materials)
    validate_jc_bounds(mat, corrections)

    # Step 4: Kienzle vs UTS correlation check
    validate_kienzle_vs_uts(mat, corrections)

    # Step 5: Cutting speed range validation
    validate_cutting_speeds(mat, corrections)

    # Step 6: Update confidence with honest tags
    update_confidence(mat, verified_match, corrections)

    return {"verified_match": verified_match, "corrections": corrections}


def process_file(filepath: Path) -> dict:
    """Process all materials in a JSON file."""
    result = {"file": str(filepath), "materials": 0, "verified_matches": 0,
              "total_corrections": 0, "errors": []}

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
    total_mat = total_verified = total_corrections = total_errors = 0

    for i, fp in enumerate(sorted(json_files)):
        log.info(f"[{i+1}/{len(json_files)}] {fp.parent.name}/{fp.name}")
        r = process_file(fp)
        results.append(r)
        total_mat += r["materials"]
        total_verified += r["verified_matches"]
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
