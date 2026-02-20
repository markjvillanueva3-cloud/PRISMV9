"""PRISM 127-PARAM VERIFICATION - Check uniqueness of ALL numeric parameters"""

import json
from pathlib import Path
from collections import defaultdict

BASE = Path(r"C:\PRISM\data\materials")

def flatten(obj, prefix=""):
    """Flatten nested dict to key-value pairs"""
    items = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                items.update(flatten(v, new_key))
            elif isinstance(v, (int, float)) and v is not None:
                items[new_key] = v
            elif isinstance(v, str):
                items[new_key] = v  # categorical
    return items

def main():
    print("=" * 80)
    print("PRISM 127-PARAMETER UNIQUENESS VERIFICATION")
    print("=" * 80)
    
    all_mats = []
    for d in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dp = BASE / d
        if not dp.exists(): continue
        for f in dp.glob("*.json"):
            if f.name.startswith("_") or f.name == "index.json": continue
            try:
                data = json.load(open(f, encoding='utf-8'))
                for mat in data.get("materials", []):
                    if isinstance(mat, dict):
                        flat = flatten(mat)
                        flat["_name"] = mat.get("name", "?")
                        all_mats.append(flat)
            except: pass
    
    print(f"Total materials: {len(all_mats)}")
    
    # Collect all parameter values
    param_values = defaultdict(list)
    for mat in all_mats:
        for k, v in mat.items():
            if not k.startswith("_"):
                param_values[k].append(v)
    
    # Analyze uniqueness
    numeric_params = []
    categorical_params = []
    
    for param, values in sorted(param_values.items()):
        non_null = [v for v in values if v is not None]
        if not non_null:
            continue
        
        unique_count = len(set(non_null))
        total_count = len(non_null)
        
        # Check if numeric or categorical
        if isinstance(non_null[0], (int, float)):
            numeric_params.append((param, unique_count, total_count))
        else:
            categorical_params.append((param, unique_count, total_count))
    
    # Report numeric parameters
    print(f"\n{'=' * 80}")
    print(f"NUMERIC PARAMETERS ({len(numeric_params)} total)")
    print(f"{'=' * 80}")
    
    all_unique = 0
    not_unique = []
    
    for param, unique, total in sorted(numeric_params, key=lambda x: -x[1]/max(x[2],1)):
        pct = unique / total * 100 if total > 0 else 0
        if unique == total:
            all_unique += 1
            status = "100% UNIQUE"
        else:
            status = f"{pct:.1f}% unique"
            not_unique.append((param, unique, total, pct))
        print(f"  {param:50} {unique:5}/{total:5} {status}")
    
    # Report categorical
    print(f"\n{'=' * 80}")
    print(f"CATEGORICAL PARAMETERS ({len(categorical_params)} total)")
    print(f"{'=' * 80}")
    
    for param, unique, total in sorted(categorical_params):
        print(f"  {param:50} {unique:5} categories")
    
    # Summary
    print(f"\n{'=' * 80}")
    print("SUMMARY")
    print(f"{'=' * 80}")
    print(f"Total parameters: {len(numeric_params) + len(categorical_params)}")
    print(f"Numeric parameters: {len(numeric_params)}")
    print(f"  - 100% unique: {all_unique}")
    print(f"  - Not fully unique: {len(not_unique)}")
    print(f"Categorical parameters: {len(categorical_params)}")
    print(f"Materials: {len(all_mats)}")
    
    if not_unique:
        print(f"\n{'=' * 80}")
        print("NUMERIC PARAMS NOT 100% UNIQUE:")
        print(f"{'=' * 80}")
        for p, u, t, pct in sorted(not_unique, key=lambda x: x[3]):
            print(f"  {p:50} {u}/{t} ({pct:.1f}%)")
    
    # Check fingerprint uniqueness
    print(f"\n{'=' * 80}")
    print("MATERIAL FINGERPRINT UNIQUENESS")
    print(f"{'=' * 80}")
    
    # Use 5 key numeric params as fingerprint
    fingerprints = set()
    for mat in all_mats:
        fp = (
            mat.get("physical.density"),
            mat.get("kienzle.kc1_1"),
            mat.get("johnson_cook.A"),
            mat.get("taylor.C"),
            mat.get("mechanical.hardness.brinell")
        )
        fingerprints.add(fp)
    
    print(f"Unique fingerprints: {len(fingerprints)}/{len(all_mats)} ({len(fingerprints)/len(all_mats)*100:.1f}%)")

if __name__ == "__main__":
    main()
