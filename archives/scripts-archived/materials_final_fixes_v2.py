"""
PRISM Final Detection + Data Fixes v2
Fix remaining detection bugs and data issues
"""

import json
from pathlib import Path
from datetime import datetime
import re

BASE_PATH = Path(r"C:\PRISM\data\materials")

def fix_file(json_file):
    """Fix materials in a file"""
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
            
            if "physical" not in material:
                material["physical"] = {}
            
            current_density = material["physical"].get("density")
            fixed = False
            
            # CGI (Compacted Graphite Iron) - should be ~7300
            if "cgi" in name_lower or "compacted graphite" in name_lower:
                if current_density and current_density < 5000:
                    material["physical"]["density"] = 7300
                    fixed = True
                    print(f"  Fixed CGI: {name} {current_density} -> 7300")
            
            # Zinc alloys in copper_alloy file - should be ~6800
            if any(x in name_lower for x in ["zamak", "zinc"]) and current_density:
                if current_density > 8000:  # Got copper defaults
                    material["physical"]["density"] = 6800
                    fixed = True
                    print(f"  Fixed zinc: {name} {current_density} -> 6800")
            
            # Pure copper alloys that got wrong defaults
            if "c1" in name_lower and not any(x in name_lower for x in ["c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19"]):
                pass  # Skip, let it stay
            
            # Beryllium copper should be ~8250
            if any(x in name_lower for x in ["beryllium", "becu", "berylco", "c17"]):
                if current_density and (current_density < 8000 or current_density > 8500):
                    material["physical"]["density"] = 8250
                    fixed = True
                    print(f"  Fixed BeCu: {name} {current_density} -> 8250")
            
            # Lead-tin bronzes are heavier (~8900)
            if any(x in name_lower for x in ["c93", "c94"]) and "bronze" in name_lower:
                if current_density and current_density < 8500:
                    material["physical"]["density"] = 8900
                    fixed = True
                    print(f"  Fixed leaded bronze: {name}")
            
            # Polymer check - materials incorrectly classified
            # 316LVM, Hardox, A514 are steels not polymers
            if any(x in name_lower for x in ["316lvm", "hardox", "a514", "plate"]):
                if current_density and 7700 < current_density < 8200:
                    # Density is correct for steel, no change needed
                    pass
            
            if fixed:
                material["_final_fix_v2"] = datetime.now().isoformat()
                fixes += 1
        
        if fixes > 0:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return fixes
    
    except Exception as e:
        print(f"Error: {e}")
        return 0

def main():
    print("=" * 80)
    print("PRISM FINAL FIXES v2")
    print("=" * 80)
    
    total = 0
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if dir_path.exists():
            for f in dir_path.glob("*.json"):
                if not f.name.startswith("_"):
                    total += fix_file(f)
    
    print(f"\nTotal fixed: {total}")

if __name__ == "__main__":
    main()
