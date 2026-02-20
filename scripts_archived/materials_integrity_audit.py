"""
PRISM Data Integrity Deep Audit
Find materials with WRONG default values applied
"""

import json
from pathlib import Path
from collections import defaultdict

BASE_PATH = Path(r"C:\PRISM\data\materials")

# Expected density ranges by material type (kg/m³)
DENSITY_RANGES = {
    "steel": (7700, 8100),
    "stainless": (7800, 8100),
    "cast_iron": (6800, 7500),
    "aluminum": (2600, 2900),
    "titanium": (4400, 4600),
    "superalloy": (7900, 8700),
    "copper": (8400, 9000),
    "bronze": (7500, 8900),
    "brass": (8400, 8800),
    "magnesium": (1700, 1900),
    "zinc": (6500, 7200),
    "polymer": (900, 2200),
    "composite": (1400, 2500),
    "ceramic": (2500, 6000),
    "graphite": (1500, 2300),
    "wood": (300, 1200),
}

def detect_material_type(name, iso_group):
    """Detect actual material type from name"""
    name_lower = name.lower() if name else ""
    
    # Check name first
    if "titanium" in name_lower or "ti-" in name_lower or "ti " in name_lower or name_lower.startswith("ti "):
        return "titanium"
    if "aluminum" in name_lower or "aluminium" in name_lower or "-t" in name_lower and "al" in name_lower:
        return "aluminum"
    if "copper" in name_lower or " cu" in name_lower:
        return "copper"
    if "bronze" in name_lower:
        return "bronze"
    if "brass" in name_lower:
        return "brass"
    if "magnesium" in name_lower or "mg " in name_lower:
        return "magnesium"
    if "zinc" in name_lower or " zn" in name_lower:
        return "zinc"
    if "inconel" in name_lower or "hastelloy" in name_lower or "waspaloy" in name_lower or "stellite" in name_lower:
        return "superalloy"
    if "polymer" in name_lower or "plastic" in name_lower or "nylon" in name_lower or "peek" in name_lower:
        return "polymer"
    if "composite" in name_lower or "cfrp" in name_lower or "gfrp" in name_lower:
        return "composite"
    if "ceramic" in name_lower or "alumina" in name_lower or "zirconia" in name_lower:
        return "ceramic"
    if "graphite" in name_lower:
        return "graphite"
    if "wood" in name_lower or "mdf" in name_lower:
        return "wood"
    if "rubber" in name_lower or "elastomer" in name_lower:
        return "polymer"
    if "cast iron" in name_lower or "gray iron" in name_lower or "ductile" in name_lower or "malleable" in name_lower:
        return "cast_iron"
    if "stainless" in name_lower or "inox" in name_lower:
        return "stainless"
    
    # Fall back to ISO group
    iso_map = {
        "P": "steel",
        "M": "stainless", 
        "K": "cast_iron",
        "N": "aluminum",  # Default for N, but could be copper/titanium
        "S": "superalloy",
        "H": "steel",
        "X": None  # Unknown
    }
    return iso_map.get(iso_group)

def audit_all_materials():
    """Find all materials with wrong density values"""
    
    issues = []
    stats = {
        "total": 0,
        "correct": 0,
        "wrong_density": 0,
        "unknown": 0,
        "by_type": defaultdict(lambda: {"total": 0, "wrong": 0})
    }
    
    iso_dirs = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    for iso_dir in iso_dirs:
        dir_path = BASE_PATH / iso_dir
        if not dir_path.exists():
            continue
        
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_"):
                continue
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                materials = data.get("materials", [])
                for mat in materials:
                    if not isinstance(mat, dict):
                        continue
                    
                    stats["total"] += 1
                    name = mat.get("name", "Unknown")
                    iso = mat.get("iso_group", iso_dir[0])
                    
                    # Get density
                    density = mat.get("physical", {}).get("density")
                    if not density:
                        continue
                    
                    # Detect what type this SHOULD be
                    mat_type = detect_material_type(name, iso)
                    
                    if mat_type is None:
                        stats["unknown"] += 1
                        continue
                    
                    stats["by_type"][mat_type]["total"] += 1
                    
                    # Check if density is in expected range
                    expected = DENSITY_RANGES.get(mat_type)
                    if expected:
                        if not (expected[0] <= density <= expected[1]):
                            stats["wrong_density"] += 1
                            stats["by_type"][mat_type]["wrong"] += 1
                            issues.append({
                                "name": name,
                                "file": f"{iso_dir}/{json_file.name}",
                                "type": mat_type,
                                "density": density,
                                "expected": expected
                            })
                        else:
                            stats["correct"] += 1
                    
            except Exception as e:
                print(f"Error reading {json_file}: {e}")
    
    return issues, stats

def main():
    print("=" * 100)
    print("PRISM DATA INTEGRITY DEEP AUDIT")
    print("Finding materials with WRONG class defaults applied")
    print("=" * 100)
    
    issues, stats = audit_all_materials()
    
    print(f"\nTotal materials checked: {stats['total']}")
    print(f"Correct density: {stats['correct']}")
    print(f"WRONG density: {stats['wrong_density']}")
    print(f"Unknown type: {stats['unknown']}")
    
    print("\n" + "-" * 80)
    print("BY MATERIAL TYPE:")
    print("-" * 80)
    for mat_type, data in sorted(stats["by_type"].items()):
        pct_wrong = data["wrong"] / data["total"] * 100 if data["total"] > 0 else 0
        status = "PROBLEM" if pct_wrong > 20 else "OK" if pct_wrong < 5 else "CHECK"
        print(f"  {mat_type:15s}: {data['total']:4d} total, {data['wrong']:4d} wrong ({pct_wrong:5.1f}%) [{status}]")
    
    print("\n" + "-" * 80)
    print(f"SAMPLE OF WRONG VALUES (showing first 30 of {len(issues)}):")
    print("-" * 80)
    
    for issue in issues[:30]:
        print(f"  {issue['name'][:40]:40s} | density={issue['density']:6.0f} | should be {issue['expected'][0]}-{issue['expected'][1]} ({issue['type']})")
    
    # Calculate overall error rate
    if stats['total'] > 0:
        error_rate = stats['wrong_density'] / stats['total'] * 100
        print(f"\n{'='*80}")
        print(f"OVERALL ERROR RATE: {error_rate:.1f}%")
        print(f"{'='*80}")
        
        if error_rate > 10:
            print("!!! CRITICAL: More than 10% of materials have wrong defaults !!!")
            print("Need to re-run enhancement with proper material classification")
    
    return issues, stats

if __name__ == "__main__":
    main()
