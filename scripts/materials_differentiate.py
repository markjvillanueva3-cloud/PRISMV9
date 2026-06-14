"""
PRISM FINAL DIFFERENTIATION ENGINE
Fix remaining duplicate clusters with unique values
"""

import json
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_PATH = Path(r"C:\PRISM\data\materials")

# =============================================================================
# HEAT TREATMENT HARDNESS ADJUSTMENTS
# Heat treatment significantly affects hardness, which drives all other params
# =============================================================================

HEAT_TREATMENT_MODIFIERS = {
    # Temperature-based Q&T
    "q&t 400": {"hardness_mult": 1.4, "tensile_mult": 1.35},
    "q&t 600": {"hardness_mult": 1.25, "tensile_mult": 1.22},
    "q&t 800": {"hardness_mult": 1.1, "tensile_mult": 1.08},
    "q&t 1000": {"hardness_mult": 0.95, "tensile_mult": 0.92},
    "q&t 1200": {"hardness_mult": 0.85, "tensile_mult": 0.82},
    
    # HRC-based
    "30 hrc": {"hardness_abs": 280, "tensile_abs": 950},
    "32 hrc": {"hardness_abs": 300, "tensile_abs": 1000},
    "34 hrc": {"hardness_abs": 320, "tensile_abs": 1050},
    "36 hrc": {"hardness_abs": 340, "tensile_abs": 1100},
    "38 hrc": {"hardness_abs": 360, "tensile_abs": 1150},
    "40 hrc": {"hardness_abs": 380, "tensile_abs": 1200},
    "42 hrc": {"hardness_abs": 400, "tensile_abs": 1280},
    "44 hrc": {"hardness_abs": 420, "tensile_abs": 1350},
    "45 hrc": {"hardness_abs": 430, "tensile_abs": 1400},
    "46 hrc": {"hardness_abs": 440, "tensile_abs": 1450},
    "48 hrc": {"hardness_abs": 460, "tensile_abs": 1500},
    "50 hrc": {"hardness_abs": 480, "tensile_abs": 1580},
    "52 hrc": {"hardness_abs": 510, "tensile_abs": 1680},
    "54 hrc": {"hardness_abs": 540, "tensile_abs": 1780},
    "55 hrc": {"hardness_abs": 560, "tensile_abs": 1850},
    "56 hrc": {"hardness_abs": 580, "tensile_abs": 1920},
    "58 hrc": {"hardness_abs": 610, "tensile_abs": 2000},
    "60 hrc": {"hardness_abs": 650, "tensile_abs": 2150},
    "62 hrc": {"hardness_abs": 700, "tensile_abs": 2300},
    "63 hrc": {"hardness_abs": 720, "tensile_abs": 2380},
    "64 hrc": {"hardness_abs": 750, "tensile_abs": 2450},
    "65 hrc": {"hardness_abs": 780, "tensile_abs": 2550},
    "66 hrc": {"hardness_abs": 810, "tensile_abs": 2650},
    
    # Condition-based
    "annealed": {"hardness_mult": 0.8, "tensile_mult": 0.75},
    "normalized": {"hardness_mult": 0.9, "tensile_mult": 0.88},
    "cold worked": {"hardness_mult": 1.15, "tensile_mult": 1.12},
    "cold drawn": {"hardness_mult": 1.1, "tensile_mult": 1.08},
    "hot rolled": {"hardness_mult": 0.85, "tensile_mult": 0.82},
    "stress relieved": {"hardness_mult": 0.95, "tensile_mult": 0.92},
    "hardened": {"hardness_mult": 1.3, "tensile_mult": 1.25},
    "tempered": {"hardness_mult": 1.2, "tensile_mult": 1.15},
    
    # Stainless conditions
    "1/4 hard": {"hardness_mult": 1.2, "tensile_mult": 1.18},
    "1/2 hard": {"hardness_mult": 1.35, "tensile_mult": 1.32},
    "3/4 hard": {"hardness_mult": 1.5, "tensile_mult": 1.45},
    "full hard": {"hardness_mult": 1.65, "tensile_mult": 1.58},
    
    # Aged/solution treated
    "aged": {"hardness_mult": 1.4, "tensile_mult": 1.35},
    "peak aged": {"hardness_mult": 1.45, "tensile_mult": 1.4},
    "overaged": {"hardness_mult": 1.25, "tensile_mult": 1.2},
    "solution treated": {"hardness_mult": 0.75, "tensile_mult": 0.72},
}

# Wood species specific hardness (Janka)
WOOD_HARDNESS = {
    "balsa": 100, "basswood": 410, "cedar": 350, "pine": 690, "poplar": 540,
    "willow": 280, "spruce": 510, "fir": 490, "hemlock": 500, "cypress": 510,
    "redwood": 450, "alder": 590, "birch": 1260, "cherry": 950, "walnut": 1010,
    "ash": 1320, "oak": 1360, "maple": 1450, "beech": 1300, "hickory": 1820,
    "pecan": 1820, "locust": 1700, "rosewood": 1780, "teak": 1155, "mahogany": 800,
    "ebony": 3220, "ipe": 3680, "bamboo": 1380, "mdf": 300, "plywood": 450,
    "osb": 350, "particleboard": 250,
}

# Cast iron class-specific tensile
CAST_IRON_TENSILE = {
    "class 20": 150, "class 25": 175, "class 30": 210, "class 35": 245,
    "class 40": 280, "class 45": 315, "class 50": 350, "class 55": 385,
    "class 60": 420, "60-40-18": 420, "65-45-12": 450, "80-55-06": 550,
    "100-70-03": 700, "120-90-02": 830, "grade 300": 300, "grade 350": 350,
    "grade 400": 400, "grade 450": 450,
}

# AM Metal properties by alloy
AM_METALS = {
    "alsi10mg": {"density": 2680, "hardness": 120, "tensile": 400},
    "alsi12": {"density": 2660, "hardness": 110, "tensile": 350},
    "scalmalloy": {"density": 2670, "hardness": 140, "tensile": 520},
    "316l": {"density": 7990, "hardness": 200, "tensile": 550},
    "17-4": {"density": 7780, "hardness": 350, "tensile": 1100},
    "17-4ph": {"density": 7780, "hardness": 350, "tensile": 1100},
    "ti-6al-4v": {"density": 4430, "hardness": 350, "tensile": 1050},
    "ti64": {"density": 4430, "hardness": 350, "tensile": 1050},
    "ti-6-4": {"density": 4430, "hardness": 350, "tensile": 1050},
    "inconel 625": {"density": 8440, "hardness": 250, "tensile": 900},
    "in625": {"density": 8440, "hardness": 250, "tensile": 900},
    "inconel 718": {"density": 8190, "hardness": 400, "tensile": 1200},
    "in718": {"density": 8190, "hardness": 400, "tensile": 1200},
    "cocr": {"density": 8300, "hardness": 380, "tensile": 1100},
    "co-cr": {"density": 8300, "hardness": 380, "tensile": 1100},
    "cobalt chrome": {"density": 8300, "hardness": 380, "tensile": 1100},
    "maraging": {"density": 8100, "hardness": 500, "tensile": 1800},
    "ms1": {"density": 8100, "hardness": 500, "tensile": 1800},
    "h13": {"density": 7800, "hardness": 520, "tensile": 1600},
    "tool steel": {"density": 7850, "hardness": 550, "tensile": 1700},
    "copper": {"density": 8940, "hardness": 50, "tensile": 220},
    "pure cu": {"density": 8940, "hardness": 50, "tensile": 220},
    "cucrzr": {"density": 8900, "hardness": 150, "tensile": 450},
    "grcop": {"density": 8900, "hardness": 160, "tensile": 480},
    "tungsten": {"density": 19300, "hardness": 350, "tensile": 550},
    "pure w": {"density": 19300, "hardness": 350, "tensile": 550},
    "tantalum": {"density": 16600, "hardness": 200, "tensile": 350},
    "pure ta": {"density": 16600, "hardness": 200, "tensile": 350},
    "gold": {"density": 19300, "hardness": 25, "tensile": 120},
    "au": {"density": 19300, "hardness": 25, "tensile": 120},
    "silver": {"density": 10500, "hardness": 25, "tensile": 125},
    "ag": {"density": 10500, "hardness": 25, "tensile": 125},
    "platinum": {"density": 21450, "hardness": 40, "tensile": 140},
    "pt": {"density": 21450, "hardness": 40, "tensile": 140},
    "hastelloy": {"density": 8890, "hardness": 220, "tensile": 790},
    "nickel alloy": {"density": 8400, "hardness": 200, "tensile": 700},
}

def apply_heat_treatment(material, name_lower):
    """Apply heat treatment modifications based on name"""
    
    mech = material.get("mechanical", {})
    
    # Get current hardness
    hardness_data = mech.get("hardness", {})
    base_hardness = hardness_data.get("brinell") if isinstance(hardness_data, dict) else hardness_data
    
    tensile_data = mech.get("tensile_strength", {})
    base_tensile = tensile_data.get("typical") if isinstance(tensile_data, dict) else tensile_data
    
    if not base_hardness:
        base_hardness = 200
    if not base_tensile:
        base_tensile = 700
    
    # Check for heat treatment patterns
    for pattern, mods in HEAT_TREATMENT_MODIFIERS.items():
        if pattern in name_lower:
            if "hardness_abs" in mods:
                new_hardness = mods["hardness_abs"]
                new_tensile = mods["tensile_abs"]
            else:
                new_hardness = base_hardness * mods["hardness_mult"]
                new_tensile = base_tensile * mods["tensile_mult"]
            
            mech["hardness"] = {"brinell": round(new_hardness)}
            mech["tensile_strength"] = {"typical": round(new_tensile)}
            material["mechanical"] = mech
            return material, True
    
    return material, False

def apply_wood_hardness(material, name_lower):
    """Apply wood species-specific hardness"""
    for species, janka in WOOD_HARDNESS.items():
        if species in name_lower:
            # Convert Janka to approximate Brinell (rough correlation)
            brinell = janka * 0.004 + 1
            
            if "mechanical" not in material:
                material["mechanical"] = {}
            
            material["mechanical"]["hardness"] = {"brinell": round(brinell, 1), "janka": janka}
            material["mechanical"]["tensile_strength"] = {"typical": janka * 0.05 + 30}
            return material, True
    
    return material, False

def apply_cast_iron_class(material, name_lower):
    """Apply cast iron class-specific values"""
    for class_name, tensile in CAST_IRON_TENSILE.items():
        if class_name in name_lower:
            if "mechanical" not in material:
                material["mechanical"] = {}
            
            # Hardness correlates with tensile for cast iron
            hardness = 100 + tensile * 0.3
            
            material["mechanical"]["tensile_strength"] = {"typical": tensile}
            material["mechanical"]["hardness"] = {"brinell": round(hardness)}
            return material, True
    
    return material, False

def apply_am_metal(material, name_lower):
    """Apply AM metal-specific properties"""
    for alloy, props in AM_METALS.items():
        if alloy in name_lower:
            if "physical" not in material:
                material["physical"] = {}
            if "mechanical" not in material:
                material["mechanical"] = {}
            
            material["physical"]["density"] = props["density"]
            material["mechanical"]["hardness"] = {"brinell": props["hardness"]}
            material["mechanical"]["tensile_strength"] = {"typical": props["tensile"]}
            return material, True
    
    return material, False

def process_material(material, file_path):
    """Process a single material for differentiation"""
    name = material.get("name", "")
    name_lower = name.lower()
    
    changed = False
    
    # Try AM metals first (for X_SPECIALTY/am.json etc)
    if "slm" in name_lower or "ebm" in name_lower or "am" in name_lower or "dmls" in name_lower or "sls" in name_lower:
        material, c = apply_am_metal(material, name_lower)
        if c:
            changed = True
    
    # Apply heat treatment modifications
    material, c = apply_heat_treatment(material, name_lower)
    if c:
        changed = True
    
    # Apply wood-specific
    if "wood" in file_path.lower() or any(w in name_lower for w in ["oak", "maple", "walnut", "cherry", "pine", "cedar"]):
        material, c = apply_wood_hardness(material, name_lower)
        if c:
            changed = True
    
    # Apply cast iron class
    if "cast" in file_path.lower() or "iron" in name_lower or "class" in name_lower:
        material, c = apply_cast_iron_class(material, name_lower)
        if c:
            changed = True
    
    return material, changed

def process_file(json_file):
    """Process a file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        changes = 0
        
        for i, mat in enumerate(materials):
            if isinstance(mat, dict):
                materials[i], changed = process_material(mat, str(json_file))
                if changed:
                    changes += 1
        
        if changes > 0:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return {"file": json_file.name, "changes": changes}
    except Exception as e:
        return {"file": str(json_file), "error": str(e)}

def main():
    print("=" * 80)
    print("PRISM FINAL DIFFERENTIATION ENGINE")
    print("Applying heat treatment, wood species, cast iron class, AM metal specifics")
    print("=" * 80)
    
    files = []
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS",
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if dir_path.exists():
            for f in dir_path.glob("*.json"):
                if not f.name.startswith("_"):
                    files.append(f)
    
    print(f"Processing {len(files)} files...")
    
    total = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_file, f): f for f in files}
        for future in as_completed(futures):
            result = future.result()
            if result.get("changes", 0) > 0:
                print(f"  {result['file']}: {result['changes']} materials differentiated")
                total += result["changes"]
    
    print(f"\nTotal materials differentiated: {total}")

if __name__ == "__main__":
    main()
