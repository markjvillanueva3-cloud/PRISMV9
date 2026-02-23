"""
PRISM DEEP PARAMETER DIFFERENTIATION AUDIT
Check if materials have UNIQUE values or just copy-pasted defaults
"""

import json
from pathlib import Path
from collections import defaultdict
import hashlib

BASE_PATH = Path(r"C:\PRISM\data\materials")

def get_param_fingerprint(material):
    """Create fingerprint of key parameters"""
    params = []
    
    # Physical
    phys = material.get("physical", {})
    params.extend([
        phys.get("density"),
        phys.get("thermal_conductivity"),
        phys.get("specific_heat"),
        phys.get("elastic_modulus"),
    ])
    
    # Mechanical
    mech = material.get("mechanical", {})
    hardness = mech.get("hardness", {})
    tensile = mech.get("tensile_strength", {})
    params.extend([
        hardness.get("brinell") if isinstance(hardness, dict) else hardness,
        tensile.get("typical") if isinstance(tensile, dict) else tensile,
    ])
    
    # Kienzle
    kienzle = material.get("kienzle", {})
    params.extend([
        kienzle.get("kc1_1"),
        kienzle.get("mc"),
    ])
    
    # Johnson-Cook
    jc = material.get("johnson_cook", {})
    params.extend([
        jc.get("A"),
        jc.get("B"),
        jc.get("n"),
        jc.get("C"),
        jc.get("m"),
    ])
    
    # Taylor
    taylor = material.get("taylor", {})
    params.extend([
        taylor.get("C"),
        taylor.get("n"),
    ])
    
    # Machinability
    mach = material.get("machinability", {})
    params.append(mach.get("aisi_rating"))
    
    # Recommendations - turning speed
    rec = material.get("recommendations", {})
    turn = rec.get("turning", {})
    speed = turn.get("speed", {})
    params.append(speed.get("optimal") if isinstance(speed, dict) else None)
    
    return tuple(params)

def deep_audit():
    """Check parameter differentiation across all materials"""
    
    print("=" * 100)
    print("PRISM DEEP PARAMETER DIFFERENTIATION AUDIT")
    print("Checking if materials have UNIQUE values or copy-pasted defaults")
    print("=" * 100)
    
    # Collect all materials with their fingerprints
    all_materials = []
    fingerprints = defaultdict(list)
    
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
                    if not isinstance(mat, dict):
                        continue
                    
                    name = mat.get("name", "Unknown")
                    fp = get_param_fingerprint(mat)
                    
                    all_materials.append({
                        "name": name,
                        "iso": iso_dir,
                        "file": json_file.name,
                        "fingerprint": fp
                    })
                    
                    fingerprints[fp].append(name)
            except Exception as e:
                pass
    
    print(f"\nTotal materials analyzed: {len(all_materials)}")
    print(f"Unique parameter combinations: {len(fingerprints)}")
    
    uniqueness = len(fingerprints) / len(all_materials) * 100 if all_materials else 0
    print(f"\nUNIQUENESS RATIO: {uniqueness:.1f}%")
    
    # Find the most common fingerprints (potential copy-paste)
    print("\n" + "-" * 100)
    print("MOST COMMON PARAMETER COMBINATIONS (potential copy-paste):")
    print("-" * 100)
    
    sorted_fps = sorted(fingerprints.items(), key=lambda x: -len(x[1]))
    
    problem_materials = 0
    for fp, names in sorted_fps[:15]:
        count = len(names)
        if count > 1:
            problem_materials += count
            # Show first few parameters
            param_str = f"density={fp[0]}, kc1_1={fp[6]}, J-C A={fp[8]}"
            print(f"\n{count} materials share: {param_str}")
            for n in names[:5]:
                print(f"    - {n}")
            if count > 5:
                print(f"    ... and {count-5} more")
    
    print("\n" + "-" * 100)
    print("PARAMETER VARIANCE BY ISO GROUP:")
    print("-" * 100)
    
    # Check variance within each ISO group
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        
        group_mats = [m for m in all_materials if m["iso"] == iso_dir]
        if not group_mats:
            continue
        
        group_fps = set(m["fingerprint"] for m in group_mats)
        
        variance = len(group_fps) / len(group_mats) * 100 if group_mats else 0
        status = "GOOD" if variance > 30 else "LOW" if variance > 10 else "COPY-PASTE!"
        
        print(f"  {iso_dir:20s}: {len(group_mats):4d} materials, {len(group_fps):4d} unique ({variance:5.1f}%) [{status}]")
    
    # Check specific parameter distributions
    print("\n" + "-" * 100)
    print("PARAMETER DISTRIBUTION CHECK:")
    print("-" * 100)
    
    # Collect specific parameters
    kc1_1_values = defaultdict(int)
    jc_A_values = defaultdict(int)
    taylor_C_values = defaultdict(int)
    
    for mat in all_materials:
        fp = mat["fingerprint"]
        if fp[6]:  # kc1_1
            kc1_1_values[fp[6]] += 1
        if fp[8]:  # J-C A
            jc_A_values[fp[8]] += 1
        if fp[13]:  # Taylor C
            taylor_C_values[fp[13]] += 1
    
    print(f"\n  Kienzle kc1_1: {len(kc1_1_values)} unique values")
    top_kc = sorted(kc1_1_values.items(), key=lambda x: -x[1])[:5]
    for val, count in top_kc:
        pct = count / len(all_materials) * 100
        print(f"    {val}: {count} materials ({pct:.1f}%)")
    
    print(f"\n  Johnson-Cook A: {len(jc_A_values)} unique values")
    top_jc = sorted(jc_A_values.items(), key=lambda x: -x[1])[:5]
    for val, count in top_jc:
        pct = count / len(all_materials) * 100
        print(f"    {val}: {count} materials ({pct:.1f}%)")
    
    print(f"\n  Taylor C: {len(taylor_C_values)} unique values")
    top_taylor = sorted(taylor_C_values.items(), key=lambda x: -x[1])[:5]
    for val, count in top_taylor:
        pct = count / len(all_materials) * 100
        print(f"    {val}: {count} materials ({pct:.1f}%)")
    
    # Final verdict
    print("\n" + "=" * 100)
    if uniqueness > 50:
        print("VERDICT: GOOD - Materials have differentiated parameters")
    elif uniqueness > 20:
        print("VERDICT: MODERATE - Some differentiation but many duplicates")
    else:
        print("VERDICT: POOR - Most materials have copy-pasted values")
    print("=" * 100)
    
    return uniqueness, len(fingerprints), len(all_materials)

if __name__ == "__main__":
    deep_audit()
