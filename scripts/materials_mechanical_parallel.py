"""
PRISM Parallel Mechanical Property Enhancement Engine v1.0
Uses concurrent processing with multiple estimation strategies:
1. Cross-reference from consolidated/unified databases
2. Similar material interpolation (same ISO group + class)
3. Physics-based estimation (hardness ↔ tensile correlations)
4. Literature defaults by material class
"""

import json
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
import multiprocessing as mp
import math
import traceback

# =============================================================================
# CONFIGURATION
# =============================================================================

NUM_WORKERS = min(8, mp.cpu_count())  # Use up to 8 parallel workers
PRISM_ROOT = Path(r"C:\PRISM\data")

# Data sources (priority order)
DATA_SOURCES = [
    PRISM_ROOT / "materials",
    PRISM_ROOT / "materials_unified", 
    PRISM_ROOT / "materials_consolidated",
]

# =============================================================================
# PHYSICS-BASED CORRELATIONS
# =============================================================================

# Tensile strength to Brinell hardness correlations by material class
# HB ≈ tensile / factor
TENSILE_TO_HB_FACTOR = {
    "steel": 3.45,
    "stainless": 3.30,
    "cast_iron": 3.00,
    "aluminum": 2.75,
    "titanium": 3.20,
    "superalloy": 3.50,
    "copper": 3.00,
    "default": 3.45
}

# Yield strength typically 0.6-0.85 of tensile
YIELD_RATIO = {
    "steel": 0.70,
    "stainless": 0.45,  # Austenitic has low yield ratio
    "cast_iron": 0.75,
    "aluminum": 0.85,
    "titanium": 0.90,
    "superalloy": 0.80,
    "copper": 0.35,
    "default": 0.70
}

# Elongation defaults by class (%)
ELONGATION_DEFAULTS = {
    "steel": 20,
    "stainless": 40,
    "cast_iron": 2,
    "aluminum": 12,
    "titanium": 10,
    "superalloy": 15,
    "copper": 30,
    "default": 15
}

# Typical mechanical properties by material class (for estimation)
MECHANICAL_DEFAULTS = {
    "steel": {
        "tensile_strength": 550,
        "yield_strength": 380,
        "hardness_hb": 160,
        "elongation": 22,
        "elastic_modulus": 205000,
        "fatigue_strength": 250,
        "fracture_toughness": 100
    },
    "stainless": {
        "tensile_strength": 580,
        "yield_strength": 260,
        "hardness_hb": 170,
        "elongation": 45,
        "elastic_modulus": 193000,
        "fatigue_strength": 240,
        "fracture_toughness": 150
    },
    "cast_iron": {
        "tensile_strength": 300,
        "yield_strength": 220,
        "hardness_hb": 200,
        "elongation": 2,
        "elastic_modulus": 110000,
        "fatigue_strength": 120,
        "fracture_toughness": 20
    },
    "aluminum": {
        "tensile_strength": 310,
        "yield_strength": 275,
        "hardness_hb": 95,
        "elongation": 12,
        "elastic_modulus": 70000,
        "fatigue_strength": 95,
        "fracture_toughness": 30
    },
    "titanium": {
        "tensile_strength": 900,
        "yield_strength": 830,
        "hardness_hb": 330,
        "elongation": 10,
        "elastic_modulus": 114000,
        "fatigue_strength": 500,
        "fracture_toughness": 75
    },
    "superalloy": {
        "tensile_strength": 1100,
        "yield_strength": 850,
        "hardness_hb": 350,
        "elongation": 15,
        "elastic_modulus": 210000,
        "fatigue_strength": 450,
        "fracture_toughness": 100
    },
    "copper": {
        "tensile_strength": 350,
        "yield_strength": 120,
        "hardness_hb": 80,
        "elongation": 35,
        "elastic_modulus": 117000,
        "fatigue_strength": 100,
        "fracture_toughness": 80
    },
    "default": {
        "tensile_strength": 500,
        "yield_strength": 350,
        "hardness_hb": 150,
        "elongation": 15,
        "elastic_modulus": 200000,
        "fatigue_strength": 200,
        "fracture_toughness": 80
    }
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_material_class(iso_group, name=None):
    """Map ISO group to material class"""
    iso_map = {
        "P": "steel",
        "M": "stainless",
        "K": "cast_iron",
        "N": "aluminum",
        "S": "superalloy",
        "H": "steel",
        "X": "default"
    }
    mat_class = iso_map.get(iso_group, "default")
    
    if name:
        name_lower = name.lower()
        if "titanium" in name_lower or "ti-" in name_lower:
            mat_class = "titanium"
        elif "inconel" in name_lower or "hastelloy" in name_lower or "waspaloy" in name_lower:
            mat_class = "superalloy"
        elif "copper" in name_lower or "bronze" in name_lower or "brass" in name_lower:
            mat_class = "copper"
        elif "aluminum" in name_lower or "al " in name_lower:
            mat_class = "aluminum"
    
    return mat_class

def extract_value(obj, *keys):
    """Extract value from nested dict, trying multiple key paths"""
    if obj is None:
        return None
    for key in keys:
        if isinstance(obj, dict):
            val = obj.get(key)
            if val is not None:
                if isinstance(val, dict):
                    # Try to get typical/min/max
                    return val.get("typical") or val.get("min") or val.get("value")
                return val
    return None

def get_hardness(material):
    """Extract Brinell hardness from material"""
    mech = material.get("mechanical", {})
    hardness = mech.get("hardness", {})
    
    if isinstance(hardness, dict):
        return hardness.get("brinell") or hardness.get("hb") or hardness.get("HB")
    elif isinstance(hardness, (int, float)):
        return hardness
    return None

def get_tensile(material):
    """Extract tensile strength from material"""
    mech = material.get("mechanical", {})
    ts = mech.get("tensile_strength", {})
    
    if isinstance(ts, dict):
        return ts.get("typical") or ts.get("min") or ts.get("value")
    elif isinstance(ts, (int, float)):
        return ts
    return None

def get_yield(material):
    """Extract yield strength from material"""
    mech = material.get("mechanical", {})
    ys = mech.get("yield_strength", {})
    
    if isinstance(ys, dict):
        return ys.get("typical") or ys.get("min") or ys.get("value")
    elif isinstance(ys, (int, float)):
        return ys
    return None

# =============================================================================
# REFERENCE DATABASE BUILDER
# =============================================================================

def build_reference_database():
    """Build reference database from all sources for interpolation"""
    print(f"Building reference database from {len(DATA_SOURCES)} sources...")
    
    reference_db = {
        "by_name": {},      # name -> material data
        "by_iso": defaultdict(list),  # iso_group -> [materials]
        "by_class": defaultdict(list), # material_class -> [materials]
    }
    
    for source_dir in DATA_SOURCES:
        if not source_dir.exists():
            continue
            
        for iso_dir in source_dir.iterdir():
            if not iso_dir.is_dir() or iso_dir.name.startswith("_"):
                continue
                
            for json_file in iso_dir.glob("*.json"):
                if json_file.name.startswith("_") or json_file.name == "index.json":
                    continue
                    
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    materials = data.get("materials", [])
                    if not materials and "id" in data:
                        materials = [data]
                    
                    for mat in materials:
                        # Only include materials with mechanical data
                        if get_hardness(mat) or get_tensile(mat):
                            name = mat.get("name", "").lower()
                            iso = mat.get("iso_group", iso_dir.name[0])
                            mat_class = get_material_class(iso, mat.get("name"))
                            
                            if name:
                                reference_db["by_name"][name] = mat
                            reference_db["by_iso"][iso].append(mat)
                            reference_db["by_class"][mat_class].append(mat)
                            
                except Exception as e:
                    pass  # Skip problematic files
    
    total_refs = sum(len(v) for v in reference_db["by_iso"].values())
    print(f"  Built reference database with {total_refs} materials")
    return reference_db

# =============================================================================
# ENHANCEMENT STRATEGIES (run in parallel)
# =============================================================================

def strategy_cross_reference(material, reference_db):
    """Strategy 1: Find exact or similar name match in reference database"""
    name = material.get("name", "").lower()
    
    # Exact match
    if name in reference_db["by_name"]:
        ref = reference_db["by_name"][name]
        return {
            "source": "cross_reference_exact",
            "hardness": get_hardness(ref),
            "tensile": get_tensile(ref),
            "yield": get_yield(ref),
            "confidence": 0.95
        }
    
    # Partial match (e.g., "AISI 1045" matches "1045 Steel")
    for ref_name, ref in reference_db["by_name"].items():
        # Extract designation numbers
        name_nums = ''.join(c for c in name if c.isdigit())
        ref_nums = ''.join(c for c in ref_name if c.isdigit())
        
        if len(name_nums) >= 3 and name_nums in ref_nums:
            return {
                "source": "cross_reference_partial",
                "hardness": get_hardness(ref),
                "tensile": get_tensile(ref),
                "yield": get_yield(ref),
                "confidence": 0.80
            }
    
    return None

def strategy_similar_interpolation(material, reference_db):
    """Strategy 2: Interpolate from similar materials in same ISO group"""
    iso = material.get("iso_group", "P")
    target_hardness = get_hardness(material)
    target_tensile = get_tensile(material)
    
    similar_materials = reference_db["by_iso"].get(iso, [])
    if not similar_materials:
        return None
    
    # Find closest match by available property
    best_match = None
    best_diff = float('inf')
    
    for ref in similar_materials:
        ref_hardness = get_hardness(ref)
        ref_tensile = get_tensile(ref)
        
        # Skip if reference has no data
        if not ref_hardness and not ref_tensile:
            continue
        
        # Calculate difference based on what we have
        diff = float('inf')
        if target_hardness and ref_hardness:
            diff = abs(target_hardness - ref_hardness)
        elif target_tensile and ref_tensile:
            diff = abs(target_tensile - ref_tensile)
        
        if diff < best_diff:
            best_diff = diff
            best_match = ref
    
    if best_match and best_diff < 100:  # Reasonable similarity threshold
        return {
            "source": "similar_interpolation",
            "hardness": get_hardness(best_match),
            "tensile": get_tensile(best_match),
            "yield": get_yield(best_match),
            "confidence": max(0.5, 0.9 - best_diff/200)
        }
    
    return None

def strategy_physics_estimation(material):
    """Strategy 3: Estimate from physics correlations"""
    iso = material.get("iso_group", "P")
    mat_class = get_material_class(iso, material.get("name"))
    
    hardness = get_hardness(material)
    tensile = get_tensile(material)
    yield_strength = get_yield(material)
    
    result = {"source": "physics_estimation", "confidence": 0.70}
    
    # Estimate hardness from tensile
    if not hardness and tensile:
        factor = TENSILE_TO_HB_FACTOR.get(mat_class, 3.45)
        result["hardness"] = round(tensile / factor)
    
    # Estimate tensile from hardness
    if not tensile and hardness:
        factor = TENSILE_TO_HB_FACTOR.get(mat_class, 3.45)
        result["tensile"] = round(hardness * factor)
    
    # Estimate yield from tensile
    if not yield_strength and (tensile or result.get("tensile")):
        ts = tensile or result.get("tensile")
        ratio = YIELD_RATIO.get(mat_class, 0.70)
        result["yield"] = round(ts * ratio)
    
    if any(k in result for k in ["hardness", "tensile", "yield"]):
        return result
    return None

def strategy_class_defaults(material):
    """Strategy 4: Use material class defaults"""
    iso = material.get("iso_group", "P")
    mat_class = get_material_class(iso, material.get("name"))
    
    defaults = MECHANICAL_DEFAULTS.get(mat_class, MECHANICAL_DEFAULTS["default"])
    
    return {
        "source": "class_defaults",
        "hardness": defaults["hardness_hb"],
        "tensile": defaults["tensile_strength"],
        "yield": defaults["yield_strength"],
        "elongation": defaults["elongation"],
        "elastic_modulus": defaults["elastic_modulus"],
        "fatigue_strength": defaults["fatigue_strength"],
        "confidence": 0.50
    }

# =============================================================================
# PARALLEL PROCESSOR
# =============================================================================

def enhance_single_material(args):
    """Enhance a single material (called in parallel)"""
    material, reference_db = args
    
    mat_id = material.get("id", "unknown")
    changes = []
    
    # Get current values
    current_hardness = get_hardness(material)
    current_tensile = get_tensile(material)
    current_yield = get_yield(material)
    
    # Run strategies in priority order
    strategies = [
        ("cross_reference", lambda: strategy_cross_reference(material, reference_db)),
        ("similar", lambda: strategy_similar_interpolation(material, reference_db)),
        ("physics", lambda: strategy_physics_estimation(material)),
        ("defaults", lambda: strategy_class_defaults(material)),
    ]
    
    best_result = None
    for strategy_name, strategy_func in strategies:
        try:
            result = strategy_func()
            if result:
                # Check if this gives us new data
                if (not current_hardness and result.get("hardness")) or \
                   (not current_tensile and result.get("tensile")) or \
                   (not current_yield and result.get("yield")):
                    best_result = result
                    break
        except Exception as e:
            pass
    
    if not best_result:
        return material, []
    
    # Apply enhancements
    if "mechanical" not in material:
        material["mechanical"] = {}
    mech = material["mechanical"]
    
    # Hardness
    if not current_hardness and best_result.get("hardness"):
        if "hardness" not in mech or not isinstance(mech["hardness"], dict):
            mech["hardness"] = {}
        if isinstance(mech["hardness"], dict):
            mech["hardness"]["brinell"] = best_result["hardness"]
            mech["hardness"]["source"] = best_result["source"]
        changes.append(f"hardness_hb={best_result['hardness']} ({best_result['source']})")
    
    # Tensile strength
    if not current_tensile and best_result.get("tensile"):
        if "tensile_strength" not in mech or not isinstance(mech["tensile_strength"], dict):
            mech["tensile_strength"] = {}
        if isinstance(mech["tensile_strength"], dict):
            mech["tensile_strength"]["typical"] = best_result["tensile"]
            mech["tensile_strength"]["source"] = best_result["source"]
        changes.append(f"tensile={best_result['tensile']} ({best_result['source']})")
    
    # Yield strength
    if not current_yield and best_result.get("yield"):
        if "yield_strength" not in mech or not isinstance(mech["yield_strength"], dict):
            mech["yield_strength"] = {}
        if isinstance(mech["yield_strength"], dict):
            mech["yield_strength"]["typical"] = best_result["yield"]
            mech["yield_strength"]["source"] = best_result["source"]
        changes.append(f"yield={best_result['yield']} ({best_result['source']})")
    
    # Additional properties from defaults
    if best_result.get("elongation") and not mech.get("elongation"):
        mech["elongation"] = {"typical": best_result["elongation"], "source": best_result["source"]}
        changes.append(f"elongation={best_result['elongation']}")
    
    if best_result.get("elastic_modulus") and not mech.get("elastic_modulus"):
        mech["elastic_modulus"] = best_result["elastic_modulus"]
        changes.append(f"elastic_modulus={best_result['elastic_modulus']}")
    
    # Mark enhancement
    if changes:
        material["_mechanical_enhancement"] = {
            "timestamp": datetime.now().isoformat(),
            "strategy": best_result["source"],
            "confidence": best_result.get("confidence", 0.5),
            "changes": changes
        }
    
    return material, changes

def process_file_parallel(args):
    """Process a single file (called in parallel)"""
    json_file, output_dir, reference_db = args
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        if not materials:
            return {"file": str(json_file), "processed": 0, "enhanced": 0, "changes": []}
        
        enhanced_count = 0
        all_changes = []
        
        for i, material in enumerate(materials):
            enhanced_mat, changes = enhance_single_material((material, reference_db))
            materials[i] = enhanced_mat
            if changes:
                enhanced_count += 1
                all_changes.extend(changes)
        
        if enhanced_count > 0:
            data["_mechanical_enhanced"] = {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0",
                "materials_enhanced": enhanced_count
            }
            
            # Write output
            output_file = output_dir / json_file.name
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return {
            "file": json_file.name,
            "processed": len(materials),
            "enhanced": enhanced_count,
            "changes": all_changes[:10]  # Limit for memory
        }
        
    except Exception as e:
        return {"file": str(json_file), "error": str(e), "processed": 0, "enhanced": 0}

# =============================================================================
# MAIN PARALLEL PROCESSOR
# =============================================================================

def run_parallel_enhancement():
    """Run parallel mechanical enhancement on all materials"""
    
    print("=" * 80)
    print("    PRISM PARALLEL MECHANICAL ENHANCEMENT ENGINE v1.0")
    print(f"    Workers: {NUM_WORKERS} | Sources: {len(DATA_SOURCES)}")
    print("=" * 80)
    
    # Build reference database first (needed by all workers)
    reference_db = build_reference_database()
    
    # Prepare file list
    input_dir = PRISM_ROOT / "materials"
    output_dir = PRISM_ROOT / "materials_mechanical_enhanced"
    
    iso_dirs = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    file_tasks = []
    for iso_dir in iso_dirs:
        src_dir = input_dir / iso_dir
        out_dir = output_dir / iso_dir
        
        if not src_dir.exists():
            continue
        
        out_dir.mkdir(parents=True, exist_ok=True)
        
        for json_file in src_dir.glob("*.json"):
            if json_file.name.startswith("_") or json_file.name == "index.json":
                continue
            file_tasks.append((json_file, out_dir, reference_db))
    
    print(f"\nProcessing {len(file_tasks)} files with {NUM_WORKERS} workers...")
    print("-" * 40)
    
    # Process files in parallel
    stats = {
        "total_files": len(file_tasks),
        "total_processed": 0,
        "total_enhanced": 0,
        "by_strategy": defaultdict(int),
        "errors": []
    }
    
    start_time = datetime.now()
    
    # Use ThreadPoolExecutor (GIL-friendly for I/O bound tasks)
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = {executor.submit(process_file_parallel, task): task for task in file_tasks}
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            result = future.result()
            
            if "error" in result:
                stats["errors"].append(result)
            else:
                stats["total_processed"] += result["processed"]
                stats["total_enhanced"] += result["enhanced"]
                
                # Count strategies
                for change in result.get("changes", []):
                    if "cross_reference" in change:
                        stats["by_strategy"]["cross_reference"] += 1
                    elif "similar" in change:
                        stats["by_strategy"]["similar_interpolation"] += 1
                    elif "physics" in change:
                        stats["by_strategy"]["physics_estimation"] += 1
                    elif "defaults" in change:
                        stats["by_strategy"]["class_defaults"] += 1
            
            # Progress update every 10 files
            if completed % 10 == 0:
                print(f"  Progress: {completed}/{len(file_tasks)} files ({completed*100//len(file_tasks)}%)")
    
    elapsed = (datetime.now() - start_time).total_seconds()
    
    print("\n" + "=" * 80)
    print("ENHANCEMENT COMPLETE")
    print("=" * 80)
    print(f"Time: {elapsed:.1f} seconds ({elapsed/len(file_tasks):.2f}s per file)")
    print(f"Files processed: {stats['total_files']}")
    print(f"Materials processed: {stats['total_processed']}")
    print(f"Materials enhanced: {stats['total_enhanced']}")
    print(f"Enhancement rate: {stats['total_enhanced']/stats['total_processed']*100:.1f}%")
    
    print("\nBy strategy:")
    for strategy, count in sorted(stats["by_strategy"].items(), key=lambda x: -x[1]):
        print(f"  {strategy}: {count}")
    
    if stats["errors"]:
        print(f"\nErrors: {len(stats['errors'])}")
        for err in stats["errors"][:5]:
            print(f"  {err['file']}: {err.get('error', 'unknown')}")
    
    print(f"\nOutput: {output_dir}")
    
    return stats

if __name__ == "__main__":
    stats = run_parallel_enhancement()
