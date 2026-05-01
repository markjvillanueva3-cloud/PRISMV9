"""
PRISM COMPLETE 127-PARAMETER AUDIT v2.0
Comprehensive check of ALL parameters + uniqueness verification
"""

import json
from pathlib import Path
from collections import defaultdict

BASE_PATH = Path(r"C:\PRISM\data\materials")

def flatten_dict(d, prefix=""):
    """Flatten nested dict to dot-notation keys"""
    items = []
    for key, value in d.items():
        new_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            items.extend(flatten_dict(value, new_key).items())
        else:
            items.append((new_key, value))
    return dict(items)

def main():
    print("=" * 100)
    print("PRISM COMPLETE 127-PARAMETER AUDIT v2.0")
    print("=" * 100)
    
    # Collect all materials with flattened params
    all_materials = []
    param_counts = defaultdict(int)
    param_values = defaultdict(set)
    
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS",
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if not dir_path.exists():
            continue
        
        for json_file in sorted(dir_path.glob("*.json")):
            if json_file.name.startswith("_") or json_file.name == "index.json":
                continue
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for mat in data.get("materials", []):
                    if not isinstance(mat, dict):
                        continue
                    
                    flat = flatten_dict(mat)
                    all_materials.append(flat)
                    
                    for key, val in flat.items():
                        if key.startswith("_"):
                            continue
                        if val is not None and val != "" and val != []:
                            param_counts[key] += 1
                            if isinstance(val, (int, float, str, bool)):
                                param_values[key].add(val)
            except:
                pass
    
    print(f"\nTotal materials: {len(all_materials)}")
    print(f"Total unique parameters found: {len(param_counts)}")
    
    # Categorize parameters
    categories = {
        "physical": [], "mechanical": [], "kienzle": [], "johnson_cook": [],
        "taylor": [], "chip_formation": [], "tribology": [], "thermal_machining": [],
        "surface_integrity": [], "machinability": [], "cutting_recommendations": [],
        "process_specific": [], "identification": []
    }
    
    for param in param_counts.keys():
        if param.startswith("physical"):
            categories["physical"].append(param)
        elif param.startswith("mechanical"):
            categories["mechanical"].append(param)
        elif param.startswith("kienzle"):
            categories["kienzle"].append(param)
        elif param.startswith("johnson_cook"):
            categories["johnson_cook"].append(param)
        elif param.startswith("taylor"):
            categories["taylor"].append(param)
        elif param.startswith("chip_formation"):
            categories["chip_formation"].append(param)
        elif param.startswith("tribology"):
            categories["tribology"].append(param)
        elif param.startswith("thermal_machining"):
            categories["thermal_machining"].append(param)
        elif param.startswith("surface_integrity"):
            categories["surface_integrity"].append(param)
        elif param.startswith("machinability"):
            categories["machinability"].append(param)
        elif param.startswith("cutting"):
            categories["cutting_recommendations"].append(param)
        elif param.startswith("process"):
            categories["process_specific"].append(param)
        elif param in ["name", "iso_group", "material_type", "iso_p_equivalent", "material_number", 
                       "uns_number", "din_number", "jis_number", "common_names", "category", "subcategory"]:
            categories["identification"].append(param)
    
    # Count stats
    total_numeric = 0
    unique_100pct = 0
    unique_99pct = 0
    categorical_params = 0
    
    print("\n" + "=" * 100)
    print("PARAMETER COVERAGE BY CATEGORY")
    print("=" * 100)
    
    for cat_name, params in categories.items():
        if not params:
            continue
        
        print(f"\n{cat_name.upper().replace('_', ' ')} ({len(params)} params):")
        print("-" * 90)
        
        for param in sorted(params):
            count = param_counts[param]
            unique = len(param_values.get(param, set()))
            pct = count / len(all_materials) * 100
            unique_pct = unique / count * 100 if count > 0 else 0
            
            # Determine if numeric or categorical
            sample_vals = list(param_values.get(param, set()))[:5]
            is_numeric = all(isinstance(v, (int, float)) for v in sample_vals) if sample_vals else False
            
            if is_numeric:
                total_numeric += 1
                if unique == count:
                    unique_100pct += 1
                    status = "[100% UNIQUE]"
                elif unique_pct >= 99:
                    unique_99pct += 1
                    status = f"[{unique_pct:.1f}% unique]"
                else:
                    status = f"[{unique_pct:.1f}% unique]"
            else:
                categorical_params += 1
                status = f"[{unique} categories]"
            
            print(f"  {param:55} {count:5}/{len(all_materials)} {status}")
    
    # Summary
    print("\n" + "=" * 100)
    print("SUMMARY")
    print("=" * 100)
    print(f"Materials: {len(all_materials)}")
    print(f"Total parameters: {len(param_counts)}")
    print(f"  Numeric parameters: {total_numeric}")
    print(f"  Categorical parameters: {categorical_params}")
    print(f"Numeric params 100% unique: {unique_100pct}/{total_numeric}")
    print(f"Numeric params 99%+ unique: {unique_100pct + unique_99pct}/{total_numeric}")
    
    # Check for fingerprint uniqueness
    print("\n" + "=" * 100)
    print("FINGERPRINT UNIQUENESS CHECK")
    print("=" * 100)
    
    # Create fingerprint from key numeric params
    fingerprints = set()
    for mat in all_materials:
        fp = (
            mat.get("physical.density"),
            mat.get("kienzle.kc1_1"),
            mat.get("johnson_cook.A"),
            mat.get("taylor.C"),
            mat.get("mechanical.hardness.brinell")
        )
        fingerprints.add(fp)
    
    print(f"5-param fingerprint uniqueness: {len(fingerprints)}/{len(all_materials)} ({len(fingerprints)/len(all_materials)*100:.1f}%)")
    
    if len(fingerprints) == len(all_materials):
        print("RESULT: 100% UNIQUE MATERIAL COMBINATIONS")
    else:
        print(f"RESULT: {len(all_materials) - len(fingerprints)} duplicate fingerprints found")

if __name__ == "__main__":
    main()
