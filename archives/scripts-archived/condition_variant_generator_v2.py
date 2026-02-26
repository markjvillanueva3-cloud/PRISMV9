#!/usr/bin/env python3
"""
PRISM - Condition Variant Generator v2.0
Adds heat treatment condition variants to existing materials database

FIXED:
- Better JS-to-JSON parsing for unquoted keys
- Fixed interpolate_yield variable bug
- Better condition detection logic
"""

import json
import re
import os
from pathlib import Path
from datetime import datetime
from copy import deepcopy

# Configuration
INPUT_DIR = Path(r"C:\\PRISM\EXTRACTED\materials")
OUTPUT_DIR = Path(r"C:\\PRISM\EXTRACTED\materials_enhanced")
LOG_FILE = Path(r"C:\\PRISM\SESSION_LOGS\condition_variants_log.txt")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


# =============================================================================
# JS TO JSON CONVERTER
# =============================================================================

def js_to_json(js_string):
    """Convert JavaScript object notation to JSON"""
    # Remove single line comments
    result = re.sub(r'//.*$', '', js_string, flags=re.MULTILINE)
    
    # Remove multi-line comments
    result = re.sub(r'/\*[\s\S]*?\*/', '', result)
    
    # Add quotes to unquoted keys
    # Match: word followed by colon (not inside string)
    result = re.sub(r'(\s)(\w+)(\s*:)', r'\1"\2"\3', result)
    
    # Fix trailing commas before } or ]
    result = re.sub(r',(\s*[}\]])', r'\1', result)
    
    # Handle null values
    result = result.replace(': null', ': null')
    
    return result


def extract_material_from_js(content, material_id):
    """Extract a single material's data from JS file content"""
    # Find the material block
    pattern = rf'"{material_id}":\s*\{{([\s\S]*?)\n    \}}'
    match = re.search(pattern, content)
    if not match:
        # Try without quotes on the key
        pattern = rf'{material_id}:\s*\{{([\s\S]*?)\n    \}}'
        match = re.search(pattern, content)
    
    if not match:
        return None
    
    material_content = '{' + match.group(1) + '\n    }'
    
    try:
        json_str = js_to_json(material_content)
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"    JSON parse error for {material_id}: {e}")
        return None


def extract_all_materials(content):
    """Extract all materials from JS file content"""
    materials = {}
    
    # Find all material IDs in the file
    id_pattern = r'"?([A-Z]-[A-Z]{2,3}-\d{3,4})"?\s*:\s*\{'
    ids = re.findall(id_pattern, content)
    
    for mat_id in ids:
        mat_data = extract_material_from_js(content, mat_id)
        if mat_data:
            mat_data['id'] = mat_id  # Ensure ID is set
            materials[mat_id] = mat_data
    
    return materials


# =============================================================================
# PHYSICS-BASED INTERPOLATION MODELS
# =============================================================================

def hrc_to_hb(hrc):
    """Convert Rockwell C to Brinell (approximate)"""
    if hrc is None or hrc < 20:
        return 200
    elif hrc < 26:
        return 240 + (hrc - 20) * 10
    elif hrc < 36:
        return 300 + (hrc - 26) * 10
    else:
        return 400 + (hrc - 36) * 12.5

def interpolate_kc11(base_kc11, base_hb, target_hb):
    """Interpolate specific cutting force based on hardness change"""
    if base_hb == 0 or base_hb is None:
        base_hb = 180
    hb_ratio = target_hb / base_hb
    kc_factor = hb_ratio ** 1.15
    return int(base_kc11 * kc_factor)

def interpolate_machinability(base_mach, base_hb, target_hb):
    """Interpolate machinability rating based on hardness"""
    if base_hb == 0 or base_hb is None:
        base_hb = 180
    hb_ratio = target_hb / base_hb
    mach_factor = (1 / hb_ratio) ** 1.2
    return max(2, min(100, int(base_mach * mach_factor)))

def interpolate_taylor(base_C, base_n, base_hb, target_hb):
    """Interpolate Taylor tool life constants"""
    if base_hb == 0 or base_hb is None:
        base_hb = 180
    hb_ratio = target_hb / base_hb
    new_C = base_C * (1 / hb_ratio) ** 1.1
    new_n = base_n * (1 / hb_ratio) ** 0.15
    return max(15, int(new_C)), max(0.03, round(new_n, 2))

def interpolate_tensile(base_tensile, base_hb, target_hb):
    """Tensile strength roughly proportional to hardness"""
    if base_hb == 0 or base_hb is None:
        base_hb = 180
    return int(base_tensile * (target_hb / base_hb) ** 0.95)

def interpolate_yield(base_yield, base_hb, target_hb, new_tensile):
    """Yield strength - ratio to tensile increases with hardness"""
    if base_hb == 0 or base_hb is None:
        base_hb = 180
    base_ratio = base_yield / (new_tensile if new_tensile and new_tensile > 0 else base_yield * 1.2)
    target_ratio = min(0.98, base_ratio + (target_hb - base_hb) * 0.0003)
    return int(new_tensile * target_ratio)

def interpolate_elongation(base_elong, base_hb, target_hb):
    """Elongation drops significantly with hardness"""
    if base_hb == 0 or base_hb is None:
        base_hb = 180
    hb_ratio = target_hb / base_hb
    new_elong = base_elong * (1 / hb_ratio) ** 1.8
    return max(0, min(base_elong, int(new_elong)))

def interpolate_johnson_cook(base_jc, base_hb, target_hb):
    """Interpolate Johnson-Cook plasticity parameters"""
    if base_hb == 0 or base_hb is None:
        base_hb = 180
    hb_ratio = target_hb / base_hb
    return {
        "A": int(base_jc.get("A", 500) * hb_ratio ** 0.9),
        "B": int(base_jc.get("B", 700) * hb_ratio ** 0.3),
        "n": round(base_jc.get("n", 0.4) * (1/hb_ratio) ** 0.3, 2),
        "C": round(base_jc.get("C", 0.02) * (1/hb_ratio) ** 0.1, 3),
        "m": round(base_jc.get("m", 1.0) * hb_ratio ** 0.15, 2)
    }


# =============================================================================
# CONDITION DEFINITIONS BY STEEL TYPE
# =============================================================================

CONDITION_TEMPLATES = {
    "carbon_steel": [
        {"name": "Annealed", "hb": 130, "hrc": None, "suffix": "Ann"},
        {"name": "Normalized", "hb": 160, "hrc": None, "suffix": "Norm"},
        {"name": "Q&T 22 HRC", "hb": 235, "hrc": 22, "suffix": "QT22"},
        {"name": "Q&T 28 HRC", "hb": 277, "hrc": 28, "suffix": "QT28"},
        {"name": "Q&T 35 HRC", "hb": 330, "hrc": 35, "suffix": "QT35"},
        {"name": "Q&T 45 HRC", "hb": 430, "hrc": 45, "suffix": "QT45"},
    ],
    "alloy_steel": [
        {"name": "Annealed", "hb": 195, "hrc": None, "suffix": "Ann"},
        {"name": "Normalized", "hb": 225, "hrc": 20, "suffix": "Norm"},
        {"name": "Q&T 28 HRC", "hb": 277, "hrc": 28, "suffix": "QT28"},
        {"name": "Q&T 32 HRC", "hb": 302, "hrc": 32, "suffix": "QT32"},
        {"name": "Q&T 38 HRC", "hb": 352, "hrc": 38, "suffix": "QT38"},
        {"name": "Q&T 45 HRC", "hb": 430, "hrc": 45, "suffix": "QT45"},
        {"name": "Q&T 50 HRC", "hb": 480, "hrc": 50, "suffix": "QT50"},
    ],
    "tool_steel_cold": [
        {"name": "Annealed", "hb": 217, "hrc": None, "suffix": "Ann"},
        {"name": "Hardened 58 HRC", "hb": 600, "hrc": 58, "suffix": "H58"},
        {"name": "Hardened 62 HRC", "hb": 650, "hrc": 62, "suffix": "H62"},
    ],
    "tool_steel_hot": [
        {"name": "Annealed", "hb": 192, "hrc": None, "suffix": "Ann"},
        {"name": "Prehardened 38 HRC", "hb": 352, "hrc": 38, "suffix": "PH38"},
        {"name": "Hardened 48 HRC", "hb": 460, "hrc": 48, "suffix": "H48"},
        {"name": "Hardened 52 HRC", "hb": 510, "hrc": 52, "suffix": "H52"},
    ],
    "tool_steel_hss": [
        {"name": "Annealed", "hb": 235, "hrc": None, "suffix": "Ann"},
        {"name": "Hardened 62 HRC", "hb": 650, "hrc": 62, "suffix": "H62"},
        {"name": "Hardened 65 HRC", "hb": 725, "hrc": 65, "suffix": "H65"},
    ],
    "stainless_austenitic": [
        {"name": "Annealed", "hb": 150, "hrc": None, "suffix": "Ann"},
        {"name": "Cold Worked 1/4 Hard", "hb": 200, "hrc": None, "suffix": "CW14"},
        {"name": "Cold Worked 1/2 Hard", "hb": 250, "hrc": 24, "suffix": "CW12"},
        {"name": "Cold Worked Full Hard", "hb": 320, "hrc": 33, "suffix": "CWFH"},
    ],
    "stainless_martensitic": [
        {"name": "Annealed", "hb": 195, "hrc": None, "suffix": "Ann"},
        {"name": "Hardened 40 HRC", "hb": 375, "hrc": 40, "suffix": "H40"},
        {"name": "Hardened 50 HRC", "hb": 480, "hrc": 50, "suffix": "H50"},
    ],
    "stainless_ph": [
        {"name": "Condition A (Solution)", "hb": 300, "hrc": 32, "suffix": "CondA"},
        {"name": "Condition H1150", "hb": 260, "hrc": 26, "suffix": "H1150"},
        {"name": "Condition H900", "hb": 460, "hrc": 48, "suffix": "H900"},
    ],
    "stainless_duplex": [
        {"name": "Solution Annealed", "hb": 260, "hrc": 26, "suffix": "SA"},
        {"name": "Cold Worked", "hb": 320, "hrc": 33, "suffix": "CW"},
    ],
    "bearing_steel": [
        {"name": "Spheroidize Annealed", "hb": 187, "hrc": None, "suffix": "SphAnn"},
        {"name": "Hardened 58 HRC", "hb": 600, "hrc": 58, "suffix": "H58"},
        {"name": "Hardened 62 HRC", "hb": 650, "hrc": 62, "suffix": "H62"},
    ],
    "case_hardening": [
        {"name": "Annealed", "hb": 149, "hrc": None, "suffix": "Ann"},
        {"name": "Normalized", "hb": 175, "hrc": None, "suffix": "Norm"},
        {"name": "Carburized 58 HRC Case", "hb": 600, "hrc": 58, "suffix": "Carb58"},
    ],
}


def classify_steel_type(material):
    """Determine steel type from material data"""
    mat_id = str(material.get("id", "")).upper()
    name = str(material.get("name", "")).upper()
    mat_class = str(material.get("material_class", "")).upper()
    
    designation = material.get("designation", {})
    if isinstance(designation, dict):
        aisi = str(designation.get("aisi_sae", "")).upper()
    else:
        aisi = ""
    
    # Tool steels
    if any(x in name for x in ["HSS", "HIGH SPEED", "M1 ", "M2 ", "M3 ", "M4 ", "M42", "T1 ", "T15"]):
        return "tool_steel_hss"
    if any(x in aisi or x in name for x in ["D2", "D3", "A2", "O1", "S7", "W1"]):
        return "tool_steel_cold"
    if any(x in aisi or x in name for x in ["H11", "H13", "H19", "H21"]):
        return "tool_steel_hot"
    if "TOOL" in mat_class or "TOOL" in name:
        return "tool_steel_cold"
    
    # Stainless steels
    if "STAINLESS" in mat_class or "STAINLESS" in name:
        if any(x in name for x in ["17-4", "15-5", "17-7", "PH", "PRECIPITATION"]):
            return "stainless_ph"
        if any(x in name for x in ["2205", "2507", "DUPLEX"]):
            return "stainless_duplex"
        if any(x in aisi or x in name for x in ["410", "420", "440", "416"]):
            return "stainless_martensitic"
        return "stainless_austenitic"
    
    # Bearing steels
    if "52100" in aisi or "BEARING" in name:
        return "bearing_steel"
    
    # Case hardening
    if any(x in aisi for x in ["8620", "8615", "9310", "4320", "4118"]):
        return "case_hardening"
    
    # Alloy steels (4xxx, 8xxx series)
    if re.match(r"^[4-9]\d{3}", aisi):
        return "alloy_steel"
    
    # Carbon steels (10xx, 11xx, 12xx series)
    if re.match(r"^1[0-2]\d{2}", aisi):
        return "carbon_steel"
    
    return "alloy_steel"


def has_condition_already(material):
    """Check if material already has a specific heat treatment condition"""
    name = str(material.get("name", "")).lower()
    condition = str(material.get("condition", "")).lower()
    
    # These indicate an explicit condition
    indicators = [
        "annealed", "normalized", "q&t", "quenched", "tempered",
        "hardened", "hrc", "cold worked", "cold drawn", "cold rolled",
        "hot rolled", "carburized", "nitrided", "aged", "solution",
        "condition a", "condition h", "prehardened", "spheroidize",
        "stress reliev", "1/4 hard", "1/2 hard", "full hard"
    ]
    
    for ind in indicators:
        if ind in name or ind in condition:
            return True
    return False


def get_base_props(material):
    """Extract base properties from material"""
    mech = material.get("mechanical", {})
    hardness = mech.get("hardness", {})
    
    base_hb = hardness.get("brinell", 180)
    if base_hb is None:
        base_hb = 180
    
    tensile_data = mech.get("tensile_strength", {})
    yield_data = mech.get("yield_strength", {})
    
    if isinstance(tensile_data, dict):
        base_tensile = tensile_data.get("typical") or tensile_data.get("min", 550)
    else:
        base_tensile = tensile_data if tensile_data else 550
    
    if isinstance(yield_data, dict):
        base_yield = yield_data.get("typical") or yield_data.get("min", 350)
    else:
        base_yield = yield_data if yield_data else 350
    
    elong_data = mech.get("elongation", {})
    if isinstance(elong_data, dict):
        base_elong = elong_data.get("typical", 20)
    else:
        base_elong = elong_data if elong_data else 20
    
    kienzle = material.get("kienzle", {})
    base_kc11 = kienzle.get("kc1_1", 1800)
    base_mc = kienzle.get("mc", 0.24)
    
    taylor = material.get("taylor", {})
    base_taylor_C = taylor.get("C", 150)
    base_taylor_n = taylor.get("n", 0.20)
    
    mach = material.get("machinability", {})
    base_mach_rating = mach.get("aisi_rating", 50)
    
    jc = material.get("johnson_cook", {})
    base_jc = {
        "A": jc.get("A", 500),
        "B": jc.get("B", 700),
        "n": jc.get("n", 0.4),
        "C": jc.get("C", 0.02),
        "m": jc.get("m", 1.0)
    }
    
    return {
        "hb": base_hb if base_hb else 180,
        "tensile": base_tensile if base_tensile else 550,
        "yield": base_yield if base_yield else 350,
        "elongation": base_elong if base_elong else 20,
        "kc11": base_kc11 if base_kc11 else 1800,
        "mc": base_mc if base_mc else 0.24,
        "taylor_C": base_taylor_C if base_taylor_C else 150,
        "taylor_n": base_taylor_n if base_taylor_n else 0.20,
        "mach_rating": base_mach_rating if base_mach_rating else 50,
        "johnson_cook": base_jc
    }


def generate_condition_variant(base_material, base_props, condition, var_idx):
    """Generate a condition variant of a base material"""
    variant = deepcopy(base_material)
    
    # Generate new ID
    base_id = base_material.get("id", "P-XX-000")
    new_id = f"{base_id}-{condition['suffix']}"
    variant["id"] = new_id
    
    # Update name
    base_name = base_material.get("name", "Steel")
    variant["name"] = f"{base_name} {condition['name']}"
    
    # Update condition field
    variant["condition"] = condition["name"]
    
    # Target hardness
    target_hb = condition["hb"]
    target_hrc = condition["hrc"]
    
    # Interpolate properties
    new_tensile = interpolate_tensile(base_props["tensile"], base_props["hb"], target_hb)
    new_yield = interpolate_yield(base_props["yield"], base_props["hb"], target_hb, new_tensile)
    new_elong = interpolate_elongation(base_props["elongation"], base_props["hb"], target_hb)
    new_kc11 = interpolate_kc11(base_props["kc11"], base_props["hb"], target_hb)
    new_taylor_C, new_taylor_n = interpolate_taylor(base_props["taylor_C"], base_props["taylor_n"], base_props["hb"], target_hb)
    new_mach = interpolate_machinability(base_props["mach_rating"], base_props["hb"], target_hb)
    new_jc = interpolate_johnson_cook(base_props["johnson_cook"], base_props["hb"], target_hb)
    
    # Update mechanical properties
    if "mechanical" not in variant:
        variant["mechanical"] = {}
    
    variant["mechanical"]["hardness"] = {
        "brinell": target_hb,
        "rockwell_c": target_hrc,
        "vickers": int(target_hb * 1.05)
    }
    variant["mechanical"]["tensile_strength"] = {"typical": new_tensile}
    variant["mechanical"]["yield_strength"] = {"typical": new_yield}
    variant["mechanical"]["elongation"] = {"typical": new_elong}
    
    variant["kienzle"] = {
        "kc1_1": new_kc11,
        "mc": round(base_props["mc"] - (target_hb - base_props["hb"]) * 0.0001, 2)
    }
    
    variant["taylor"] = {"C": new_taylor_C, "n": new_taylor_n}
    variant["machinability"] = {"aisi_rating": new_mach, "relative_to_1212": round(new_mach / 100, 2)}
    variant["johnson_cook"] = new_jc
    
    # Update ISO group for hard materials
    if target_hrc and target_hrc >= 45:
        variant["iso_group"] = "H"
    
    return variant


def process_file(filepath):
    """Process a single material file"""
    print(f"\nProcessing: {filepath.name}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    materials = extract_all_materials(content)
    
    if not materials:
        print(f"  No materials found")
        return [], 0, 0
    
    print(f"  Found {len(materials)} materials")
    
    all_output = []
    new_count = 0
    skipped = 0
    var_idx = 1
    
    for mat_id, material in materials.items():
        if has_condition_already(material):
            # Keep original but don't generate variants
            all_output.append(material)
            skipped += 1
            continue
        
        # Get steel type and conditions
        steel_type = classify_steel_type(material)
        conditions = CONDITION_TEMPLATES.get(steel_type, CONDITION_TEMPLATES["alloy_steel"])
        base_props = get_base_props(material)
        
        # Generate variants for each condition
        for condition in conditions:
            variant = generate_condition_variant(material, base_props, condition, var_idx)
            all_output.append(variant)
            var_idx += 1
            new_count += 1
    
    print(f"  Generated {new_count} condition variants")
    print(f"  Skipped {skipped} (already have conditions)")
    
    return all_output, new_count, skipped


def write_output(filepath, materials):
    """Write enhanced material file"""
    rel_path = filepath.relative_to(INPUT_DIR)
    output_path = OUTPUT_DIR / rel_path.parent / f"{filepath.stem}_enhanced.js"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    header = f'''/**
 * PRISM MATERIALS DATABASE - WITH CONDITION VARIANTS
 * Source: {filepath.name}
 * Generated: {timestamp}
 * Total materials: {len(materials)}
 */
const MATERIALS_ENHANCED = {{
  metadata: {{
    source: "{filepath.name}",
    materialCount: {len(materials)},
    generated: "{timestamp}"
  }},
  materials: {{
'''
    
    mat_strs = []
    for mat in materials:
        mat_id = mat.get("id", "UNKNOWN")
        mat_str = f'    "{mat_id}": ' + json.dumps(mat, indent=6).replace('\n', '\n    ')
        mat_strs.append(mat_str)
    
    footer = '''
  }
};
module.exports = MATERIALS_ENHANCED;
'''
    
    content = header + ',\n\n'.join(mat_strs) + footer
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  Wrote: {output_path.name} ({output_path.stat().st_size/1024:.1f} KB)")
    return output_path


def main():
    print("=" * 70)
    print("PRISM Condition Variant Generator v2.0")
    print("=" * 70)
    
    categories = ["P_STEELS", "M_STAINLESS", "N_NONFERROUS"]
    total_base = 0
    total_new = 0
    total_skipped = 0
    
    for category in categories:
        cat_path = INPUT_DIR / category
        if not cat_path.exists():
            continue
        
        print(f"\n{'='*70}")
        print(f"Category: {category}")
        print("=" * 70)
        
        for filepath in sorted(cat_path.glob("*.js")):
            if "_enhanced" in filepath.name:
                continue
            
            materials, new_count, skipped = process_file(filepath)
            
            if materials:
                write_output(filepath, materials)
                total_base += len(materials) - new_count
                total_new += new_count
                total_skipped += skipped
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Base materials:    {total_base}")
    print(f"New variants:      {total_new}")
    print(f"Skipped:           {total_skipped}")
    print(f"Total output:      {total_base + total_new}")
    print(f"Output directory:  {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
