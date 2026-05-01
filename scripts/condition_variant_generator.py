#!/usr/bin/env python3
"""
PRISM - Condition Variant Generator
Adds heat treatment condition variants to existing materials database

PHYSICS-BASED RELATIONSHIPS:
- Kc1.1 increases ~18% per 10 HRC increase
- Machinability drops ~12% per 10 HRC increase  
- Taylor C drops ~18% per 10 HRC increase
- Tensile ≈ 3.45 × HB (for steels)
- Yield ≈ 0.85 × Tensile (typical)
- Elongation inversely proportional to hardness

CONDITION RANGES BY STEEL TYPE:
- Carbon steels (10xx): Annealed → Q&T 55 HRC max
- Alloy steels (41xx, 43xx, 86xx): Annealed → Q&T 54 HRC max
- Tool steels (Dx, Hx, Ax, Ox, Sx, Mx, Tx): Annealed → 58-65 HRC
- Stainless austenitic: Annealed, Cold Worked (no hardening)
- Stainless martensitic: Annealed → 58 HRC
- Stainless PH: Solution → Age hardened conditions
- Bearing steels: Spheroidize annealed → 64 HRC
"""

import json
import re
import os
from pathlib import Path
from datetime import datetime
from copy import deepcopy

# Configuration
INPUT_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials")
OUTPUT_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials_enhanced")
LOG_FILE = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\condition_variants_log.txt")

# Ensure output directories exist
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


# =============================================================================
# PHYSICS-BASED INTERPOLATION MODELS
# =============================================================================

def hb_to_hrc(hb):
    """Convert Brinell to Rockwell C (approximate)"""
    if hb < 240:
        return None  # Below HRC range
    elif hb < 300:
        return (hb - 240) * 0.1 + 20
    elif hb < 400:
        return (hb - 300) * 0.1 + 26
    else:
        return min(70, (hb - 400) * 0.08 + 36)

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
    """
    Interpolate specific cutting force based on hardness change
    Kc1.1 increases ~1.8% per 10 HB points
    """
    hb_ratio = target_hb / base_hb
    # Non-linear relationship - harder materials are disproportionately harder to cut
    kc_factor = hb_ratio ** 1.15
    return int(base_kc11 * kc_factor)

def interpolate_machinability(base_mach, base_hb, target_hb):
    """
    Interpolate machinability rating based on hardness
    Machinability drops more steeply at higher hardness
    """
    hb_ratio = target_hb / base_hb
    # Inverse relationship with hardness
    mach_factor = (1 / hb_ratio) ** 1.2
    return max(2, min(100, int(base_mach * mach_factor)))

def interpolate_taylor(base_C, base_n, base_hb, target_hb):
    """
    Interpolate Taylor tool life constants
    C decreases with hardness, n slightly decreases
    """
    hb_ratio = target_hb / base_hb
    new_C = base_C * (1 / hb_ratio) ** 1.1
    new_n = base_n * (1 / hb_ratio) ** 0.15
    return max(15, int(new_C)), max(0.03, round(new_n, 2))

def interpolate_tensile(base_tensile, base_hb, target_hb):
    """Tensile strength roughly proportional to hardness"""
    return int(base_tensile * (target_hb / base_hb) ** 0.95)

def interpolate_yield(base_yield, base_hb, target_hb, target_tensile):
    """Yield strength - ratio to tensile increases with hardness"""
    base_ratio = base_yield / (base_tensile if base_tensile else base_yield * 1.2)
    # Yield ratio increases from ~0.6 (soft) to ~0.95 (hard)
    target_ratio = min(0.98, base_ratio + (target_hb - base_hb) * 0.0003)
    return int(target_tensile * target_ratio)

def interpolate_elongation(base_elong, base_hb, target_hb):
    """Elongation drops significantly with hardness"""
    hb_ratio = target_hb / base_hb
    new_elong = base_elong * (1 / hb_ratio) ** 1.8
    return max(0, min(base_elong, int(new_elong)))

def interpolate_johnson_cook(base_jc, base_hb, target_hb):
    """
    Interpolate Johnson-Cook plasticity parameters
    A (yield strength term) increases with hardness
    B (strain hardening) increases slightly
    n (strain hardening exponent) decreases
    C (strain rate sensitivity) slightly decreases
    m (thermal softening) increases
    """
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
        {"name": "Q&T 55 HRC", "hb": 550, "hrc": 55, "suffix": "QT55"},
    ],
    "alloy_steel": [
        {"name": "Annealed", "hb": 195, "hrc": None, "suffix": "Ann"},
        {"name": "Normalized", "hb": 225, "hrc": 20, "suffix": "Norm"},
        {"name": "Q&T 22 HRC", "hb": 235, "hrc": 22, "suffix": "QT22"},
        {"name": "Q&T 28 HRC", "hb": 277, "hrc": 28, "suffix": "QT28"},
        {"name": "Q&T 32 HRC", "hb": 302, "hrc": 32, "suffix": "QT32"},
        {"name": "Q&T 38 HRC", "hb": 352, "hrc": 38, "suffix": "QT38"},
        {"name": "Q&T 45 HRC", "hb": 430, "hrc": 45, "suffix": "QT45"},
        {"name": "Q&T 50 HRC", "hb": 480, "hrc": 50, "suffix": "QT50"},
    ],
    "tool_steel_cold": [  # D2, A2, O1
        {"name": "Annealed", "hb": 217, "hrc": None, "suffix": "Ann"},
        {"name": "Hardened 54 HRC", "hb": 540, "hrc": 54, "suffix": "H54"},
        {"name": "Hardened 58 HRC", "hb": 600, "hrc": 58, "suffix": "H58"},
        {"name": "Hardened 62 HRC", "hb": 650, "hrc": 62, "suffix": "H62"},
    ],
    "tool_steel_hot": [  # H11, H13
        {"name": "Annealed", "hb": 192, "hrc": None, "suffix": "Ann"},
        {"name": "Prehardened 38 HRC", "hb": 352, "hrc": 38, "suffix": "PH38"},
        {"name": "Hardened 44 HRC", "hb": 420, "hrc": 44, "suffix": "H44"},
        {"name": "Hardened 48 HRC", "hb": 460, "hrc": 48, "suffix": "H48"},
        {"name": "Hardened 52 HRC", "hb": 510, "hrc": 52, "suffix": "H52"},
    ],
    "tool_steel_hss": [  # M2, T1
        {"name": "Annealed", "hb": 235, "hrc": None, "suffix": "Ann"},
        {"name": "Hardened 62 HRC", "hb": 650, "hrc": 62, "suffix": "H62"},
        {"name": "Hardened 65 HRC", "hb": 725, "hrc": 65, "suffix": "H65"},
    ],
    "stainless_austenitic": [  # 304, 316
        {"name": "Annealed", "hb": 150, "hrc": None, "suffix": "Ann"},
        {"name": "Cold Worked 1/4 Hard", "hb": 200, "hrc": None, "suffix": "CW14"},
        {"name": "Cold Worked 1/2 Hard", "hb": 250, "hrc": 24, "suffix": "CW12"},
        {"name": "Cold Worked Full Hard", "hb": 320, "hrc": 33, "suffix": "CWFH"},
    ],
    "stainless_martensitic": [  # 410, 420, 440
        {"name": "Annealed", "hb": 195, "hrc": None, "suffix": "Ann"},
        {"name": "Hardened 40 HRC", "hb": 375, "hrc": 40, "suffix": "H40"},
        {"name": "Hardened 50 HRC", "hb": 480, "hrc": 50, "suffix": "H50"},
        {"name": "Hardened 58 HRC", "hb": 600, "hrc": 58, "suffix": "H58"},
    ],
    "stainless_ph": [  # 17-4 PH, 15-5 PH
        {"name": "Condition A (Solution)", "hb": 300, "hrc": 32, "suffix": "CondA"},
        {"name": "Condition H1150", "hb": 260, "hrc": 26, "suffix": "H1150"},
        {"name": "Condition H1025", "hb": 330, "hrc": 35, "suffix": "H1025"},
        {"name": "Condition H900", "hb": 460, "hrc": 48, "suffix": "H900"},
    ],
    "stainless_duplex": [  # 2205, 2507
        {"name": "Solution Annealed", "hb": 260, "hrc": 26, "suffix": "SA"},
        {"name": "Cold Worked", "hb": 320, "hrc": 33, "suffix": "CW"},
    ],
    "bearing_steel": [  # 52100
        {"name": "Spheroidize Annealed", "hb": 187, "hrc": None, "suffix": "SphAnn"},
        {"name": "Hardened 58 HRC", "hb": 600, "hrc": 58, "suffix": "H58"},
        {"name": "Hardened 62 HRC", "hb": 650, "hrc": 62, "suffix": "H62"},
        {"name": "Hardened 64 HRC", "hb": 700, "hrc": 64, "suffix": "H64"},
    ],
    "case_hardening": [  # 8620, 9310
        {"name": "Annealed", "hb": 149, "hrc": None, "suffix": "Ann"},
        {"name": "Normalized", "hb": 175, "hrc": None, "suffix": "Norm"},
        {"name": "Carburized 58 HRC Case", "hb": 600, "hrc": 58, "suffix": "Carb58"},
        {"name": "Carburized 62 HRC Case", "hb": 650, "hrc": 62, "suffix": "Carb62"},
    ],
}


def classify_steel_type(material):
    """Determine steel type from material data for condition selection"""
    mat_id = material.get("id", "").upper()
    name = material.get("name", "").upper()
    mat_class = material.get("material_class", "").upper()
    aisi = material.get("designation", {}).get("aisi_sae", "").upper()
    
    # Tool steels
    if any(x in name for x in ["HSS", "HIGH SPEED", "M1", "M2", "M3", "M4", "M42", "T1", "T15"]):
        return "tool_steel_hss"
    if any(x in aisi for x in ["D2", "D3", "D4", "A2", "A6", "O1", "O2", "O6"]):
        return "tool_steel_cold"
    if any(x in aisi for x in ["H11", "H13", "H19", "H21", "H26"]):
        return "tool_steel_hot"
    if "TOOL" in mat_class or "TOOL" in name:
        return "tool_steel_cold"
    
    # Stainless steels
    if "STAINLESS" in mat_class or "STAINLESS" in name:
        if any(x in name for x in ["17-4", "15-5", "17-7", "PH"]):
            return "stainless_ph"
        if any(x in name for x in ["2205", "2507", "DUPLEX", "SUPER DUPLEX"]):
            return "stainless_duplex"
        if any(x in aisi for x in ["410", "420", "440", "416"]):
            return "stainless_martensitic"
        return "stainless_austenitic"
    
    # Bearing steels
    if "52100" in aisi or "BEARING" in name:
        return "bearing_steel"
    
    # Case hardening
    if any(x in aisi for x in ["8620", "8615", "9310", "4320", "4118", "4820"]):
        return "case_hardening"
    
    # Alloy steels
    if any(x in aisi for x in ["41", "43", "46", "48", "86", "87", "93", "94"]):
        return "alloy_steel"
    
    # Carbon steels (default for 10xx series)
    if re.match(r"^10\d\d", aisi):
        return "carbon_steel"
    
    # Default to alloy steel for unknown
    return "alloy_steel"


def get_base_condition(material):
    """Extract base hardness and properties from existing material"""
    mech = material.get("mechanical", {})
    hardness = mech.get("hardness", {})
    
    base_hb = hardness.get("brinell", 200)
    base_hrc = hardness.get("rockwell_c")
    
    # Get tensile/yield
    tensile_data = mech.get("tensile_strength", {})
    yield_data = mech.get("yield_strength", {})
    
    base_tensile = tensile_data.get("typical") or tensile_data.get("min", 600)
    base_yield = yield_data.get("typical") or yield_data.get("min", 400)
    base_elong = mech.get("elongation", {}).get("typical", 15)
    
    # Get cutting parameters
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
        "hb": base_hb,
        "hrc": base_hrc,
        "tensile": base_tensile,
        "yield": base_yield,
        "elongation": base_elong,
        "kc11": base_kc11,
        "mc": base_mc,
        "taylor_C": base_taylor_C,
        "taylor_n": base_taylor_n,
        "mach_rating": base_mach_rating,
        "johnson_cook": base_jc
    }


def should_skip_material(material):
    """Determine if material already has condition variants or should be skipped"""
    name = material.get("name", "").lower()
    condition = material.get("condition", "").lower()
    
    # Skip if already has explicit condition in name
    condition_indicators = [
        "annealed", "normalized", "q&t", "quenched", "tempered",
        "hardened", "hrc", "cold worked", "cold drawn", "cold rolled",
        "hot rolled", "carburized", "nitrided", "aged", "solution",
        "condition a", "condition h", "prehardened", "spheroidize"
    ]
    
    for indicator in condition_indicators:
        if indicator in name or indicator in condition:
            return True
    
    return False


def generate_condition_variant(base_material, base_props, condition_template, variant_idx):
    """Generate a new material entry for a specific condition"""
    variant = deepcopy(base_material)
    
    # Generate new ID
    base_id = base_material.get("id", "P-XX-000")
    # Extract category prefix (e.g., "P-CS", "M-SS")
    id_parts = base_id.split("-")
    if len(id_parts) >= 2:
        new_id = f"{id_parts[0]}-{id_parts[1]}-{variant_idx:04d}"
    else:
        new_id = f"{base_id}-{condition_template['suffix']}"
    
    variant["id"] = new_id
    
    # Update name with condition
    base_name = base_material.get("name", "Unknown Steel")
    # Remove any existing condition info from name
    clean_name = re.sub(r'\s+(annealed|normalized|q&t|hardened|cold worked).*$', '', base_name, flags=re.IGNORECASE)
    variant["name"] = f"{clean_name} {condition_template['name']}"
    
    # Update condition field
    variant["condition"] = condition_template["name"]
    
    # Calculate new hardness
    target_hb = condition_template["hb"]
    target_hrc = condition_template["hrc"]
    
    # Interpolate all properties
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
    
    # Update cutting parameters
    variant["kienzle"] = {
        "kc1_1": new_kc11,
        "mc": round(base_props["mc"] - (target_hb - base_props["hb"]) * 0.0001, 2)  # mc decreases slightly with hardness
    }
    
    variant["taylor"] = {
        "C": new_taylor_C,
        "n": new_taylor_n
    }
    
    variant["machinability"] = {
        "aisi_rating": new_mach,
        "relative_to_1212": round(new_mach / 100, 2)
    }
    
    variant["johnson_cook"] = new_jc
    
    # Update ISO group based on hardness
    if target_hrc and target_hrc >= 45:
        variant["iso_group"] = "H"  # Hard materials
    else:
        variant["iso_group"] = variant.get("iso_group", "P")
    
    # Add note about condition
    existing_note = variant.get("notes", "")
    condition_note = f"Generated condition variant: {condition_template['name']}"
    variant["notes"] = f"{existing_note}. {condition_note}" if existing_note else condition_note
    
    return variant


def process_material_file(filepath):
    """Process a single material file and generate condition variants"""
    print(f"\nProcessing: {filepath.name}")
    
    # Read the file
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract the materials object using regex
    # This handles the JS module format
    match = re.search(r'materials:\s*\{([\s\S]*)\}\s*\};', content)
    if not match:
        print(f"  WARNING: Could not parse materials from {filepath.name}")
        return None, 0, 0
    
    # Try to parse as JSON-like structure
    try:
        # Extract material entries
        materials_text = match.group(1)
        
        # Find all material IDs and their data
        material_pattern = r'"([A-Z]-[A-Z]{2}-\d+)":\s*(\{[\s\S]*?\n    \})'
        material_matches = re.findall(material_pattern, materials_text)
        
        if not material_matches:
            print(f"  WARNING: No materials found in {filepath.name}")
            return None, 0, 0
        
        base_materials = []
        for mat_id, mat_json in material_matches:
            try:
                # Clean up the JSON
                clean_json = mat_json.strip()
                if clean_json.endswith(','):
                    clean_json = clean_json[:-1]
                mat_data = json.loads(clean_json)
                mat_data["id"] = mat_id
                base_materials.append(mat_data)
            except json.JSONDecodeError as e:
                print(f"  WARNING: Could not parse material {mat_id}: {e}")
                continue
        
        print(f"  Found {len(base_materials)} base materials")
        
        # Generate condition variants
        all_variants = []
        skipped = 0
        variant_idx = 5000  # Start variant IDs at 5000 to avoid conflicts
        
        for material in base_materials:
            # Check if should skip
            if should_skip_material(material):
                skipped += 1
                all_variants.append(material)  # Keep original
                continue
            
            # Classify steel type
            steel_type = classify_steel_type(material)
            conditions = CONDITION_TEMPLATES.get(steel_type, CONDITION_TEMPLATES["alloy_steel"])
            
            # Get base properties
            base_props = get_base_condition(material)
            
            # Generate variants for each condition
            for condition in conditions:
                variant = generate_condition_variant(material, base_props, condition, variant_idx)
                all_variants.append(variant)
                variant_idx += 1
        
        new_count = len(all_variants) - len(base_materials)
        print(f"  Generated {new_count} new condition variants")
        print(f"  Skipped {skipped} materials (already have conditions)")
        
        return all_variants, new_count, skipped
        
    except Exception as e:
        print(f"  ERROR processing {filepath.name}: {e}")
        import traceback
        traceback.print_exc()
        return None, 0, 0


def write_enhanced_file(filepath, materials, original_content):
    """Write enhanced material file with condition variants"""
    # Determine output path
    rel_path = filepath.relative_to(INPUT_DIR)
    output_path = OUTPUT_DIR / rel_path.parent / f"{filepath.stem}_enhanced.js"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Extract metadata from original
    metadata_match = re.search(r'metadata:\s*(\{[^}]+\})', original_content)
    metadata_str = metadata_match.group(1) if metadata_match else '{}'
    
    # Build new file content
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Get variable name from original
    var_match = re.search(r'const\s+(\w+)\s*=', original_content)
    var_name = var_match.group(1) if var_match else "MATERIALS_ENHANCED"
    
    header = f'''/**
 * PRISM MATERIALS DATABASE - ENHANCED WITH CONDITION VARIANTS
 * Original: {filepath.name}
 * Enhanced: {output_path.name}
 * Generated: {timestamp}
 * 
 * This file contains the original materials PLUS heat treatment condition variants
 * with physics-based interpolated properties for each condition.
 */
const {var_name}_ENHANCED = {{
  metadata: {{
    file: "{output_path.name}",
    originalFile: "{filepath.name}",
    materialCount: {len(materials)},
    generatedDate: "{timestamp}",
    note: "Enhanced with heat treatment condition variants"
  }},
  materials: {{
'''
    
    # Build materials section
    material_strs = []
    for mat in materials:
        mat_str = f'    "{mat["id"]}": ' + json.dumps(mat, indent=6).replace('\n', '\n    ')
        material_strs.append(mat_str)
    
    footer = '''
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ''' + var_name + '''_ENHANCED;
}
'''
    
    content = header + ',\n\n'.join(material_strs) + footer
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  Wrote: {output_path}")
    print(f"  Size: {output_path.stat().st_size / 1024:.1f} KB")
    
    return output_path


def main():
    """Main entry point"""
    print("=" * 70)
    print("PRISM Condition Variant Generator")
    print("=" * 70)
    print(f"Input directory:  {INPUT_DIR}")
    print(f"Output directory: {OUTPUT_DIR}")
    print("")
    
    # Find all JS material files
    categories = ["P_STEELS", "M_STAINLESS", "N_NONFERROUS"]
    
    total_base = 0
    total_variants = 0
    total_skipped = 0
    processed_files = []
    
    log_entries = [f"PRISM Condition Variant Generator - {datetime.now()}\n", "=" * 70 + "\n\n"]
    
    for category in categories:
        category_path = INPUT_DIR / category
        if not category_path.exists():
            print(f"\nSkipping {category} - directory not found")
            continue
        
        print(f"\n{'=' * 70}")
        print(f"Processing {category}")
        print("=" * 70)
        
        js_files = list(category_path.glob("*.js"))
        print(f"Found {len(js_files)} files")
        
        for filepath in sorted(js_files):
            # Skip already enhanced files
            if "_enhanced" in filepath.name:
                continue
            
            with open(filepath, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            materials, new_count, skipped = process_material_file(filepath)
            
            if materials:
                output_path = write_enhanced_file(filepath, materials, original_content)
                total_base += len(materials) - new_count
                total_variants += new_count
                total_skipped += skipped
                processed_files.append((filepath.name, len(materials), new_count))
                
                log_entries.append(f"{filepath.name}: {len(materials)} total ({new_count} new variants)\n")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Files processed: {len(processed_files)}")
    print(f"Base materials:  {total_base}")
    print(f"New variants:    {total_variants}")
    print(f"Skipped:         {total_skipped}")
    print(f"Total materials: {total_base + total_variants}")
    print(f"\nOutput directory: {OUTPUT_DIR}")
    
    # Write log
    log_entries.append(f"\n{'=' * 70}\n")
    log_entries.append(f"SUMMARY\n")
    log_entries.append(f"Files processed: {len(processed_files)}\n")
    log_entries.append(f"Base materials:  {total_base}\n")
    log_entries.append(f"New variants:    {total_variants}\n")
    log_entries.append(f"Total materials: {total_base + total_variants}\n")
    
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        f.writelines(log_entries)
    
    print(f"\nLog written to: {LOG_FILE}")


if __name__ == "__main__":
    main()
