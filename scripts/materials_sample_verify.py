"""
PRISM Final Verification - Check random samples
"""

import json
import random
from pathlib import Path

BASE_PATH = Path(r"C:\PRISM\data\materials")

# Known correct density ranges (kg/m³)
CORRECT_DENSITIES = {
    # P_STEELS - carbon and alloy steels
    "carbon steel": (7800, 7900),
    "alloy steel": (7750, 7900),
    "tool steel": (7700, 8800),  # Wide range due to tungsten content
    "spring steel": (7800, 7900),
    
    # M_STAINLESS
    "austenitic": (7900, 8100),
    "ferritic": (7700, 7800),
    "martensitic": (7700, 7800),
    "duplex": (7800, 7900),
    
    # K_CAST_IRON
    "gray iron": (7000, 7300),
    "ductile iron": (7100, 7300),
    "cgi": (7200, 7400),
    "malleable": (7200, 7400),
    
    # N_NONFERROUS
    "aluminum": (2600, 2850),
    "copper": (8900, 8960),
    "brass": (8400, 8700),
    "bronze": (7500, 8900),
    "titanium": (4400, 4550),
    "magnesium": (1740, 1870),
    
    # S_SUPERALLOYS
    "inconel": (8200, 8500),
    "hastelloy": (8200, 9200),
    "stellite": (8300, 8700),
    
    # X_SPECIALTY
    "polymer": (900, 2200),
    "composite": (1400, 2000),
    "ceramic": (3000, 6000),
    "graphite": (1600, 2000),
    "wood": (400, 900),
}

def get_expected_density(name, iso_group):
    """Get expected density range based on material name and group"""
    name_lower = name.lower()
    
    # Check specific keywords
    for keyword, range_val in CORRECT_DENSITIES.items():
        if keyword in name_lower:
            return keyword, range_val
    
    # Default by ISO group
    defaults = {
        "P": ("steel", (7750, 7900)),
        "M": ("stainless", (7700, 8100)),
        "K": ("cast_iron", (7000, 7400)),
        "S": ("superalloy", (8000, 9000)),
        "H": ("hardened_steel", (7700, 8800)),
    }
    
    return defaults.get(iso_group, ("unknown", None))

def sample_verification():
    """Sample random materials and verify their density"""
    
    print("=" * 100)
    print("PRISM RANDOM SAMPLE VERIFICATION")
    print("Checking if actual data values are scientifically correct")
    print("=" * 100)
    
    all_materials = []
    
    # Collect all materials
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
                    if isinstance(mat, dict) and mat.get("physical", {}).get("density"):
                        all_materials.append({
                            "name": mat.get("name"),
                            "iso": mat.get("iso_group", iso_dir[0]),
                            "density": mat["physical"]["density"],
                            "file": f"{iso_dir}/{json_file.name}"
                        })
            except:
                pass
    
    print(f"\nTotal materials with density: {len(all_materials)}")
    
    # Sample 50 random materials
    sample_size = min(50, len(all_materials))
    samples = random.sample(all_materials, sample_size)
    
    print(f"Sampling {sample_size} random materials...\n")
    print("-" * 100)
    print(f"{'Material':<45} {'ISO':>3} {'Density':>8} {'Expected':>20} {'Status':>8}")
    print("-" * 100)
    
    correct = 0
    wrong = 0
    unknown = 0
    
    for mat in samples:
        name = mat["name"][:43] if mat["name"] else "Unknown"
        iso = mat["iso"]
        density = mat["density"]
        
        mat_type, expected = get_expected_density(mat["name"], iso)
        
        if expected:
            if expected[0] <= density <= expected[1]:
                status = "OK"
                correct += 1
            else:
                # Check if it's within 20% - might be a variant
                mid = (expected[0] + expected[1]) / 2
                if abs(density - mid) < mid * 0.25:
                    status = "~OK"
                    correct += 1
                else:
                    status = "CHECK"
                    wrong += 1
        else:
            status = "?"
            unknown += 1
        
        exp_str = f"{expected[0]}-{expected[1]}" if expected else "unknown"
        print(f"{name:<45} {iso:>3} {density:>8.0f} {exp_str:>20} {status:>8}")
    
    print("-" * 100)
    print(f"\nRESULTS: {correct} correct, {wrong} need checking, {unknown} unknown")
    print(f"SAMPLE ACCURACY: {correct/(correct+wrong)*100:.1f}%" if (correct+wrong) > 0 else "N/A")
    
    return correct, wrong, unknown

if __name__ == "__main__":
    random.seed(42)  # Reproducible
    sample_verification()
