"""
PRISM Final Data Fixes
Fix the remaining real data issues (not detection bugs)
"""

import json
from pathlib import Path
from datetime import datetime

BASE_PATH = Path(r"C:\PRISM\data\materials")

# Specific materials that need fixing
SPECIFIC_FIXES = {
    # AISI 92xx steels got ceramic defaults - fix to steel
    "9254": {"density": 7850, "type": "steel"},
    "9260": {"density": 7850, "type": "steel"},
    
    # AL-6XN is super-austenitic stainless (the AL is for Allegheny Ludlum, not aluminum)
    "AL-6XN": {"density": 8060, "type": "stainless"},
    
    # T1 Tungsten HSS - 8750 is actually CORRECT (high tungsten content)
    # No fix needed
    
    # Gray iron should be ~7200 not 7850
    "Gray Iron": {"density": 7150, "type": "cast_iron"},
    "Grey Iron": {"density": 7150, "type": "cast_iron"},
    
    # Hardox is wear-resistant steel, not polymer
    "Hardox": {"density": 7850, "type": "steel"},
    
    # ASTM A514 is steel
    "A514": {"density": 7850, "type": "steel"},
}

# Cast iron proper values
CAST_IRON_PROPS = {
    "density": 7150,
    "thermal_conductivity": 50.0,
    "melting_point": {"solidus": 1130, "liquidus": 1250},
}

def fix_file(json_file):
    """Fix specific materials in a file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        if not materials:
            return 0
        
        fixes = 0
        for material in materials:
            if not isinstance(material, dict):
                continue
            
            name = material.get("name", "")
            name_lower = name.lower()
            
            # Check for specific fixes
            for pattern, fix_data in SPECIFIC_FIXES.items():
                if pattern.lower() in name_lower:
                    # Apply density fix
                    if "physical" not in material:
                        material["physical"] = {}
                    
                    current = material["physical"].get("density")
                    target = fix_data["density"]
                    
                    # Only fix if substantially wrong
                    if current and abs(current - target) > target * 0.15:
                        material["physical"]["density"] = target
                        material["_specific_fix"] = {
                            "timestamp": datetime.now().isoformat(),
                            "pattern": pattern,
                            "original_density": current,
                            "corrected_density": target
                        }
                        fixes += 1
                        print(f"  Fixed: {name} density {current} -> {target}")
                    break
            
            # Fix cast iron specifically
            if any(x in name_lower for x in ["cast iron", "gray iron", "grey iron", "ductile", "malleable", "nodular"]):
                if "physical" not in material:
                    material["physical"] = {}
                
                current = material["physical"].get("density")
                if current and current > 7500:  # Got steel defaults
                    material["physical"]["density"] = 7150
                    material["physical"]["thermal_conductivity"] = 50.0
                    material["_cast_iron_fix"] = datetime.now().isoformat()
                    fixes += 1
                    print(f"  Fixed cast iron: {name}")
        
        if fixes > 0:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return fixes
    
    except Exception as e:
        print(f"Error processing {json_file}: {e}")
        return 0

def main():
    print("=" * 80)
    print("PRISM FINAL DATA FIXES")
    print("=" * 80)
    
    total_fixes = 0
    
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if not dir_path.exists():
            continue
        
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_"):
                continue
            
            fixes = fix_file(json_file)
            total_fixes += fixes
    
    print(f"\nTotal materials fixed: {total_fixes}")
    return total_fixes

if __name__ == "__main__":
    main()
