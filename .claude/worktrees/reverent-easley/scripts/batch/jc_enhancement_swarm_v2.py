#!/usr/bin/env python3
"""
PRISM Johnson-Cook Enhancement Swarm v2.0
==========================================
Purpose: Add Johnson-Cook constitutive parameters to materials
Fixes: Pattern matching for double-quoted IDs
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime

MATERIALS_ROOT = Path(r"C:\PRISM\data\materials\N_NONFERROUS")
LOG_FILE = Path(r"C:\PRISM\state\logs\jc_enhancement_log_v2.json")

# Johnson-Cook reference data by alloy
JC_ALUMINUM_DATA = {
    "1050": {"A": 25, "B": 130, "n": 0.24, "C": 0.014, "m": 1.0},
    "1060": {"A": 30, "B": 125, "n": 0.23, "C": 0.013, "m": 1.0},
    "1100": {"A": 35, "B": 135, "n": 0.25, "C": 0.015, "m": 1.0},
    "2011": {"A": 325, "B": 400, "n": 0.40, "C": 0.008, "m": 1.65},
    "2014": {"A": 360, "B": 426, "n": 0.42, "C": 0.0083, "m": 1.7},
    "2017": {"A": 340, "B": 410, "n": 0.41, "C": 0.008, "m": 1.65},
    "2024": {"A": 352, "B": 440, "n": 0.42, "C": 0.0083, "m": 1.7},
    "2219": {"A": 300, "B": 380, "n": 0.40, "C": 0.0075, "m": 1.6},
    "3003": {"A": 50, "B": 170, "n": 0.28, "C": 0.016, "m": 1.1},
    "3004": {"A": 85, "B": 210, "n": 0.30, "C": 0.017, "m": 1.15},
    "3105": {"A": 55, "B": 175, "n": 0.28, "C": 0.016, "m": 1.1},
    "5052": {"A": 130, "B": 290, "n": 0.36, "C": 0.018, "m": 1.2},
    "5083": {"A": 167, "B": 596, "n": 0.551, "C": 0.001, "m": 0.859},
    "5086": {"A": 145, "B": 350, "n": 0.40, "C": 0.015, "m": 1.15},
    "5754": {"A": 140, "B": 320, "n": 0.38, "C": 0.016, "m": 1.17},
    "6005": {"A": 240, "B": 148, "n": 0.33, "C": 0.013, "m": 1.32},
    "6061": {"A": 270, "B": 154, "n": 0.34, "C": 0.015, "m": 1.34},
    "6063": {"A": 185, "B": 140, "n": 0.32, "C": 0.012, "m": 1.30},
    "6082": {"A": 295, "B": 165, "n": 0.35, "C": 0.014, "m": 1.32},
    "7050": {"A": 450, "B": 510, "n": 0.41, "C": 0.012, "m": 1.5},
    "7075": {"A": 460, "B": 500, "n": 0.4, "C": 0.012, "m": 1.5},
    "7175": {"A": 455, "B": 505, "n": 0.40, "C": 0.012, "m": 1.5},
    "7475": {"A": 465, "B": 515, "n": 0.41, "C": 0.012, "m": 1.5},
}

JC_COPPER_DATA = {
    "C10100": {"A": 90, "B": 292, "n": 0.31, "C": 0.025, "m": 1.09},
    "C10200": {"A": 90, "B": 290, "n": 0.31, "C": 0.025, "m": 1.09},
    "C11000": {"A": 90, "B": 292, "n": 0.31, "C": 0.025, "m": 1.09},
    "C12200": {"A": 95, "B": 295, "n": 0.31, "C": 0.024, "m": 1.10},
    "C14500": {"A": 100, "B": 310, "n": 0.32, "C": 0.022, "m": 1.12},
    "C17200": {"A": 380, "B": 720, "n": 0.48, "C": 0.022, "m": 1.55},
    "C26000": {"A": 112, "B": 505, "n": 0.42, "C": 0.009, "m": 1.68},
    "C27000": {"A": 108, "B": 485, "n": 0.41, "C": 0.008, "m": 1.65},
    "C28000": {"A": 105, "B": 470, "n": 0.40, "C": 0.008, "m": 1.62},
    "C36000": {"A": 115, "B": 380, "n": 0.35, "C": 0.012, "m": 1.45},
    "C51000": {"A": 170, "B": 420, "n": 0.38, "C": 0.015, "m": 1.35},
    "C52100": {"A": 180, "B": 440, "n": 0.39, "C": 0.016, "m": 1.38},
    "C54400": {"A": 165, "B": 400, "n": 0.36, "C": 0.014, "m": 1.32},
    "C61400": {"A": 220, "B": 520, "n": 0.42, "C": 0.018, "m": 1.45},
    "C63000": {"A": 285, "B": 580, "n": 0.45, "C": 0.020, "m": 1.50},
    "C65500": {"A": 145, "B": 480, "n": 0.40, "C": 0.016, "m": 1.40},
    "C70600": {"A": 195, "B": 480, "n": 0.40, "C": 0.017, "m": 1.42},
    "C71500": {"A": 210, "B": 510, "n": 0.42, "C": 0.018, "m": 1.45},
}

# Defaults by series/type
AL_DEFAULTS = {
    "1": {"A": 30, "B": 130, "n": 0.24, "C": 0.014, "m": 1.0},
    "2": {"A": 350, "B": 430, "n": 0.42, "C": 0.008, "m": 1.7},
    "3": {"A": 60, "B": 185, "n": 0.29, "C": 0.016, "m": 1.12},
    "5": {"A": 145, "B": 370, "n": 0.40, "C": 0.015, "m": 1.15},
    "6": {"A": 260, "B": 155, "n": 0.34, "C": 0.014, "m": 1.32},
    "7": {"A": 458, "B": 508, "n": 0.41, "C": 0.012, "m": 1.5},
}

CU_DEFAULTS = {
    "C1": {"A": 92, "B": 295, "n": 0.31, "C": 0.025, "m": 1.09},  # Pure
    "C2": {"A": 108, "B": 480, "n": 0.41, "C": 0.009, "m": 1.62},  # Brass
    "C3": {"A": 115, "B": 380, "n": 0.35, "C": 0.012, "m": 1.45},  # Leaded brass
    "C5": {"A": 172, "B": 420, "n": 0.38, "C": 0.015, "m": 1.35},  # Phosphor bronze
    "C6": {"A": 250, "B": 550, "n": 0.43, "C": 0.019, "m": 1.47},  # Al bronze
    "C7": {"A": 200, "B": 495, "n": 0.41, "C": 0.017, "m": 1.43},  # CuNi
}


def get_al_jc_params(name: str) -> dict:
    """Get J-C params for aluminum based on name/designation."""
    # Try to extract alloy number
    for alloy, params in JC_ALUMINUM_DATA.items():
        if alloy in name:
            return params.copy()
    
    # Fall back to series default
    for series, params in AL_DEFAULTS.items():
        if series in name:
            return params.copy()
    
    # Ultimate default
    return AL_DEFAULTS["6"].copy()


def get_cu_jc_params(name: str) -> dict:
    """Get J-C params for copper based on name/designation."""
    for alloy, params in JC_COPPER_DATA.items():
        if alloy in name.upper():
            return params.copy()
    
    for prefix, params in CU_DEFAULTS.items():
        if prefix in name.upper():
            return params.copy()
    
    return CU_DEFAULTS["C2"].copy()


def process_aluminum_file(filepath: Path) -> dict:
    """Process an aluminum material file and add J-C params."""
    result = {"file": filepath.name, "materials": 0, "jc_added": 0, "errors": []}
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all material entries with pattern "N-AL-XXX"
        # Pattern: "id": "N-AL-XXX"
        pattern = r'"id":\s*"(N-AL-\d+)"'
        matches = re.findall(pattern, content)
        result["materials"] = len(matches)
        
        # Also find the alloy names
        name_pattern = r'"name":\s*"([^"]+)"'
        names = re.findall(name_pattern, content)
        
        # Build J-C lookup
        jc_lookup = {}
        for i, mid in enumerate(matches):
            name = names[i] if i < len(names) else mid
            jc_lookup[mid] = get_al_jc_params(name)
        
        # Generate J-C params string
        jc_str = ""
        for mid, params in jc_lookup.items():
            jc_str += f'  "{mid}": {{"A": {params["A"]}, "B": {params["B"]}, "n": {params["n"]}, "C": {params["C"]}, "m": {params["m"]}}},\n'
        
        # Replace empty JOHNSON_COOK_PARAMS
        old_pattern = r"const JOHNSON_COOK_PARAMS = \{\n\};"
        new_section = f"const JOHNSON_COOK_PARAMS = {{\n{jc_str}}};"
        
        if re.search(old_pattern, content):
            content = re.sub(old_pattern, new_section, content)
            result["jc_added"] = len(jc_lookup)
        else:
            # Need to add the section
            insert_pos = content.find("const ALUMINUM_TEMPER_CONDITIONS")
            if insert_pos == -1:
                insert_pos = content.find("const ALUMINUM_6XXX")
            if insert_pos > 0:
                header = f"""
// ═══════════════════════════════════════════════════════════════════════════
// JOHNSON-COOK CONSTITUTIVE MODEL PARAMETERS
// Added by PRISM Enhancement Swarm v2.0
// Date: {datetime.now().strftime("%Y-%m-%d")}
// ═══════════════════════════════════════════════════════════════════════════

{new_section}

"""
                content = content[:insert_pos] + header + content[insert_pos:]
                result["jc_added"] = len(jc_lookup)
        
        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
    except Exception as e:
        result["errors"].append(str(e))
    
    return result


def process_copper_file(filepath: Path) -> dict:
    """Process a copper material file and add J-C params."""
    result = {"file": filepath.name, "materials": 0, "jc_added": 0, "errors": []}
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all material entries
        pattern = r'"id":\s*"(N-CU-\d+)"'
        matches = re.findall(pattern, content)
        result["materials"] = len(matches)
        
        name_pattern = r'"name":\s*"([^"]+)"'
        names = re.findall(name_pattern, content)
        
        # Build J-C lookup
        jc_lookup = {}
        for i, mid in enumerate(matches):
            name = names[i] if i < len(names) else mid
            jc_lookup[mid] = get_cu_jc_params(name)
        
        # Generate J-C params string
        jc_str = ""
        for mid, params in jc_lookup.items():
            jc_str += f'  "{mid}": {{"A": {params["A"]}, "B": {params["B"]}, "n": {params["n"]}, "C": {params["C"]}, "m": {params["m"]}}},\n'
        
        # Find insertion point (before COPPER_TEMPER_CONDITIONS)
        insert_pattern = r"(const COPPER_TEMPER_CONDITIONS)"
        
        header = f"""
// ═══════════════════════════════════════════════════════════════════════════
// JOHNSON-COOK CONSTITUTIVE MODEL PARAMETERS
// Added by PRISM Enhancement Swarm v2.0
// Date: {datetime.now().strftime("%Y-%m-%d")}
// ═══════════════════════════════════════════════════════════════════════════

const JOHNSON_COOK_PARAMS = {{
{jc_str}}};

"""
        content = re.sub(insert_pattern, header + r"\1", content)
        result["jc_added"] = len(jc_lookup)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
    except Exception as e:
        result["errors"].append(str(e))
    
    return result


def main():
    print("=" * 70)
    print("PRISM Johnson-Cook Enhancement Swarm v2.0")
    print("=" * 70)
    
    results = []
    
    # Process aluminum files
    al_files = [
        "aluminum_6xxx_031_050.js",
        "aluminum_6xxx_045_050.js",
        "aluminum_temper_conditions.js"
    ]
    
    for f in al_files:
        fp = MATERIALS_ROOT / f
        if fp.exists():
            print(f"\nProcessing: {f}")
            r = process_aluminum_file(fp)
            results.append(r)
            print(f"  Materials: {r['materials']}, J-C Added: {r['jc_added']}")
            if r['errors']:
                print(f"  Errors: {r['errors']}")
        else:
            print(f"  NOT FOUND: {f}")
    
    # Process copper file
    cu_file = MATERIALS_ROOT / "copper_temper_conditions.js"
    if cu_file.exists():
        print(f"\nProcessing: copper_temper_conditions.js")
        r = process_copper_file(cu_file)
        results.append(r)
        print(f"  Materials: {r['materials']}, J-C Added: {r['jc_added']}")
        if r['errors']:
            print(f"  Errors: {r['errors']}")
    
    # Summary
    total_materials = sum(r['materials'] for r in results)
    total_jc = sum(r['jc_added'] for r in results)
    
    print("\n" + "=" * 70)
    print("ENHANCEMENT COMPLETE")
    print("=" * 70)
    print(f"Total Materials: {total_materials}")
    print(f"Johnson-Cook Added: {total_jc}")
    
    # Save log
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_materials": total_materials,
            "total_jc_added": total_jc,
            "files": results
        }, f, indent=2)
    
    print(f"Log: {LOG_FILE}")


if __name__ == "__main__":
    main()
