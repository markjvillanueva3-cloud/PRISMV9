"""
PRISM Data Quality Verification
Verify materials have class-appropriate differentiated values, not copy-paste
"""

import json
from pathlib import Path
from collections import defaultdict

BASE_PATH = Path(r"C:\PRISM\data\materials")

def sample_materials():
    """Sample materials from each ISO group and compare key values"""
    
    samples = {}
    
    iso_dirs = {
        "P_STEELS": "Steel",
        "M_STAINLESS": "Stainless", 
        "K_CAST_IRON": "Cast Iron",
        "N_NONFERROUS": "Aluminum/Copper",
        "S_SUPERALLOYS": "Superalloy",
        "H_HARDENED": "Hardened Steel",
        "X_SPECIALTY": "Specialty"
    }
    
    for iso_dir, label in iso_dirs.items():
        dir_path = BASE_PATH / iso_dir
        if not dir_path.exists():
            continue
        
        # Get first file with materials
        for json_file in sorted(dir_path.glob("*.json"))[:2]:
            if json_file.name.startswith("_"):
                continue
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                materials = data.get("materials", [])
                if materials:
                    # Take first 2 materials from each file
                    for mat in materials[:2]:
                        key = f"{iso_dir}_{mat.get('name', 'unknown')[:30]}"
                        samples[key] = {
                            "name": mat.get("name"),
                            "iso": mat.get("iso_group"),
                            "file": json_file.name,
                            # Physical
                            "density": mat.get("physical", {}).get("density"),
                            "thermal_cond": mat.get("physical", {}).get("thermal_conductivity"),
                            "melting_pt": mat.get("physical", {}).get("melting_point", {}).get("solidus") if isinstance(mat.get("physical", {}).get("melting_point"), dict) else mat.get("physical", {}).get("melting_point"),
                            # Mechanical
                            "hardness": mat.get("mechanical", {}).get("hardness", {}).get("brinell") if isinstance(mat.get("mechanical", {}).get("hardness"), dict) else mat.get("mechanical", {}).get("hardness"),
                            "tensile": mat.get("mechanical", {}).get("tensile_strength", {}).get("typical") if isinstance(mat.get("mechanical", {}).get("tensile_strength"), dict) else mat.get("mechanical", {}).get("tensile_strength"),
                            "elongation": mat.get("mechanical", {}).get("elongation", {}).get("typical") if isinstance(mat.get("mechanical", {}).get("elongation"), dict) else mat.get("mechanical", {}).get("elongation"),
                            # Machining
                            "machinability": mat.get("machinability", {}).get("aisi_rating"),
                            "chip_type": mat.get("chip_formation", {}).get("chip_type"),
                            # Kienzle
                            "kc1_1": mat.get("kienzle", {}).get("kc1_1"),
                            # Recommendations  
                            "turn_speed": mat.get("recommendations", {}).get("turning", {}).get("speed", {}).get("optimal") if isinstance(mat.get("recommendations", {}).get("turning", {}).get("speed"), dict) else None,
                        }
            except Exception as e:
                print(f"Error reading {json_file}: {e}")
    
    return samples

def print_comparison():
    """Print side-by-side comparison"""
    
    print("=" * 120)
    print("PRISM MATERIALS DATA QUALITY VERIFICATION")
    print("Checking that different material classes have appropriate differentiated values")
    print("=" * 120)
    
    samples = sample_materials()
    
    # Group by ISO
    by_iso = defaultdict(list)
    for key, data in samples.items():
        iso = key.split("_")[0] + "_" + key.split("_")[1]
        by_iso[iso].append((key, data))
    
    # Expected ranges for validation
    expected = {
        "P_STEELS": {"density": (7800, 7900), "thermal_cond": (40, 55), "hardness": (120, 300), "machinability": (40, 100)},
        "M_STAINLESS": {"density": (7900, 8100), "thermal_cond": (14, 20), "hardness": (150, 300), "machinability": (30, 60)},
        "K_CAST": {"density": (7000, 7400), "thermal_cond": (35, 55), "hardness": (150, 300), "machinability": (60, 100)},
        "N_NONFERROUS": {"density": (2600, 9000), "thermal_cond": (100, 400), "hardness": (30, 150), "machinability": (50, 500)},
        "S_SUPERALLOYS": {"density": (8000, 8500), "thermal_cond": (8, 15), "hardness": (250, 450), "machinability": (8, 30)},
        "H_HARDENED": {"density": (7700, 8200), "thermal_cond": (20, 45), "hardness": (200, 700), "machinability": (15, 50)},
        "X_SPECIALTY": {"density": (1000, 9000), "thermal_cond": (0.1, 400), "hardness": (10, 400), "machinability": (10, 600)},
    }
    
    print("\n" + "-" * 120)
    print(f"{'Material':<40} {'Density':>8} {'ThermCond':>10} {'Hardness':>10} {'Tensile':>10} {'Elong':>8} {'Machin':>8} {'ChipType':>15}")
    print("-" * 120)
    
    issues = []
    last_iso = None
    
    for iso in sorted(by_iso.keys()):
        if iso != last_iso:
            print(f"\n--- {iso} ---")
            last_iso = iso
        
        for key, data in by_iso[iso][:3]:  # Max 3 per group
            name = data['name'][:38] if data['name'] else 'Unknown'
            density = data.get('density', '-')
            thermal = data.get('thermal_cond', '-')
            hardness = data.get('hardness', '-')
            tensile = data.get('tensile', '-')
            elong = data.get('elongation', '-')
            machin = data.get('machinability', '-')
            chip = data.get('chip_type', '-')
            
            print(f"{name:<40} {str(density):>8} {str(thermal):>10} {str(hardness):>10} {str(tensile):>10} {str(elong):>8} {str(machin):>8} {str(chip):>15}")
            
            # Validate against expected ranges
            for exp_key in expected:
                if iso.startswith(exp_key[:6]):
                    exp = expected[exp_key]
                    if density and density != '-':
                        if not (exp["density"][0] <= float(density) <= exp["density"][1]):
                            issues.append(f"{name}: density {density} outside expected {exp['density']}")
    
    # Check for duplicate values (copy-paste detection)
    print("\n" + "=" * 120)
    print("DUPLICATE VALUE DETECTION (checking for copy-paste)")
    print("=" * 120)
    
    value_sets = defaultdict(list)
    for key, data in samples.items():
        # Create a fingerprint of key values
        fingerprint = (
            data.get('density'),
            data.get('thermal_cond'),
            data.get('hardness'),
            data.get('tensile'),
            data.get('machinability')
        )
        value_sets[fingerprint].append(data.get('name', key))
    
    duplicates_found = False
    for fingerprint, names in value_sets.items():
        if len(names) > 1 and fingerprint != (None, None, None, None, None):
            duplicates_found = True
            print(f"\nDUPLICATE FINGERPRINT: {fingerprint}")
            for name in names[:5]:
                print(f"  - {name}")
    
    if not duplicates_found:
        print("\n✓ No exact duplicate value sets found across different materials!")
    
    # Statistical variance check
    print("\n" + "=" * 120)
    print("VALUE VARIANCE BY ISO GROUP (should NOT be zero for real data)")
    print("=" * 120)
    
    for iso in sorted(by_iso.keys()):
        densities = [d['density'] for _, d in by_iso[iso] if d.get('density')]
        hardnesses = [d['hardness'] for _, d in by_iso[iso] if d.get('hardness')]
        
        if densities:
            d_min, d_max = min(densities), max(densities)
            d_var = d_max - d_min
        else:
            d_var = "N/A"
        
        if hardnesses:
            h_min, h_max = min(hardnesses), max(hardnesses)
            h_var = h_max - h_min
        else:
            h_var = "N/A"
        
        print(f"{iso}: Density variance={d_var}, Hardness variance={h_var}")
    
    if issues:
        print("\n" + "=" * 120)
        print("VALIDATION ISSUES FOUND:")
        print("=" * 120)
        for issue in issues[:10]:
            print(f"  ⚠ {issue}")
    
    return samples

if __name__ == "__main__":
    print_comparison()
