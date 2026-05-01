"""
PRISM X_SPECIALTY ENRICHMENT ENGINE
Add proper physical/mechanical properties to specialty materials
BEFORE physics calculations
"""

import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_PATH = Path(r"C:\PRISM\data\materials\X_SPECIALTY")

# =============================================================================
# MATERIAL-SPECIFIC PROPERTY DATABASES
# =============================================================================

# Polymers - specific grades
POLYMER_PROPS = {
    "peek": {"density": 1300, "hardness": 100, "tensile": 100, "elongation": 40, "thermal_cond": 0.25},
    "peek gf": {"density": 1500, "hardness": 115, "tensile": 140, "elongation": 2, "thermal_cond": 0.35},
    "peek cf": {"density": 1400, "hardness": 120, "tensile": 200, "elongation": 1.5, "thermal_cond": 0.90},
    "pei": {"density": 1270, "hardness": 95, "tensile": 105, "elongation": 60, "thermal_cond": 0.22},
    "ultem": {"density": 1270, "hardness": 95, "tensile": 105, "elongation": 60, "thermal_cond": 0.22},
    "pom": {"density": 1410, "hardness": 80, "tensile": 70, "elongation": 25, "thermal_cond": 0.31},
    "delrin": {"density": 1410, "hardness": 80, "tensile": 70, "elongation": 25, "thermal_cond": 0.31},
    "nylon": {"density": 1150, "hardness": 75, "tensile": 80, "elongation": 100, "thermal_cond": 0.25},
    "pa6": {"density": 1130, "hardness": 75, "tensile": 78, "elongation": 100, "thermal_cond": 0.25},
    "pa66": {"density": 1140, "hardness": 80, "tensile": 85, "elongation": 60, "thermal_cond": 0.26},
    "pa12": {"density": 1020, "hardness": 70, "tensile": 50, "elongation": 200, "thermal_cond": 0.23},
    "abs": {"density": 1050, "hardness": 70, "tensile": 45, "elongation": 25, "thermal_cond": 0.17},
    "pla": {"density": 1250, "hardness": 83, "tensile": 60, "elongation": 6, "thermal_cond": 0.13},
    "petg": {"density": 1270, "hardness": 75, "tensile": 50, "elongation": 120, "thermal_cond": 0.18},
    "pc": {"density": 1200, "hardness": 85, "tensile": 65, "elongation": 110, "thermal_cond": 0.20},
    "polycarbonate": {"density": 1200, "hardness": 85, "tensile": 65, "elongation": 110, "thermal_cond": 0.20},
    "ptfe": {"density": 2200, "hardness": 55, "tensile": 25, "elongation": 400, "thermal_cond": 0.25},
    "teflon": {"density": 2200, "hardness": 55, "tensile": 25, "elongation": 400, "thermal_cond": 0.25},
    "pvc": {"density": 1400, "hardness": 80, "tensile": 50, "elongation": 80, "thermal_cond": 0.16},
    "hdpe": {"density": 960, "hardness": 60, "tensile": 30, "elongation": 600, "thermal_cond": 0.50},
    "ldpe": {"density": 920, "hardness": 45, "tensile": 15, "elongation": 500, "thermal_cond": 0.33},
    "pp": {"density": 905, "hardness": 65, "tensile": 35, "elongation": 150, "thermal_cond": 0.22},
    "polypropylene": {"density": 905, "hardness": 65, "tensile": 35, "elongation": 150, "thermal_cond": 0.22},
    "pps": {"density": 1350, "hardness": 90, "tensile": 80, "elongation": 3, "thermal_cond": 0.30},
    "pvdf": {"density": 1780, "hardness": 75, "tensile": 50, "elongation": 50, "thermal_cond": 0.19},
    "acetal": {"density": 1410, "hardness": 80, "tensile": 70, "elongation": 25, "thermal_cond": 0.31},
}

# Composites - specific types
COMPOSITE_PROPS = {
    "cfrp ud": {"density": 1550, "hardness": 40, "tensile": 1500, "elongation": 1.5, "thermal_cond": 5.0},
    "cfrp woven": {"density": 1500, "hardness": 35, "tensile": 600, "elongation": 1.2, "thermal_cond": 3.0},
    "cfrp quasi": {"density": 1550, "hardness": 38, "tensile": 800, "elongation": 1.3, "thermal_cond": 4.0},
    "gfrp": {"density": 1900, "hardness": 30, "tensile": 400, "elongation": 2.5, "thermal_cond": 0.35},
    "kevlar": {"density": 1380, "hardness": 25, "tensile": 3600, "elongation": 2.8, "thermal_cond": 0.04},
    "aramid": {"density": 1380, "hardness": 25, "tensile": 3600, "elongation": 2.8, "thermal_cond": 0.04},
    "fiberglass": {"density": 1800, "hardness": 28, "tensile": 350, "elongation": 2.0, "thermal_cond": 0.30},
    "carbon fiber": {"density": 1600, "hardness": 42, "tensile": 1200, "elongation": 1.4, "thermal_cond": 6.0},
    "honeycomb": {"density": 50, "hardness": 5, "tensile": 5, "elongation": 10, "thermal_cond": 0.05},
    "foam": {"density": 100, "hardness": 3, "tensile": 2, "elongation": 15, "thermal_cond": 0.03},
}

# Ceramics - specific types
CERAMIC_PROPS = {
    "alumina": {"density": 3950, "hardness": 1500, "tensile": 300, "elongation": 0, "thermal_cond": 30},
    "al2o3": {"density": 3950, "hardness": 1500, "tensile": 300, "elongation": 0, "thermal_cond": 30},
    "zirconia": {"density": 6000, "hardness": 1200, "tensile": 400, "elongation": 0, "thermal_cond": 2.5},
    "zro2": {"density": 6000, "hardness": 1200, "tensile": 400, "elongation": 0, "thermal_cond": 2.5},
    "silicon carbide": {"density": 3100, "hardness": 2800, "tensile": 450, "elongation": 0, "thermal_cond": 120},
    "sic": {"density": 3100, "hardness": 2800, "tensile": 450, "elongation": 0, "thermal_cond": 120},
    "silicon nitride": {"density": 3200, "hardness": 1500, "tensile": 700, "elongation": 0, "thermal_cond": 30},
    "si3n4": {"density": 3200, "hardness": 1500, "tensile": 700, "elongation": 0, "thermal_cond": 30},
    "boron carbide": {"density": 2520, "hardness": 3000, "tensile": 350, "elongation": 0, "thermal_cond": 30},
    "b4c": {"density": 2520, "hardness": 3000, "tensile": 350, "elongation": 0, "thermal_cond": 30},
    "tungsten carbide": {"density": 15600, "hardness": 2000, "tensile": 550, "elongation": 0, "thermal_cond": 110},
    "wc": {"density": 15600, "hardness": 2000, "tensile": 550, "elongation": 0, "thermal_cond": 110},
    "mullite": {"density": 2800, "hardness": 800, "tensile": 180, "elongation": 0, "thermal_cond": 6},
    "cordierite": {"density": 2600, "hardness": 700, "tensile": 150, "elongation": 0, "thermal_cond": 3},
}

# Wood - specific species
WOOD_PROPS = {
    "oak": {"density": 750, "hardness": 6, "tensile": 100, "elongation": 0, "thermal_cond": 0.17},
    "maple": {"density": 700, "hardness": 7, "tensile": 110, "elongation": 0, "thermal_cond": 0.16},
    "walnut": {"density": 650, "hardness": 5, "tensile": 90, "elongation": 0, "thermal_cond": 0.15},
    "cherry": {"density": 580, "hardness": 4, "tensile": 85, "elongation": 0, "thermal_cond": 0.14},
    "pine": {"density": 510, "hardness": 2, "tensile": 60, "elongation": 0, "thermal_cond": 0.12},
    "cedar": {"density": 380, "hardness": 1.5, "tensile": 50, "elongation": 0, "thermal_cond": 0.11},
    "birch": {"density": 670, "hardness": 5, "tensile": 95, "elongation": 0, "thermal_cond": 0.14},
    "ash": {"density": 680, "hardness": 5.5, "tensile": 100, "elongation": 0, "thermal_cond": 0.15},
    "hickory": {"density": 830, "hardness": 8, "tensile": 120, "elongation": 0, "thermal_cond": 0.18},
    "beech": {"density": 720, "hardness": 6, "tensile": 105, "elongation": 0, "thermal_cond": 0.16},
    "mdf": {"density": 750, "hardness": 3, "tensile": 30, "elongation": 0, "thermal_cond": 0.14},
    "plywood": {"density": 600, "hardness": 4, "tensile": 50, "elongation": 0, "thermal_cond": 0.13},
    "balsa": {"density": 160, "hardness": 0.5, "tensile": 20, "elongation": 0, "thermal_cond": 0.05},
    "bamboo": {"density": 700, "hardness": 5, "tensile": 200, "elongation": 0, "thermal_cond": 0.15},
}

# Graphite types
GRAPHITE_PROPS = {
    "isomolded": {"density": 1850, "hardness": 12, "tensile": 40, "elongation": 0, "thermal_cond": 120},
    "extruded": {"density": 1750, "hardness": 10, "tensile": 30, "elongation": 0, "thermal_cond": 100},
    "edm": {"density": 1800, "hardness": 15, "tensile": 45, "elongation": 0, "thermal_cond": 130},
    "pyrolytic": {"density": 2200, "hardness": 20, "tensile": 60, "elongation": 0, "thermal_cond": 400},
    "graphite foam": {"density": 500, "hardness": 2, "tensile": 5, "elongation": 0, "thermal_cond": 50},
    "rvc": {"density": 50, "hardness": 1, "tensile": 1, "elongation": 0, "thermal_cond": 10},
}

# Elastomers/Rubbers
ELASTOMER_PROPS = {
    "nbr": {"density": 1000, "hardness": 60, "tensile": 20, "elongation": 400, "thermal_cond": 0.25},
    "nitrile": {"density": 1000, "hardness": 60, "tensile": 20, "elongation": 400, "thermal_cond": 0.25},
    "epdm": {"density": 860, "hardness": 55, "tensile": 15, "elongation": 500, "thermal_cond": 0.25},
    "silicone": {"density": 1100, "hardness": 50, "tensile": 10, "elongation": 600, "thermal_cond": 0.20},
    "neoprene": {"density": 1230, "hardness": 65, "tensile": 25, "elongation": 350, "thermal_cond": 0.19},
    "viton": {"density": 1800, "hardness": 75, "tensile": 15, "elongation": 200, "thermal_cond": 0.20},
    "fkm": {"density": 1800, "hardness": 75, "tensile": 15, "elongation": 200, "thermal_cond": 0.20},
    "natural rubber": {"density": 930, "hardness": 45, "tensile": 25, "elongation": 700, "thermal_cond": 0.15},
    "polyurethane": {"density": 1200, "hardness": 85, "tensile": 40, "elongation": 450, "thermal_cond": 0.25},
    "sbr": {"density": 940, "hardness": 55, "tensile": 20, "elongation": 500, "thermal_cond": 0.20},
}

# Additive Manufacturing metals
AM_METAL_PROPS = {
    "alsi10mg": {"density": 2680, "hardness": 120, "tensile": 400, "elongation": 6, "thermal_cond": 130},
    "alsi12": {"density": 2660, "hardness": 110, "tensile": 350, "elongation": 5, "thermal_cond": 120},
    "scalmalloy": {"density": 2670, "hardness": 140, "tensile": 520, "elongation": 13, "thermal_cond": 110},
    "ti64": {"density": 4430, "hardness": 350, "tensile": 1050, "elongation": 10, "thermal_cond": 7},
    "ti-6al-4v": {"density": 4430, "hardness": 350, "tensile": 1050, "elongation": 10, "thermal_cond": 7},
    "316l": {"density": 7990, "hardness": 200, "tensile": 550, "elongation": 35, "thermal_cond": 16},
    "17-4ph": {"density": 7780, "hardness": 350, "tensile": 1100, "elongation": 8, "thermal_cond": 18},
    "inconel 625": {"density": 8440, "hardness": 250, "tensile": 900, "elongation": 30, "thermal_cond": 10},
    "inconel 718": {"density": 8190, "hardness": 400, "tensile": 1200, "elongation": 12, "thermal_cond": 11},
    "cocr": {"density": 8300, "hardness": 380, "tensile": 1100, "elongation": 8, "thermal_cond": 13},
    "maraging": {"density": 8100, "hardness": 500, "tensile": 1800, "elongation": 6, "thermal_cond": 20},
    "h13": {"density": 7800, "hardness": 520, "tensile": 1600, "elongation": 5, "thermal_cond": 25},
    "copper": {"density": 8940, "hardness": 50, "tensile": 220, "elongation": 40, "thermal_cond": 390},
    "pure cu": {"density": 8940, "hardness": 50, "tensile": 220, "elongation": 40, "thermal_cond": 390},
    "cucrzr": {"density": 8900, "hardness": 150, "tensile": 450, "elongation": 15, "thermal_cond": 320},
}

def find_matching_props(name):
    """Find matching properties from databases"""
    name_lower = name.lower()
    
    # Check all databases
    all_dbs = [
        (POLYMER_PROPS, "polymer"),
        (COMPOSITE_PROPS, "composite"),
        (CERAMIC_PROPS, "ceramic"),
        (WOOD_PROPS, "wood"),
        (GRAPHITE_PROPS, "graphite"),
        (ELASTOMER_PROPS, "elastomer"),
        (AM_METAL_PROPS, "am_metal"),
    ]
    
    for db, db_type in all_dbs:
        for key, props in db.items():
            if key in name_lower:
                return props, db_type
    
    return None, None

def enrich_material(material):
    """Enrich a material with proper physical/mechanical properties"""
    name = material.get("name", "")
    
    props, mat_type = find_matching_props(name)
    
    if not props:
        return material, 0
    
    changes = 0
    
    # Physical properties
    if "physical" not in material:
        material["physical"] = {}
    
    phys = material["physical"]
    if not phys.get("density") or abs(phys.get("density", 0) - 7850) < 100:  # Has steel default
        phys["density"] = props["density"]
        changes += 1
    if not phys.get("thermal_conductivity"):
        phys["thermal_conductivity"] = props["thermal_cond"]
        changes += 1
    
    # Mechanical properties
    if "mechanical" not in material:
        material["mechanical"] = {}
    
    mech = material["mechanical"]
    
    # Hardness
    if "hardness" not in mech or not isinstance(mech.get("hardness"), dict):
        mech["hardness"] = {"brinell": props["hardness"]}
        changes += 1
    elif not mech["hardness"].get("brinell"):
        mech["hardness"]["brinell"] = props["hardness"]
        changes += 1
    
    # Tensile
    if "tensile_strength" not in mech or not isinstance(mech.get("tensile_strength"), dict):
        mech["tensile_strength"] = {"typical": props["tensile"]}
        changes += 1
    elif not mech["tensile_strength"].get("typical"):
        mech["tensile_strength"]["typical"] = props["tensile"]
        changes += 1
    
    # Elongation
    if "elongation" not in mech or not isinstance(mech.get("elongation"), dict):
        mech["elongation"] = {"typical": props["elongation"]}
        changes += 1
    elif not mech["elongation"].get("typical"):
        mech["elongation"]["typical"] = props["elongation"]
        changes += 1
    
    material["_enriched"] = mat_type
    
    return material, changes

def process_file(json_file):
    """Process a file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        if not materials:
            return {"file": json_file.name, "processed": 0, "enriched": 0}
        
        enriched = 0
        for i, mat in enumerate(materials):
            if isinstance(mat, dict):
                materials[i], changes = enrich_material(mat)
                if changes > 0:
                    enriched += 1
        
        if enriched > 0:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return {"file": json_file.name, "processed": len(materials), "enriched": enriched}
    
    except Exception as e:
        return {"file": json_file.name, "error": str(e)}

def main():
    print("=" * 80)
    print("PRISM X_SPECIALTY ENRICHMENT ENGINE")
    print("Adding proper physical/mechanical properties to specialty materials")
    print("=" * 80)
    
    files = list(BASE_PATH.glob("*.json"))
    print(f"Processing {len(files)} files...")
    
    total_enriched = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_file, f): f for f in files}
        
        for future in as_completed(futures):
            result = future.result()
            if result.get("enriched", 0) > 0:
                print(f"  {result['file']}: {result['enriched']} materials enriched")
                total_enriched += result["enriched"]
    
    print(f"\nTotal materials enriched: {total_enriched}")
    return total_enriched

if __name__ == "__main__":
    main()
