"""
PRISM POLYMER/COMPOSITE ENRICHMENT
Enrich polymer.json and composite.json with specific material properties
"""

import json
from pathlib import Path

BASE_PATH = Path(r"C:\PRISM\data\materials\X_SPECIALTY")

# Detailed polymer database with specific grades
POLYMER_DB = {
    # PEEK family
    "peek unfilled": {"density": 1300, "hardness": 100, "tensile": 100, "elong": 40, "therm": 0.25},
    "peek 30gf": {"density": 1510, "hardness": 115, "tensile": 145, "elong": 2.5, "therm": 0.40},
    "peek 30cf": {"density": 1410, "hardness": 120, "tensile": 200, "elong": 1.5, "therm": 1.0},
    "peek bearing": {"density": 1440, "hardness": 90, "tensile": 85, "elong": 20, "therm": 0.30},
    "peek sls": {"density": 1280, "hardness": 95, "tensile": 90, "elong": 8, "therm": 0.24},
    
    # Nylon family
    "pa6 unfilled": {"density": 1130, "hardness": 75, "tensile": 78, "elong": 100, "therm": 0.25},
    "pa66": {"density": 1140, "hardness": 80, "tensile": 85, "elong": 60, "therm": 0.26},
    "pa12": {"density": 1020, "hardness": 70, "tensile": 50, "elong": 200, "therm": 0.23},
    "pa12 gf": {"density": 1250, "hardness": 85, "tensile": 90, "elong": 5, "therm": 0.35},
    "pa12 mjf": {"density": 1010, "hardness": 68, "tensile": 48, "elong": 15, "therm": 0.22},
    "pa12 sls": {"density": 1000, "hardness": 65, "tensile": 45, "elong": 18, "therm": 0.21},
    "pa11": {"density": 1040, "hardness": 72, "tensile": 55, "elong": 250, "therm": 0.23},
    "pa6 30gf": {"density": 1360, "hardness": 90, "tensile": 180, "elong": 3, "therm": 0.35},
    "pa66 30gf": {"density": 1370, "hardness": 92, "tensile": 190, "elong": 3, "therm": 0.36},
    "nylon 6": {"density": 1130, "hardness": 75, "tensile": 78, "elong": 100, "therm": 0.25},
    "nylon 66": {"density": 1140, "hardness": 80, "tensile": 85, "elong": 60, "therm": 0.26},
    "nylon 12": {"density": 1020, "hardness": 70, "tensile": 50, "elong": 200, "therm": 0.23},
    
    # ABS/ASA
    "abs standard": {"density": 1050, "hardness": 70, "tensile": 45, "elong": 25, "therm": 0.17},
    "abs fdm": {"density": 1040, "hardness": 68, "tensile": 40, "elong": 6, "therm": 0.16},
    "abs 20gf": {"density": 1200, "hardness": 80, "tensile": 80, "elong": 3, "therm": 0.25},
    "asa": {"density": 1070, "hardness": 72, "tensile": 48, "elong": 20, "therm": 0.18},
    
    # POM/Acetal
    "pom homopolymer": {"density": 1420, "hardness": 85, "tensile": 75, "elong": 30, "therm": 0.31},
    "pom copolymer": {"density": 1410, "hardness": 80, "tensile": 70, "elong": 40, "therm": 0.30},
    "delrin 100": {"density": 1420, "hardness": 85, "tensile": 75, "elong": 30, "therm": 0.31},
    "delrin 500": {"density": 1410, "hardness": 82, "tensile": 70, "elong": 35, "therm": 0.30},
    
    # PEI/Ultem
    "pei unfilled": {"density": 1270, "hardness": 95, "tensile": 105, "elong": 60, "therm": 0.22},
    "ultem 9085": {"density": 1340, "hardness": 98, "tensile": 72, "elong": 6, "therm": 0.24},
    "ultem 1010": {"density": 1270, "hardness": 95, "tensile": 81, "elong": 4, "therm": 0.22},
    
    # PC family
    "pc standard": {"density": 1200, "hardness": 85, "tensile": 65, "elong": 110, "therm": 0.20},
    "pc 20gf": {"density": 1350, "hardness": 95, "tensile": 130, "elong": 3, "therm": 0.30},
    "pc-abs": {"density": 1150, "hardness": 80, "tensile": 55, "elong": 70, "therm": 0.19},
    
    # Fluoropolymers
    "ptfe unfilled": {"density": 2180, "hardness": 55, "tensile": 25, "elong": 350, "therm": 0.25},
    "ptfe 25gf": {"density": 2300, "hardness": 62, "tensile": 20, "elong": 250, "therm": 0.35},
    "pvdf": {"density": 1780, "hardness": 75, "tensile": 50, "elong": 50, "therm": 0.19},
    "fep": {"density": 2150, "hardness": 52, "tensile": 22, "elong": 300, "therm": 0.25},
    "pfa": {"density": 2150, "hardness": 53, "tensile": 28, "elong": 300, "therm": 0.26},
    "etfe": {"density": 1700, "hardness": 68, "tensile": 45, "elong": 200, "therm": 0.24},
    
    # Other engineering polymers
    "pps unfilled": {"density": 1350, "hardness": 90, "tensile": 80, "elong": 3, "therm": 0.30},
    "pps 40gf": {"density": 1650, "hardness": 105, "tensile": 190, "elong": 1.5, "therm": 0.50},
    "pbt unfilled": {"density": 1310, "hardness": 78, "tensile": 55, "elong": 50, "therm": 0.21},
    "pbt 30gf": {"density": 1530, "hardness": 95, "tensile": 140, "elong": 2.5, "therm": 0.35},
    "pet": {"density": 1380, "hardness": 80, "tensile": 80, "elong": 70, "therm": 0.24},
    "petg": {"density": 1270, "hardness": 75, "tensile": 50, "elong": 120, "therm": 0.18},
    "psu": {"density": 1240, "hardness": 88, "tensile": 70, "elong": 50, "therm": 0.26},
    "ppsu": {"density": 1290, "hardness": 90, "tensile": 75, "elong": 60, "therm": 0.35},
    "pla": {"density": 1250, "hardness": 83, "tensile": 60, "elong": 6, "therm": 0.13},
    "pmma": {"density": 1180, "hardness": 95, "tensile": 75, "elong": 5, "therm": 0.19},
    "acrylic": {"density": 1180, "hardness": 95, "tensile": 75, "elong": 5, "therm": 0.19},
    
    # Commodity polymers
    "hdpe": {"density": 960, "hardness": 60, "tensile": 30, "elong": 600, "therm": 0.50},
    "ldpe": {"density": 920, "hardness": 45, "tensile": 15, "elong": 500, "therm": 0.33},
    "pp homopolymer": {"density": 905, "hardness": 65, "tensile": 35, "elong": 150, "therm": 0.22},
    "pp copolymer": {"density": 900, "hardness": 60, "tensile": 30, "elong": 500, "therm": 0.20},
    "pp 30gf": {"density": 1130, "hardness": 85, "tensile": 100, "elong": 3, "therm": 0.35},
    "pvc rigid": {"density": 1400, "hardness": 80, "tensile": 50, "elong": 80, "therm": 0.16},
    "pvc flexible": {"density": 1300, "hardness": 60, "tensile": 20, "elong": 300, "therm": 0.14},
    "ps": {"density": 1050, "hardness": 75, "tensile": 45, "elong": 3, "therm": 0.14},
    "hips": {"density": 1040, "hardness": 70, "tensile": 30, "elong": 40, "therm": 0.13},
}

# Composite database
COMPOSITE_DB = {
    # Carbon fiber composites
    "cfrp ud t300": {"density": 1550, "hardness": 40, "tensile": 1500, "elong": 1.5, "therm": 5.0},
    "cfrp ud t700": {"density": 1560, "hardness": 42, "tensile": 2400, "elong": 1.6, "therm": 6.0},
    "cfrp ud t800": {"density": 1560, "hardness": 43, "tensile": 2900, "elong": 1.7, "therm": 7.0},
    "cfrp ud m55j": {"density": 1550, "hardness": 45, "tensile": 2500, "elong": 0.8, "therm": 120.0},
    "cfrp woven plain": {"density": 1500, "hardness": 35, "tensile": 600, "elong": 1.2, "therm": 3.0},
    "cfrp woven twill": {"density": 1510, "hardness": 36, "tensile": 650, "elong": 1.3, "therm": 3.5},
    "cfrp woven satin": {"density": 1520, "hardness": 37, "tensile": 700, "elong": 1.4, "therm": 4.0},
    "cfrp quasi": {"density": 1550, "hardness": 38, "tensile": 800, "elong": 1.3, "therm": 4.0},
    "cfrp peek": {"density": 1560, "hardness": 40, "tensile": 1800, "elong": 1.4, "therm": 5.5},
    "cfrp pps": {"density": 1570, "hardness": 41, "tensile": 1700, "elong": 1.3, "therm": 5.0},
    
    # Glass fiber composites
    "gfrp e-glass": {"density": 1900, "hardness": 30, "tensile": 400, "elong": 2.5, "therm": 0.35},
    "gfrp s-glass": {"density": 1950, "hardness": 32, "tensile": 550, "elong": 2.8, "therm": 0.40},
    "gfrp pp": {"density": 1600, "hardness": 25, "tensile": 200, "elong": 3.0, "therm": 0.30},
    "gfrp epoxy": {"density": 1900, "hardness": 30, "tensile": 450, "elong": 2.5, "therm": 0.38},
    "gfrp polyester": {"density": 1850, "hardness": 28, "tensile": 350, "elong": 2.2, "therm": 0.32},
    
    # Kevlar/Aramid
    "kevlar 29": {"density": 1380, "hardness": 25, "tensile": 2700, "elong": 3.6, "therm": 0.04},
    "kevlar 49": {"density": 1440, "hardness": 28, "tensile": 3600, "elong": 2.8, "therm": 0.04},
    "kevlar epoxy": {"density": 1350, "hardness": 22, "tensile": 1400, "elong": 2.0, "therm": 0.05},
    "technora": {"density": 1390, "hardness": 26, "tensile": 3000, "elong": 4.4, "therm": 0.04},
    
    # Hybrid composites
    "kevlar-carbon": {"density": 1420, "hardness": 32, "tensile": 1200, "elong": 1.8, "therm": 2.0},
    "glass-carbon": {"density": 1700, "hardness": 34, "tensile": 900, "elong": 2.0, "therm": 1.5},
    
    # Honeycomb structures
    "nomex honeycomb": {"density": 48, "hardness": 3, "tensile": 3, "elong": 5, "therm": 0.04},
    "aluminum honeycomb": {"density": 70, "hardness": 5, "tensile": 5, "elong": 3, "therm": 0.8},
    "paper honeycomb": {"density": 30, "hardness": 1, "tensile": 1, "elong": 10, "therm": 0.03},
    
    # Sandwich structures
    "cfrp-nomex sandwich": {"density": 400, "hardness": 15, "tensile": 200, "elong": 1.5, "therm": 0.5},
    "cfrp-foam sandwich": {"density": 300, "hardness": 12, "tensile": 150, "elong": 2.0, "therm": 0.3},
    "gfrp-pvc sandwich": {"density": 500, "hardness": 18, "tensile": 180, "elong": 2.5, "therm": 0.25},
}

def match_polymer(name):
    """Match polymer to database entry"""
    name_lower = name.lower()
    
    # Try exact matches first
    for key, props in POLYMER_DB.items():
        if key in name_lower:
            return props
    
    # Fuzzy matches
    if "peek" in name_lower:
        if "gf" in name_lower or "glass" in name_lower:
            return POLYMER_DB["peek 30gf"]
        elif "cf" in name_lower or "carbon" in name_lower:
            return POLYMER_DB["peek 30cf"]
        elif "bearing" in name_lower:
            return POLYMER_DB["peek bearing"]
        elif "sls" in name_lower:
            return POLYMER_DB["peek sls"]
        return POLYMER_DB["peek unfilled"]
    
    if "nylon" in name_lower or "pa6" in name_lower or "pa 6" in name_lower:
        if "gf" in name_lower or "glass" in name_lower:
            return POLYMER_DB["pa6 30gf"]
        return POLYMER_DB["pa6 unfilled"]
    
    if "abs" in name_lower:
        if "fdm" in name_lower:
            return POLYMER_DB["abs fdm"]
        if "gf" in name_lower:
            return POLYMER_DB["abs 20gf"]
        return POLYMER_DB["abs standard"]
    
    if "pom" in name_lower or "acetal" in name_lower or "delrin" in name_lower:
        return POLYMER_DB["pom copolymer"]
    
    if "ultem" in name_lower or "pei" in name_lower:
        if "9085" in name_lower:
            return POLYMER_DB["ultem 9085"]
        return POLYMER_DB["pei unfilled"]
    
    if "polycarbonate" in name_lower or "pc" in name_lower:
        if "gf" in name_lower:
            return POLYMER_DB["pc 20gf"]
        return POLYMER_DB["pc standard"]
    
    if "ptfe" in name_lower or "teflon" in name_lower:
        return POLYMER_DB["ptfe unfilled"]
    
    if "pps" in name_lower:
        if "gf" in name_lower:
            return POLYMER_DB["pps 40gf"]
        return POLYMER_DB["pps unfilled"]
    
    return None

def match_composite(name):
    """Match composite to database entry"""
    name_lower = name.lower()
    
    for key, props in COMPOSITE_DB.items():
        if key in name_lower:
            return props
    
    # Fuzzy matches
    if "cfrp" in name_lower or "carbon fiber" in name_lower:
        if "peek" in name_lower:
            return COMPOSITE_DB["cfrp peek"]
        if "ud" in name_lower:
            return COMPOSITE_DB["cfrp ud t700"]
        if "woven" in name_lower or "twill" in name_lower:
            return COMPOSITE_DB["cfrp woven twill"]
        return COMPOSITE_DB["cfrp quasi"]
    
    if "gfrp" in name_lower or "glass fiber" in name_lower or "fiberglass" in name_lower:
        return COMPOSITE_DB["gfrp e-glass"]
    
    if "kevlar" in name_lower or "aramid" in name_lower:
        return COMPOSITE_DB["kevlar 49"]
    
    if "honeycomb" in name_lower:
        if "nomex" in name_lower:
            return COMPOSITE_DB["nomex honeycomb"]
        if "aluminum" in name_lower or "al" in name_lower:
            return COMPOSITE_DB["aluminum honeycomb"]
        return COMPOSITE_DB["paper honeycomb"]
    
    if "sandwich" in name_lower:
        return COMPOSITE_DB["cfrp-nomex sandwich"]
    
    return None

def process_file(filepath, match_func):
    """Process a file with the given matching function"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    materials = data.get("materials", [])
    changes = 0
    
    for mat in materials:
        if not isinstance(mat, dict):
            continue
        
        name = mat.get("name", "")
        props = match_func(name)
        
        if not props:
            continue
        
        # Update properties
        if "physical" not in mat:
            mat["physical"] = {}
        if "mechanical" not in mat:
            mat["mechanical"] = {}
        
        mat["physical"]["density"] = props["density"]
        mat["physical"]["thermal_conductivity"] = props["therm"]
        
        mat["mechanical"]["hardness"] = {"brinell": props["hardness"]}
        mat["mechanical"]["tensile_strength"] = {"typical": props["tensile"]}
        mat["mechanical"]["elongation"] = {"typical": props["elong"]}
        
        mat["_detailed_enrichment"] = True
        changes += 1
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    return changes

def main():
    print("=" * 80)
    print("PRISM POLYMER/COMPOSITE DETAILED ENRICHMENT")
    print("=" * 80)
    
    # Process polymer.json
    polymer_path = BASE_PATH / "polymer.json"
    if polymer_path.exists():
        changes = process_file(polymer_path, match_polymer)
        print(f"polymer.json: {changes} materials enriched")
    
    # Process engineering_polymer.json
    eng_polymer_path = BASE_PATH / "engineering_polymer.json"
    if eng_polymer_path.exists():
        changes = process_file(eng_polymer_path, match_polymer)
        print(f"engineering_polymer.json: {changes} materials enriched")
    
    # Process composite.json
    composite_path = BASE_PATH / "composite.json"
    if composite_path.exists():
        changes = process_file(composite_path, match_composite)
        print(f"composite.json: {changes} materials enriched")
    
    # Process honeycomb files
    for hc_file in ["honeycomb.json", "honeycomb_sandwich.json"]:
        hc_path = BASE_PATH / hc_file
        if hc_path.exists():
            changes = process_file(hc_path, match_composite)
            print(f"{hc_file}: {changes} materials enriched")
    
    print("\nDone!")

if __name__ == "__main__":
    main()
