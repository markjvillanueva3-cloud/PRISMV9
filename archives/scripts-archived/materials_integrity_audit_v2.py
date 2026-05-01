"""
PRISM Data Integrity Deep Audit v2
With improved detection logic to reduce false positives
"""

import json
from pathlib import Path
from collections import defaultdict
import re

BASE_PATH = Path(r"C:\PRISM\data\materials")

# Expected density ranges by material type (kg/m³) - WIDENED for special alloys
DENSITY_RANGES = {
    "steel": (6300, 8700),       # Widened for TRIPLEX (low) and HSS (high)
    "stainless": (7700, 8200),
    "cast_iron": (6800, 7600),
    "aluminum": (2500, 2950),
    "titanium": (4300, 4700),
    "superalloy": (7800, 9000),
    "copper": (8200, 9100),
    "bronze": (7400, 9000),
    "brass": (8300, 8900),
    "magnesium": (1650, 1950),
    "zinc": (6400, 7300),
    "polymer": (850, 2300),
    "composite": (1300, 2600),
    "ceramic": (2400, 6500),
    "graphite": (1400, 2400),
    "wood": (250, 1300),
}

def detect_material_type_v2(name, iso_group, file_path=None):
    """Improved material type detection with fewer false positives"""
    name_lower = name.lower() if name else ""
    file_lower = str(file_path).lower() if file_path else ""
    
    # EXCLUSION PATTERNS - things that look like other materials but aren't
    # These override other detections
    if any(x in name_lower for x in ["4330", "4340", "4130", "4140", "4150"]):
        return "steel"  # These are definitely steels despite containing numbers
    if "hy-tuf" in name_lower or "hytuf" in name_lower:
        return "steel"
    if "12l14" in name_lower or "1214" in name_lower or "1215" in name_lower:
        return "steel"  # Free machining steels
    if "maraging" in name_lower:
        return "steel"  # Maraging steels
    if "twip" in name_lower or "triplex" in name_lower:
        return "steel"  # Special steels
    if "cpm" in name_lower or "hss" in name_lower or "high speed" in name_lower:
        return "steel"  # Tool steels
    # AISI steels (10xx through 92xx series)
    if re.search(r'\baisi\s*[1-9]\d{3}', name_lower):
        return "steel"
    if re.search(r'\b[1-9]\d{3}\s*(steel|hardened|annealed|normalized|q&t|hot rolled|cold)', name_lower):
        return "steel"
    
    # File path hints (strongest signal)
    if any(x in file_lower for x in ["/titanium.", "_titanium_", "titanium/"]):
        return "titanium"
    if any(x in file_lower for x in ["/aluminum.", "_aluminum_", "/alumin"]):
        return "aluminum"
    if any(x in file_lower for x in ["/polymer.", "_polymer_", "engineering_polymer", "/plastic"]):
        return "polymer"
    if any(x in file_lower for x in ["/composite.", "_composite_", "cfrp", "gfrp"]):
        return "composite"
    if any(x in file_lower for x in ["/ceramic.", "_ceramic_"]):
        return "ceramic"
    if any(x in file_lower for x in ["/graphite.", "_graphite_"]):
        return "graphite"
    if any(x in file_lower for x in ["/wood.", "_wood_"]):
        return "wood"
    if any(x in file_lower for x in ["/copper_alloy", "_copper_"]):
        return "copper"
    if any(x in file_lower for x in ["/bronze.", "_bronze_"]):
        return "bronze"
    if any(x in file_lower for x in ["/magnesium.", "_magnesium_"]):
        return "magnesium"
    if any(x in file_lower for x in ["/superalloy", "_superalloy", "nickel_base", "cobalt_base"]):
        return "superalloy"
    
    # Name-based detection (with exclusions already handled above)
    if any(x in name_lower for x in ["titanium", "ti-6al", "ti-6-4", "grade 5 ti", "cp ti"]):
        return "titanium"
    if "ti " in name_lower and any(x in name_lower for x in ["alloy", "grade", "ebm", "slm"]):
        return "titanium"
    
    # Aluminum alloys (specific patterns) - MUST have temper designation
    # Pattern: 4 digits followed by -T or -H or -O (e.g., 6061-T6, 2024-T3, 5052-H32)
    if re.search(r'\b[1-7]\d{3}[-\s]?[THOF]\d', name_lower):  # Like 6061-T6, 2024-T3
        return "aluminum"
    if any(x in name_lower for x in ["aluminum", "aluminium"]) and "bronze" not in name_lower:
        return "aluminum"
    # Common aluminum alloy families in N_NONFERROUS that don't have temper
    if iso_group == "N" and re.search(r'\b(1050|1100|2011|2017|2024|3003|5052|5083|6061|6063|7075)\b', name_lower):
        return "aluminum"
    
    # Superalloys
    if any(x in name_lower for x in ["inconel", "hastelloy", "waspaloy", "stellite", "monel", "rene", "udimet"]):
        return "superalloy"
    
    # Polymers
    if any(x in name_lower for x in ["peek", "ptfe", "nylon", "delrin", "acetal", "ultem", "pom", 
                                      "pvc", "abs", "polycarbonate", "polyethylene", "polypropylene",
                                      "pla", "petg", "polyamide", "hdpe", "ldpe"]):
        return "polymer"
    
    # Composites
    if any(x in name_lower for x in ["cfrp", "gfrp", "carbon fiber", "glass fiber", "kevlar", 
                                      "composite", "fiberglass", "aramid"]):
        return "composite"
    
    # Ceramics
    if any(x in name_lower for x in ["alumina", "zirconia", "silicon carbide", "silicon nitride", 
                                      "ceramic", "sic", "si3n4", "al2o3"]):
        return "ceramic"
    
    # Graphite
    if "graphite" in name_lower:
        return "graphite"
    
    # Wood
    if any(x in name_lower for x in ["wood", "mdf", "plywood", "hardwood", "softwood", "oak", "maple", "birch"]):
        return "wood"
    
    # Copper/Bronze/Brass
    if any(x in name_lower for x in ["bronze", "phos bronze", "tin bronze", "aluminum bronze"]):
        return "bronze"
    if "brass" in name_lower:
        return "brass"
    if any(x in name_lower for x in ["beryllium copper", "becu", "berylco"]):
        return "copper"
    if re.search(r'\bc\d{4,5}\b', name_lower):  # UNS copper designations like C11000
        return "copper"
    
    # Magnesium
    if any(x in name_lower for x in ["magnesium", "az31", "az91", "am60", "ze41"]):
        return "magnesium"
    
    # Zinc
    if any(x in name_lower for x in ["zamak", "zinc"]) and "galv" not in name_lower:
        return "zinc"
    
    # Cast iron
    if any(x in name_lower for x in ["cast iron", "gray iron", "grey iron", "ductile iron", 
                                      "malleable", "nodular", "cgi", "compacted graphite"]):
        return "cast_iron"
    
    # Stainless (if in M group or explicit) - BEFORE polymer check
    if "316" in name_lower or "304" in name_lower or "410" in name_lower or "420" in name_lower:
        return "stainless"
    if "surgical" in name_lower or "implant" in name_lower:
        return "stainless"  # Medical grade stainless
    if iso_group == "M" or any(x in name_lower for x in ["stainless", "inox", "corrosion resistant"]):
        return "stainless"
    
    # Default by ISO group for basic metals
    if iso_group == "P":
        return "steel"
    if iso_group == "K":
        return "cast_iron"
    if iso_group == "S":
        return "superalloy"
    if iso_group == "H":
        return "steel"
    if iso_group == "N":
        # N could be aluminum, copper, or titanium - don't assume
        return None
    
    return None  # Unknown

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
                    
                    density = mat.get("physical", {}).get("density")
                    if not density:
                        continue
                    
                    mat_type = detect_material_type_v2(name, iso, f"{iso_dir}/{json_file.name}")
                    
                    if mat_type is None:
                        stats["unknown"] += 1
                        continue
                    
                    stats["by_type"][mat_type]["total"] += 1
                    
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
                pass
    
    return issues, stats

def main():
    print("=" * 100)
    print("PRISM DATA INTEGRITY AUDIT v2 (Improved Detection)")
    print("=" * 100)
    
    issues, stats = audit_all_materials()
    
    print(f"\nTotal materials: {stats['total']}")
    print(f"Verified correct: {stats['correct']}")
    print(f"Density issues: {stats['wrong_density']}")
    print(f"Unknown type (not checked): {stats['unknown']}")
    
    verified_total = stats['correct'] + stats['wrong_density']
    if verified_total > 0:
        accuracy = stats['correct'] / verified_total * 100
        print(f"\nACCURACY RATE: {accuracy:.1f}%")
    
    print("\n" + "-" * 80)
    print("BY MATERIAL TYPE:")
    print("-" * 80)
    for mat_type, data in sorted(stats["by_type"].items(), key=lambda x: -x[1]["total"]):
        pct_correct = (data["total"] - data["wrong"]) / data["total"] * 100 if data["total"] > 0 else 0
        status = "OK" if pct_correct >= 95 else "CHECK" if pct_correct >= 80 else "PROBLEM"
        print(f"  {mat_type:15s}: {data['total']:4d} total, {pct_correct:5.1f}% correct [{status}]")
    
    if issues:
        print(f"\n" + "-" * 80)
        print(f"REMAINING ISSUES ({len(issues)} materials):")
        print("-" * 80)
        for issue in issues[:20]:
            print(f"  {issue['name'][:45]:45s} density={issue['density']:6.0f} (expected {issue['expected'][0]}-{issue['expected'][1]} for {issue['type']})")
    
    return stats

if __name__ == "__main__":
    main()
