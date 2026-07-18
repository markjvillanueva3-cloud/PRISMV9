"""
PRISM Targeted Hardness Fix - Fix remaining 26 materials missing hardness
"""

import json
from pathlib import Path
from datetime import datetime

# Materials identified as missing hardness
MISSING_HARDNESS = [
    # From audit - these need hardness estimation
    "P-STEEL-EXP-001",  # AISI 1006 Cold Rolled
    "N-CU-EXP-022",     # C65500 Hi-Si Bronze
    "N-AL-EXP-005",     # 2017-T4
    "N-AL-EXP-018",     # 5086-H32
    "N-CU-EXP-001",     # C10100 OFHC
    # Add any others found
]

# Hardness estimation from tensile strength
def estimate_hardness_from_tensile(tensile, material_class):
    """Estimate Brinell hardness from tensile strength"""
    factors = {
        "steel": 3.45,
        "stainless": 3.30,
        "aluminum": 2.75,
        "copper": 3.00,
        "titanium": 3.20,
        "default": 3.45
    }
    factor = factors.get(material_class, factors["default"])
    return round(tensile / factor)

# Hardness defaults by material designation
HARDNESS_LOOKUP = {
    # Carbon Steels
    "1006": 86, "1008": 90, "1010": 95, "1015": 111, "1018": 126,
    "1020": 130, "1025": 140, "1030": 149, "1035": 163, "1040": 170,
    "1045": 179, "1050": 187, "1060": 229, "1070": 229, "1080": 241,
    "1095": 269,
    
    # Aluminum Alloys
    "2017": 105, "2024": 120, "5052": 60, "5083": 75, "5086": 72,
    "6061": 95, "6063": 73, "7075": 150,
    
    # Copper Alloys
    "C10100": 45, "C11000": 50, "C17200": 200, "C26000": 55,
    "C36000": 60, "C65500": 95, "C71500": 75,
    
    # Stainless Steels
    "304": 170, "316": 170, "410": 200, "420": 220, "440C": 280,
    "17-4": 280, "15-5": 270,
}

def get_hardness_for_material(mat_id, name, tensile=None, mat_class="default"):
    """Get estimated hardness for a material"""
    
    # Try lookup by designation
    for key, hardness in HARDNESS_LOOKUP.items():
        if key in name or key in mat_id:
            return hardness, "lookup"
    
    # Try estimation from tensile
    if tensile:
        return estimate_hardness_from_tensile(tensile, mat_class), "estimated_from_tensile"
    
    # Class defaults
    class_defaults = {
        "steel": 160, "stainless": 170, "aluminum": 75,
        "copper": 60, "titanium": 330, "superalloy": 350, "default": 150
    }
    return class_defaults.get(mat_class, 150), "class_default"

def fix_materials_hardness(base_path):
    """Fix hardness for all materials that need it"""
    
    print("=" * 60)
    print("  PRISM TARGETED HARDNESS FIX")
    print("=" * 60)
    
    stats = {"processed": 0, "fixed": 0, "files_modified": 0}
    
    iso_dirs = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    for iso_dir in iso_dirs:
        dir_path = Path(base_path) / iso_dir
        if not dir_path.exists():
            continue
            
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_") or json_file.name == "index.json":
                continue
                
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                materials = data.get("materials", [])
                if not materials:
                    continue
                
                file_modified = False
                
                for material in materials:
                    stats["processed"] += 1
                    
                    # Check if hardness is missing
                    mech = material.get("mechanical", {})
                    hardness = mech.get("hardness", {})
                    
                    has_hardness = False
                    if isinstance(hardness, dict):
                        has_hardness = hardness.get("brinell") is not None
                    elif isinstance(hardness, (int, float)):
                        has_hardness = True
                    
                    if not has_hardness:
                        # Get tensile if available
                        tensile = None
                        ts = mech.get("tensile_strength", {})
                        if isinstance(ts, dict):
                            tensile = ts.get("typical") or ts.get("min")
                        elif isinstance(ts, (int, float)):
                            tensile = ts
                        
                        # Determine material class
                        iso = material.get("iso_group", "P")
                        name = material.get("name", "")
                        mat_class = {
                            "P": "steel", "M": "stainless", "K": "cast_iron",
                            "N": "aluminum", "S": "superalloy", "H": "steel", "X": "default"
                        }.get(iso, "default")
                        
                        if "copper" in name.lower() or "bronze" in name.lower() or "brass" in name.lower():
                            mat_class = "copper"
                        elif "aluminum" in name.lower() or "al " in name.lower().split():
                            mat_class = "aluminum"
                        elif "titanium" in name.lower():
                            mat_class = "titanium"
                        
                        # Get estimated hardness
                        est_hardness, source = get_hardness_for_material(
                            material.get("id", ""), name, tensile, mat_class
                        )
                        
                        # Apply fix
                        if "mechanical" not in material:
                            material["mechanical"] = {}
                        if "hardness" not in material["mechanical"]:
                            material["mechanical"]["hardness"] = {}
                        
                        if isinstance(material["mechanical"]["hardness"], dict):
                            material["mechanical"]["hardness"]["brinell"] = est_hardness
                            material["mechanical"]["hardness"]["source"] = source
                        else:
                            material["mechanical"]["hardness"] = {
                                "brinell": est_hardness,
                                "source": source
                            }
                        
                        material["_hardness_fix"] = {
                            "timestamp": datetime.now().isoformat(),
                            "value": est_hardness,
                            "source": source
                        }
                        
                        stats["fixed"] += 1
                        file_modified = True
                        print(f"  Fixed: {material.get('id', 'unknown')} - HB={est_hardness} ({source})")
                
                if file_modified:
                    stats["files_modified"] += 1
                    with open(json_file, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2)
                        
            except Exception as e:
                print(f"Error processing {json_file}: {e}")
    
    print("\n" + "-" * 40)
    print(f"Materials processed: {stats['processed']}")
    print(f"Materials fixed: {stats['fixed']}")
    print(f"Files modified: {stats['files_modified']}")
    
    return stats

if __name__ == "__main__":
    BASE_PATH = r"C:\PRISM\data\materials"
    fix_materials_hardness(BASE_PATH)
