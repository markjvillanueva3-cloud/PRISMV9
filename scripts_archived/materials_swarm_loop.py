"""
PRISM MATERIALS SWARM LOOP v1.0
Iterative improvement loop - keeps running until target uniqueness achieved
8-worker parallel swarm with automatic detection and fixing
"""

import json
import math
import hashlib
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict

BASE_PATH = Path(r"C:\PRISM\data\materials")
TARGET_UNIQUENESS = 0.85  # 85% target
MAX_ITERATIONS = 10

# =============================================================================
# DUPLICATE DETECTION
# =============================================================================

def get_fingerprint(material):
    """Get parameter fingerprint for a material"""
    vals = []
    
    # Physical
    phys = material.get("physical", {})
    vals.append(phys.get("density", 0))
    
    # Mechanical
    mech = material.get("mechanical", {})
    hardness = mech.get("hardness", {})
    vals.append(hardness.get("brinell", 0) if isinstance(hardness, dict) else hardness or 0)
    
    tensile = mech.get("tensile_strength", {})
    vals.append(tensile.get("typical", 0) if isinstance(tensile, dict) else tensile or 0)
    
    # Kienzle
    kienzle = material.get("kienzle", {})
    vals.append(kienzle.get("kc1_1", 0))
    
    # Johnson-Cook
    jc = material.get("johnson_cook", {})
    vals.append(jc.get("A", 0))
    vals.append(jc.get("B", 0))
    
    # Taylor
    taylor = material.get("taylor", {})
    vals.append(taylor.get("C", 0))
    
    return tuple(round(v, 1) if v else 0 for v in vals)

def find_duplicates():
    """Find all duplicate parameter sets"""
    fingerprints = defaultdict(list)
    
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS",
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if not dir_path.exists():
            continue
        
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_"):
                continue
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for mat in data.get("materials", []):
                    if isinstance(mat, dict):
                        fp = get_fingerprint(mat)
                        fingerprints[fp].append({
                            "name": mat.get("name", "Unknown"),
                            "file": str(json_file),
                            "iso": iso_dir
                        })
            except:
                pass
    
    # Return only duplicates (>1 material with same fingerprint)
    return {k: v for k, v in fingerprints.items() if len(v) > 1}

# =============================================================================
# MATERIAL-SPECIFIC PROPERTY LOOKUP
# =============================================================================

# Comprehensive material database with unique properties
MATERIAL_DB = {
    # Steels - AISI grades with specific hardness
    "aisi 1010": {"hardness": 105, "tensile": 365},
    "aisi 1015": {"hardness": 111, "tensile": 385},
    "aisi 1018": {"hardness": 126, "tensile": 440},
    "aisi 1020": {"hardness": 111, "tensile": 395},
    "aisi 1025": {"hardness": 121, "tensile": 415},
    "aisi 1030": {"hardness": 137, "tensile": 470},
    "aisi 1035": {"hardness": 143, "tensile": 495},
    "aisi 1040": {"hardness": 149, "tensile": 520},
    "aisi 1045": {"hardness": 163, "tensile": 565},
    "aisi 1050": {"hardness": 179, "tensile": 620},
    "aisi 1055": {"hardness": 192, "tensile": 660},
    "aisi 1060": {"hardness": 201, "tensile": 690},
    "aisi 1070": {"hardness": 212, "tensile": 725},
    "aisi 1080": {"hardness": 229, "tensile": 770},
    "aisi 1095": {"hardness": 248, "tensile": 825},
    
    # Alloy steels
    "aisi 4130": {"hardness": 197, "tensile": 670},
    "aisi 4140": {"hardness": 217, "tensile": 745},
    "aisi 4145": {"hardness": 235, "tensile": 800},
    "aisi 4150": {"hardness": 245, "tensile": 830},
    "aisi 4340": {"hardness": 269, "tensile": 900},
    "aisi 8620": {"hardness": 187, "tensile": 640},
    "aisi 8640": {"hardness": 229, "tensile": 770},
    "aisi 9310": {"hardness": 207, "tensile": 710},
    
    # Stainless steels
    "304": {"hardness": 170, "tensile": 515, "density": 7930},
    "304l": {"hardness": 160, "tensile": 485, "density": 7930},
    "316": {"hardness": 175, "tensile": 530, "density": 7990},
    "316l": {"hardness": 165, "tensile": 500, "density": 7990},
    "321": {"hardness": 170, "tensile": 515, "density": 7920},
    "347": {"hardness": 180, "tensile": 540, "density": 7960},
    "410": {"hardness": 200, "tensile": 520, "density": 7740},
    "420": {"hardness": 240, "tensile": 690, "density": 7740},
    "430": {"hardness": 180, "tensile": 515, "density": 7700},
    "440c": {"hardness": 580, "tensile": 1970, "density": 7680},
    "17-4ph": {"hardness": 350, "tensile": 1100, "density": 7780},
    "15-5ph": {"hardness": 340, "tensile": 1070, "density": 7780},
    
    # Aluminum alloys
    "2011": {"hardness": 95, "tensile": 380, "density": 2830},
    "2014": {"hardness": 135, "tensile": 485, "density": 2800},
    "2017": {"hardness": 105, "tensile": 425, "density": 2790},
    "2024": {"hardness": 120, "tensile": 470, "density": 2780},
    "5052": {"hardness": 60, "tensile": 230, "density": 2680},
    "5083": {"hardness": 75, "tensile": 290, "density": 2660},
    "6061": {"hardness": 95, "tensile": 310, "density": 2700},
    "6063": {"hardness": 73, "tensile": 240, "density": 2690},
    "7050": {"hardness": 150, "tensile": 550, "density": 2830},
    "7075": {"hardness": 150, "tensile": 570, "density": 2810},
    "7178": {"hardness": 160, "tensile": 595, "density": 2830},
    
    # Titanium
    "ti-6al-4v": {"hardness": 350, "tensile": 1050, "density": 4430},
    "ti-6al-4v eli": {"hardness": 340, "tensile": 1000, "density": 4430},
    "ti-6al-2sn": {"hardness": 330, "tensile": 970, "density": 4480},
    "ti-5al-2.5sn": {"hardness": 320, "tensile": 860, "density": 4480},
    "grade 2": {"hardness": 145, "tensile": 345, "density": 4510},
    "grade 5": {"hardness": 350, "tensile": 1050, "density": 4430},
    "grade 23": {"hardness": 340, "tensile": 1000, "density": 4430},
    
    # Superalloys
    "inconel 600": {"hardness": 180, "tensile": 650, "density": 8470},
    "inconel 617": {"hardness": 200, "tensile": 750, "density": 8360},
    "inconel 625": {"hardness": 250, "tensile": 900, "density": 8440},
    "inconel 718": {"hardness": 400, "tensile": 1200, "density": 8190},
    "inconel 725": {"hardness": 350, "tensile": 1100, "density": 8280},
    "inconel x-750": {"hardness": 360, "tensile": 1150, "density": 8280},
    "hastelloy c-276": {"hardness": 190, "tensile": 790, "density": 8890},
    "hastelloy x": {"hardness": 200, "tensile": 785, "density": 8220},
    "waspaloy": {"hardness": 380, "tensile": 1250, "density": 8190},
    "rene 41": {"hardness": 400, "tensile": 1350, "density": 8250},
    "rene 80": {"hardness": 420, "tensile": 1000, "density": 8160},
    
    # Cast iron classes
    "class 20": {"hardness": 156, "tensile": 152, "density": 7050},
    "class 25": {"hardness": 174, "tensile": 179, "density": 7100},
    "class 30": {"hardness": 187, "tensile": 214, "density": 7150},
    "class 35": {"hardness": 207, "tensile": 252, "density": 7200},
    "class 40": {"hardness": 217, "tensile": 293, "density": 7250},
    "class 45": {"hardness": 229, "tensile": 321, "density": 7280},
    "class 50": {"hardness": 241, "tensile": 362, "density": 7300},
    "class 55": {"hardness": 255, "tensile": 393, "density": 7320},
    "class 60": {"hardness": 269, "tensile": 431, "density": 7350},
    
    # Ductile iron grades
    "60-40-18": {"hardness": 140, "tensile": 414, "density": 7100},
    "65-45-12": {"hardness": 160, "tensile": 448, "density": 7100},
    "80-55-06": {"hardness": 200, "tensile": 552, "density": 7150},
    "100-70-03": {"hardness": 250, "tensile": 690, "density": 7200},
    "120-90-02": {"hardness": 300, "tensile": 827, "density": 7200},
    
    # Copper alloys
    "c11000": {"hardness": 45, "tensile": 220, "density": 8940},
    "c14500": {"hardness": 55, "tensile": 255, "density": 8940},
    "c17200": {"hardness": 200, "tensile": 680, "density": 8250},
    "c17500": {"hardness": 180, "tensile": 620, "density": 8750},
    "c26000": {"hardness": 55, "tensile": 325, "density": 8530},
    "c27000": {"hardness": 58, "tensile": 340, "density": 8470},
    "c36000": {"hardness": 78, "tensile": 340, "density": 8500},
    "c46400": {"hardness": 90, "tensile": 380, "density": 8410},
    "c51000": {"hardness": 80, "tensile": 325, "density": 8860},
    "c52100": {"hardness": 95, "tensile": 380, "density": 8800},
    "c61400": {"hardness": 150, "tensile": 515, "density": 7890},
    "c63000": {"hardness": 180, "tensile": 620, "density": 7580},
    "c71500": {"hardness": 140, "tensile": 385, "density": 8940},
    "c93200": {"hardness": 65, "tensile": 240, "density": 8930},
    
    # Polymers
    "peek": {"hardness": 100, "tensile": 100, "density": 1300},
    "pei": {"hardness": 95, "tensile": 105, "density": 1270},
    "pps": {"hardness": 90, "tensile": 80, "density": 1350},
    "pbt": {"hardness": 78, "tensile": 55, "density": 1310},
    "pet": {"hardness": 80, "tensile": 80, "density": 1380},
    "pa6": {"hardness": 75, "tensile": 78, "density": 1130},
    "pa66": {"hardness": 80, "tensile": 85, "density": 1140},
    "pa12": {"hardness": 70, "tensile": 50, "density": 1020},
    "pom": {"hardness": 80, "tensile": 70, "density": 1410},
    "pc": {"hardness": 85, "tensile": 65, "density": 1200},
    "abs": {"hardness": 70, "tensile": 45, "density": 1050},
    "pmma": {"hardness": 95, "tensile": 75, "density": 1180},
    "pvc": {"hardness": 80, "tensile": 50, "density": 1400},
    "ptfe": {"hardness": 55, "tensile": 25, "density": 2200},
    "hdpe": {"hardness": 60, "tensile": 30, "density": 960},
    "pp": {"hardness": 65, "tensile": 35, "density": 905},
    
    # Ceramics
    "alumina 99.5": {"hardness": 1600, "tensile": 310, "density": 3960},
    "alumina 96": {"hardness": 1400, "tensile": 260, "density": 3750},
    "alumina 85": {"hardness": 1200, "tensile": 200, "density": 3400},
    "zirconia ysz": {"hardness": 1200, "tensile": 400, "density": 6050},
    "zirconia psz": {"hardness": 1100, "tensile": 350, "density": 5750},
    "silicon carbide": {"hardness": 2800, "tensile": 450, "density": 3100},
    "silicon nitride": {"hardness": 1500, "tensile": 700, "density": 3200},
    "boron carbide": {"hardness": 3000, "tensile": 350, "density": 2520},
    
    # Wood (Janka to Brinell approximation)
    "balsa": {"hardness": 1.5, "tensile": 15, "density": 160},
    "cedar": {"hardness": 2.5, "tensile": 50, "density": 380},
    "pine": {"hardness": 3.8, "tensile": 60, "density": 510},
    "poplar": {"hardness": 3.2, "tensile": 55, "density": 540},
    "birch": {"hardness": 6.0, "tensile": 95, "density": 670},
    "cherry": {"hardness": 4.8, "tensile": 85, "density": 580},
    "walnut": {"hardness": 5.1, "tensile": 90, "density": 650},
    "ash": {"hardness": 6.3, "tensile": 100, "density": 680},
    "oak": {"hardness": 6.5, "tensile": 100, "density": 750},
    "maple": {"hardness": 7.0, "tensile": 110, "density": 700},
    "beech": {"hardness": 6.2, "tensile": 105, "density": 720},
    "hickory": {"hardness": 8.5, "tensile": 120, "density": 830},
    "rosewood": {"hardness": 8.2, "tensile": 115, "density": 850},
    "ebony": {"hardness": 14.0, "tensile": 150, "density": 1100},
    "ipe": {"hardness": 16.0, "tensile": 180, "density": 1100},
}

# =============================================================================
# PHYSICS CALCULATIONS
# =============================================================================

def calc_physics(hardness, tensile, density, material_type):
    """Calculate all physics parameters from base properties"""
    if not hardness:
        hardness = 200
    if not tensile:
        tensile = hardness * 3.5
    if not density:
        density = 7850
    
    # Material type coefficients
    type_coeffs = {
        "steel": {"kc_base": 1400, "mc": 0.25, "jc_c": 0.014, "taylor_base": 350},
        "stainless": {"kc_base": 1650, "mc": 0.21, "jc_c": 0.012, "taylor_base": 180},
        "cast_iron": {"kc_base": 1000, "mc": 0.26, "jc_c": 0.008, "taylor_base": 250},
        "aluminum": {"kc_base": 600, "mc": 0.30, "jc_c": 0.002, "taylor_base": 1500},
        "titanium": {"kc_base": 1350, "mc": 0.23, "jc_c": 0.028, "taylor_base": 80},
        "superalloy": {"kc_base": 2200, "mc": 0.18, "jc_c": 0.016, "taylor_base": 50},
        "copper": {"kc_base": 700, "mc": 0.28, "jc_c": 0.009, "taylor_base": 800},
        "polymer": {"kc_base": 80, "mc": 0.40, "jc_c": 0.050, "taylor_base": 2000},
        "ceramic": {"kc_base": 2800, "mc": 0.15, "jc_c": 0.001, "taylor_base": 30},
        "wood": {"kc_base": 30, "mc": 0.50, "jc_c": 0.001, "taylor_base": 3000},
        "composite": {"kc_base": 300, "mc": 0.32, "jc_c": 0.005, "taylor_base": 150},
    }
    
    coeffs = type_coeffs.get(material_type, type_coeffs["steel"])
    ref_hb = {"steel": 200, "aluminum": 80, "titanium": 320, "copper": 60, 
              "polymer": 20, "ceramic": 1200, "wood": 5}.get(material_type, 200)
    
    # Kienzle
    kc1_1 = coeffs["kc_base"] * math.pow(hardness / ref_hb, 0.4)
    mc = coeffs["mc"] - 0.0003 * (hardness - ref_hb)
    mc = max(0.12, min(0.50, mc))
    
    # Johnson-Cook
    yield_str = tensile * 0.85
    jc_A = yield_str
    jc_B = (tensile - yield_str) * 2.5 + 100
    jc_n = 0.6 - 0.001 * hardness
    jc_n = max(0.05, min(0.8, jc_n))
    jc_C = coeffs["jc_c"]
    jc_m = 1.0
    
    # Taylor
    taylor_C = coeffs["taylor_base"] * math.pow(ref_hb / max(hardness, 10), 0.6)
    taylor_n = 0.25 - 0.0002 * (hardness - ref_hb)
    taylor_n = max(0.08, min(0.60, taylor_n))
    
    return {
        "kienzle": {"kc1_1": round(kc1_1, 0), "mc": round(mc, 3)},
        "johnson_cook": {"A": round(jc_A, 0), "B": round(jc_B, 0), "n": round(jc_n, 3), 
                        "C": round(jc_C, 4), "m": round(jc_m, 2)},
        "taylor": {"C": round(taylor_C, 0), "n": round(taylor_n, 3)}
    }

def detect_material_type(name, iso_group):
    """Detect material type from name and ISO group"""
    name_lower = name.lower()
    
    if any(x in name_lower for x in ["stainless", "304", "316", "410", "420", "17-4", "15-5"]):
        return "stainless"
    if any(x in name_lower for x in ["inconel", "hastelloy", "waspaloy", "rene", "nimonic"]):
        return "superalloy"
    if any(x in name_lower for x in ["titanium", "ti-6al", "ti-", "grade 5"]):
        return "titanium"
    if any(x in name_lower for x in ["aluminum", "aluminium", "6061", "7075", "2024"]):
        return "aluminum"
    if any(x in name_lower for x in ["cast iron", "gray iron", "ductile", "class "]):
        return "cast_iron"
    if any(x in name_lower for x in ["copper", "brass", "bronze", "c11", "c26", "c36"]):
        return "copper"
    if any(x in name_lower for x in ["peek", "nylon", "pa6", "pom", "abs", "pvc", "polymer"]):
        return "polymer"
    if any(x in name_lower for x in ["ceramic", "alumina", "zirconia", "carbide"]):
        return "ceramic"
    if any(x in name_lower for x in ["wood", "oak", "maple", "pine", "cedar"]):
        return "wood"
    if any(x in name_lower for x in ["cfrp", "gfrp", "composite", "carbon fiber"]):
        return "composite"
    
    iso_map = {"P": "steel", "M": "stainless", "K": "cast_iron", "N": "aluminum",
               "S": "superalloy", "H": "steel", "X": "polymer"}
    return iso_map.get(iso_group, "steel")

# =============================================================================
# FIX DUPLICATE MATERIALS
# =============================================================================

def fix_material(material, name_lower, iso_group):
    """Apply unique properties to a material"""
    changed = False
    
    # Try to find in database
    for pattern, props in MATERIAL_DB.items():
        if pattern in name_lower:
            if "physical" not in material:
                material["physical"] = {}
            if "mechanical" not in material:
                material["mechanical"] = {}
            
            if "density" in props:
                material["physical"]["density"] = props["density"]
            material["mechanical"]["hardness"] = {"brinell": props["hardness"]}
            material["mechanical"]["tensile_strength"] = {"typical": props["tensile"]}
            changed = True
            break
    
    # If still has default steel density but shouldn't, fix it
    mat_type = detect_material_type(material.get("name", ""), iso_group)
    density = material.get("physical", {}).get("density", 7850)
    
    if abs(density - 7850) < 100 and mat_type not in ["steel", "stainless"]:
        # Wrong density - apply correct default
        type_density = {
            "aluminum": 2700, "titanium": 4430, "superalloy": 8200,
            "copper": 8940, "cast_iron": 7150, "polymer": 1200,
            "ceramic": 3900, "wood": 700, "composite": 1600
        }
        material["physical"]["density"] = type_density.get(mat_type, 7850)
        changed = True
    
    # Recalculate physics if changed
    if changed:
        mech = material.get("mechanical", {})
        hardness = mech.get("hardness", {})
        hardness_val = hardness.get("brinell") if isinstance(hardness, dict) else hardness
        tensile = mech.get("tensile_strength", {})
        tensile_val = tensile.get("typical") if isinstance(tensile, dict) else tensile
        density = material.get("physical", {}).get("density", 7850)
        
        physics = calc_physics(hardness_val, tensile_val, density, mat_type)
        material["kienzle"] = physics["kienzle"]
        material["johnson_cook"] = physics["johnson_cook"]
        material["taylor"] = physics["taylor"]
    
    return material, changed

def process_file(json_file, duplicates_set):
    """Process a file and fix duplicate materials"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        iso_group = json_file.parent.name[0]
        changes = 0
        
        for i, mat in enumerate(materials):
            if not isinstance(mat, dict):
                continue
            
            fp = get_fingerprint(mat)
            if fp in duplicates_set:
                name_lower = mat.get("name", "").lower()
                materials[i], changed = fix_material(mat, name_lower, iso_group)
                if changed:
                    changes += 1
        
        if changes > 0:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return changes
    except Exception as e:
        return 0

# =============================================================================
# MAIN SWARM LOOP
# =============================================================================

def run_iteration(iteration):
    """Run one iteration of the swarm fix"""
    print(f"\n{'='*80}")
    print(f"ITERATION {iteration}")
    print(f"{'='*80}")
    
    # Find duplicates
    duplicates = find_duplicates()
    dup_fingerprints = set(duplicates.keys())
    total_dup_materials = sum(len(v) for v in duplicates.values())
    
    print(f"Found {len(duplicates)} duplicate fingerprints affecting {total_dup_materials} materials")
    
    if not duplicates:
        return 0, 100.0
    
    # Collect all files
    files = []
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS",
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if dir_path.exists():
            for f in dir_path.glob("*.json"):
                if not f.name.startswith("_"):
                    files.append(f)
    
    # Process in parallel
    total_fixed = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_file, f, dup_fingerprints): f for f in files}
        for future in as_completed(futures):
            fixed = future.result()
            if fixed > 0:
                total_fixed += fixed
    
    print(f"Fixed {total_fixed} materials")
    
    # Calculate new uniqueness
    all_fingerprints = []
    total_materials = 0
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS",
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if not dir_path.exists():
            continue
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_"):
                continue
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                for mat in data.get("materials", []):
                    if isinstance(mat, dict):
                        all_fingerprints.append(get_fingerprint(mat))
                        total_materials += 1
            except:
                pass
    
    unique = len(set(all_fingerprints))
    uniqueness = unique / total_materials if total_materials > 0 else 0
    
    print(f"Uniqueness: {uniqueness*100:.1f}% ({unique}/{total_materials})")
    
    return total_fixed, uniqueness

def main():
    print("="*80)
    print("PRISM MATERIALS SWARM LOOP v1.0")
    print("Target uniqueness:", TARGET_UNIQUENESS*100, "%")
    print("Max iterations:", MAX_ITERATIONS)
    print("="*80)
    
    start_time = datetime.now()
    
    for iteration in range(1, MAX_ITERATIONS + 1):
        fixed, uniqueness = run_iteration(iteration)
        
        if uniqueness >= TARGET_UNIQUENESS:
            print(f"\n{'='*80}")
            print(f"TARGET ACHIEVED! {uniqueness*100:.1f}% uniqueness")
            print(f"{'='*80}")
            break
        
        if fixed == 0:
            print(f"\nNo more fixes possible at {uniqueness*100:.1f}% uniqueness")
            break
    
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\nTotal time: {elapsed:.1f}s")

if __name__ == "__main__":
    main()
