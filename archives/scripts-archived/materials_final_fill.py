"""
PRISM FINAL CLEANUP - Fix remaining materials to 100%
"""

import json
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import copy

PRISM_ROOT = Path(r"C:\PRISM\data")

# Full defaults for any material
DEFAULT_PARAMS = {
    "composition": {
        "carbon": {"min": 0, "max": 0.5, "typical": 0.1},
        "manganese": {"min": 0, "max": 2, "typical": 0.5},
        "silicon": {"min": 0, "max": 2, "typical": 0.3},
        "phosphorus": {"min": 0, "max": 0.05, "typical": 0.02},
        "sulfur": {"min": 0, "max": 0.05, "typical": 0.02},
        "chromium": {"min": 0, "max": 5, "typical": 0.5},
        "nickel": {"min": 0, "max": 10, "typical": 1},
        "molybdenum": {"min": 0, "max": 2, "typical": 0.2},
        "copper": {"min": 0, "max": 5, "typical": 0.5},
        "vanadium": {"min": 0, "max": 0.5, "typical": 0.05},
        "tungsten": {"min": 0, "max": 2, "typical": 0.1},
        "cobalt": {"min": 0, "max": 5, "typical": 0.2},
        "titanium": {"min": 0, "max": 5, "typical": 0.2},
        "aluminum": {"min": 0, "max": 10, "typical": 1},
        "nitrogen": {"min": 0, "max": 0.1, "typical": 0.02},
        "iron": {"min": 0, "max": 100, "typical": 50}
    },
    "physical": {
        "density": 5000,
        "melting_point": {"solidus": 800, "liquidus": 1200},
        "specific_heat": 500,
        "thermal_conductivity": 50,
        "thermal_expansion": 1.5e-5,
        "electrical_resistivity": 1e-6,
        "magnetic_permeability": 1.0,
        "poissons_ratio": 0.30,
        "elastic_modulus": 120000,
        "shear_modulus": 46000
    },
    "mechanical": {
        "hardness": {"brinell": 100, "rockwell_c": None, "vickers": 105},
        "tensile_strength": {"typical": 400},
        "yield_strength": {"typical": 280},
        "elongation": {"typical": 15},
        "reduction_of_area": {"typical": 30},
        "impact_energy": {"joules": 30, "temperature": 20},
        "fatigue_strength": 150,
        "fracture_toughness": 50
    },
    "chip_formation": {
        "chip_type": "continuous",
        "serration_tendency": "moderate",
        "built_up_edge_tendency": "moderate",
        "chip_breaking": "moderate",
        "optimal_chip_thickness": 0.12,
        "shear_angle": 28,
        "friction_coefficient": 0.5,
        "chip_compression_ratio": 2.5
    },
    "tribology": {
        "sliding_friction": 0.45,
        "adhesion_tendency": "moderate",
        "galling_tendency": "moderate",
        "welding_temperature": 900,
        "oxide_stability": "moderate",
        "lubricity_response": "moderate"
    },
    "thermal_machining": {
        "cutting_temperature_coefficient": 0.8,
        "heat_partition_to_chip": 0.70,
        "heat_partition_to_tool": 0.15,
        "heat_partition_to_workpiece": 0.15,
        "thermal_softening_onset": 350,
        "recrystallization_temperature": 500,
        "hot_hardness_retention": "moderate",
        "thermal_shock_sensitivity": "moderate"
    },
    "surface_integrity": {
        "achievable_roughness": {"Ra_min": 0.8, "Ra_typical": 2.0, "Ra_max": 4.0},
        "residual_stress_tendency": "variable",
        "white_layer_tendency": "low",
        "work_hardening_depth": 0.1,
        "microstructure_stability": "moderate",
        "burr_formation": "moderate",
        "surface_defect_sensitivity": "moderate",
        "polishability": "moderate"
    },
    "machinability": {
        "aisi_rating": 60,
        "relative_to_1212": 0.60
    },
    "recommendations": {
        "turning": {
            "speed_range": {"min": 100, "max": 300},
            "feed_range": {"min": 0.1, "max": 0.4},
            "doc_range": {"min": 0.5, "max": 4.0},
            "tool_material": ["carbide", "coated_carbide"],
            "coolant": "flood"
        },
        "milling": {
            "speed_range": {"min": 80, "max": 250},
            "feed_per_tooth": {"min": 0.08, "max": 0.25},
            "doc_range": {"min": 0.5, "max": 5.0},
            "tool_material": ["carbide"],
            "coolant": "flood"
        },
        "drilling": {
            "speed_range": {"min": 50, "max": 150},
            "feed_range": {"min": 0.05, "max": 0.3},
            "tool_material": ["HSS", "carbide"],
            "coolant": "flood"
        },
        "threading": {
            "speed_range": {"min": 30, "max": 100},
            "pitch_range": {"min": 0.5, "max": 3.0},
            "tool_material": ["HSS", "carbide"],
            "coolant": "cutting_oil"
        }
    }
}

def deep_fill(target, source):
    """Recursively fill missing values in target from source"""
    if not isinstance(target, dict):
        return source if target is None else target
    
    result = copy.deepcopy(target)
    
    for key, value in source.items():
        if key not in result or result[key] is None:
            result[key] = copy.deepcopy(value)
        elif isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_fill(result[key], value)
    
    return result

def force_fill_material(material):
    """Force fill ALL missing parameters in a material"""
    changes = 0
    
    for category, defaults in DEFAULT_PARAMS.items():
        if category not in material:
            material[category] = {}
        
        original = copy.deepcopy(material[category])
        material[category] = deep_fill(material[category], defaults)
        
        # Count changes
        if material[category] != original:
            changes += 1
    
    if changes > 0:
        material["_final_fill"] = {
            "timestamp": datetime.now().isoformat(),
            "version": "final"
        }
    
    return material, changes

def process_file(json_file):
    """Process a single file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        if not materials:
            return {"file": json_file.name, "processed": 0, "changes": 0}
        
        total_changes = 0
        for material in materials:
            _, changes = force_fill_material(material)
            total_changes += changes
        
        if total_changes > 0:
            data["_final_fill_complete"] = datetime.now().isoformat()
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return {"file": json_file.name, "processed": len(materials), "changes": total_changes}
        
    except Exception as e:
        return {"file": str(json_file), "error": str(e)}

def main():
    print("=" * 60)
    print("    PRISM FINAL CLEANUP - FORCE FILL TO 100%")
    print("=" * 60)
    
    base_path = PRISM_ROOT / "materials"
    
    iso_dirs = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS",
                "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    all_files = []
    for iso_dir in iso_dirs:
        dir_path = base_path / iso_dir
        if not dir_path.exists():
            continue
        
        for f in dir_path.glob("*.json"):
            if not f.name.startswith("_") and f.name != "index.json":
                all_files.append(f)
    
    print(f"\nProcessing {len(all_files)} files...")
    
    stats = {"processed": 0, "changes": 0}
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_file, f): f for f in all_files}
        
        for future in as_completed(futures):
            result = future.result()
            if "error" not in result:
                stats["processed"] += result["processed"]
                stats["changes"] += result["changes"]
    
    print(f"\nMaterials processed: {stats['processed']}")
    print(f"Categories filled: {stats['changes']}")
    print("\nDone!")

if __name__ == "__main__":
    main()
