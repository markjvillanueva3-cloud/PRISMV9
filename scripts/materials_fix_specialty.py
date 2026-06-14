"""
PRISM X_SPECIALTY FINAL FIX
Fix remaining materials that got wrong defaults (glass, hydroxyapatite, etc.)
"""

import json
from pathlib import Path

BASE_PATH = Path(r"C:\PRISM\data\materials\X_SPECIALTY")

# Materials with specific known properties
SPECIFIC_MATERIALS = {
    # Bio materials
    "hydroxyapatite": {"density": 3160, "hardness": 500, "tensile": 40, "type": "ceramic"},
    "tricalcium phosphate": {"density": 3070, "hardness": 400, "tensile": 35, "type": "ceramic"},
    "bioglass": {"density": 2700, "hardness": 350, "tensile": 70, "type": "ceramic"},
    
    # Glass
    "glass": {"density": 2500, "hardness": 450, "tensile": 70, "type": "ceramic"},
    "borosilicate": {"density": 2230, "hardness": 480, "tensile": 50, "type": "ceramic"},
    "fused silica": {"density": 2200, "hardness": 550, "tensile": 50, "type": "ceramic"},
    "quartz": {"density": 2650, "hardness": 600, "tensile": 60, "type": "ceramic"},
    "soda lime": {"density": 2500, "hardness": 450, "tensile": 70, "type": "ceramic"},
    
    # Heavy alloys
    "w-90": {"density": 17000, "hardness": 280, "tensile": 900, "type": "superalloy"},
    "w-95": {"density": 18000, "hardness": 300, "tensile": 950, "type": "superalloy"},
    "w-97": {"density": 18500, "hardness": 320, "tensile": 980, "type": "superalloy"},
    "tungsten heavy": {"density": 17500, "hardness": 290, "tensile": 920, "type": "superalloy"},
    "densimet": {"density": 17600, "hardness": 285, "tensile": 910, "type": "superalloy"},
    
    # Precious metals
    "gold": {"density": 19300, "hardness": 25, "tensile": 120, "type": "copper"},
    "silver": {"density": 10500, "hardness": 25, "tensile": 125, "type": "copper"},
    "platinum": {"density": 21450, "hardness": 40, "tensile": 140, "type": "copper"},
    "palladium": {"density": 12020, "hardness": 40, "tensile": 180, "type": "copper"},
    "ag-pd": {"density": 11000, "hardness": 60, "tensile": 280, "type": "copper"},
    "au-pt": {"density": 19800, "hardness": 50, "tensile": 200, "type": "copper"},
    
    # Refractory
    "molybdenum": {"density": 10220, "hardness": 230, "tensile": 700, "type": "superalloy"},
    "tantalum": {"density": 16600, "hardness": 200, "tensile": 350, "type": "superalloy"},
    "niobium": {"density": 8570, "hardness": 130, "tensile": 330, "type": "superalloy"},
    "rhenium": {"density": 21020, "hardness": 250, "tensile": 1100, "type": "superalloy"},
    "zirconium": {"density": 6520, "hardness": 200, "tensile": 400, "type": "titanium"},
    "hafnium": {"density": 13310, "hardness": 180, "tensile": 480, "type": "superalloy"},
    
    # MMC
    "al-sic": {"density": 2900, "hardness": 120, "tensile": 450, "type": "composite"},
    "al-b4c": {"density": 2700, "hardness": 100, "tensile": 380, "type": "composite"},
    "al-al2o3": {"density": 2950, "hardness": 110, "tensile": 420, "type": "composite"},
    
    # SMA
    "nitinol": {"density": 6450, "hardness": 300, "tensile": 900, "type": "superalloy"},
    "ni-ti": {"density": 6450, "hardness": 300, "tensile": 900, "type": "superalloy"},
    "cu-al-ni sma": {"density": 7600, "hardness": 180, "tensile": 500, "type": "copper"},
    "cu-zn-al sma": {"density": 7900, "hardness": 150, "tensile": 450, "type": "copper"},
    
    # Foams
    "al foam": {"density": 300, "hardness": 5, "tensile": 5, "type": "aluminum"},
    "ti foam": {"density": 600, "hardness": 20, "tensile": 30, "type": "titanium"},
    "ni foam": {"density": 500, "hardness": 15, "tensile": 20, "type": "superalloy"},
    "cu foam": {"density": 400, "hardness": 8, "tensile": 10, "type": "copper"},
    "metal foam": {"density": 400, "hardness": 10, "tensile": 15, "type": "aluminum"},
    
    # Cermets
    "cermet": {"density": 7500, "hardness": 1200, "tensile": 600, "type": "ceramic"},
    "wc-co": {"density": 14500, "hardness": 1600, "tensile": 1500, "type": "ceramic"},
    "tic-ni": {"density": 6200, "hardness": 1400, "tensile": 900, "type": "ceramic"},
    
    # Special alloys
    "kovar": {"density": 8360, "hardness": 180, "tensile": 520, "type": "superalloy"},
    "invar": {"density": 8050, "hardness": 160, "tensile": 480, "type": "superalloy"},
    "mu-metal": {"density": 8750, "hardness": 140, "tensile": 450, "type": "superalloy"},
    "permalloy": {"density": 8600, "hardness": 130, "tensile": 420, "type": "superalloy"},
}

def process_files():
    """Process all X_SPECIALTY files"""
    print("=" * 80)
    print("PRISM X_SPECIALTY FINAL FIX")
    print("=" * 80)
    
    total_fixed = 0
    
    for json_file in BASE_PATH.glob("*.json"):
        if json_file.name.startswith("_"):
            continue
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            materials = data.get("materials", [])
            file_fixed = 0
            
            for mat in materials:
                if not isinstance(mat, dict):
                    continue
                
                name = mat.get("name", "").lower()
                
                # Check for specific materials
                for pattern, props in SPECIFIC_MATERIALS.items():
                    if pattern in name:
                        # Check if it has wrong defaults (density ~7850)
                        current_density = mat.get("physical", {}).get("density")
                        if current_density and abs(current_density - 7850) < 200:
                            # Apply fix
                            if "physical" not in mat:
                                mat["physical"] = {}
                            if "mechanical" not in mat:
                                mat["mechanical"] = {}
                            
                            mat["physical"]["density"] = props["density"]
                            mat["mechanical"]["hardness"] = {"brinell": props["hardness"]}
                            mat["mechanical"]["tensile_strength"] = {"typical": props["tensile"]}
                            mat["_specific_fix"] = props["type"]
                            file_fixed += 1
                        break
            
            if file_fixed > 0:
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                print(f"  {json_file.name}: {file_fixed} materials fixed")
                total_fixed += file_fixed
        
        except Exception as e:
            print(f"Error processing {json_file}: {e}")
    
    print(f"\nTotal fixed: {total_fixed}")
    return total_fixed

if __name__ == "__main__":
    process_files()
