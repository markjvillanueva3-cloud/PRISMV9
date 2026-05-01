"""
PRISM FULL 127-PARAMETER AUDIT
Check coverage and uniqueness of ALL parameters
"""

import json
from pathlib import Path
from collections import defaultdict

BASE_PATH = Path(r"C:\PRISM\data\materials")

# The full 127-parameter schema
FULL_SCHEMA = {
    "identification": ["name", "iso_group", "material_number", "uns_number", "din_number", "jis_number", "common_names", "category", "subcategory"],
    "physical": ["density", "melting_point", "boiling_point", "specific_heat", "thermal_conductivity", "thermal_expansion", "electrical_resistivity", "magnetic_permeability", "poisson_ratio", "elastic_modulus", "shear_modulus", "bulk_modulus"],
    "mechanical": ["hardness.brinell", "hardness.vickers", "hardness.rockwell_c", "hardness.rockwell_b", "tensile_strength.typical", "tensile_strength.min", "tensile_strength.max", "yield_strength.typical", "yield_strength.min", "yield_strength.max", "elongation", "reduction_of_area", "impact_strength", "fatigue_strength", "fracture_toughness", "compressive_strength"],
    "kienzle": ["kc1_1", "mc", "kc1_1_milling", "mc_milling", "kc1_1_drilling", "mc_drilling"],
    "johnson_cook": ["A", "B", "n", "C", "m", "T_melt", "T_ref", "epsilon_dot_ref"],
    "taylor": ["C", "n", "C_carbide", "n_carbide", "C_ceramic", "n_ceramic", "C_cbn", "n_cbn"],
    "chip_formation": ["chip_type", "chip_breaking", "shear_angle", "chip_compression_ratio", "built_up_edge_tendency", "segmentation_frequency"],
    "tribology": ["friction_coefficient", "friction_coefficient_dry", "friction_coefficient_flood", "friction_coefficient_mql", "wear_coefficient", "adhesion_tendency", "abrasiveness", "galling_tendency"],
    "thermal_machining": ["thermal_diffusivity", "heat_partition_coefficient", "critical_temperature", "recrystallization_temperature", "phase_transformation_temperature", "maximum_cutting_temperature"],
    "surface_integrity": ["residual_stress_tendency", "work_hardening_depth", "white_layer_risk", "surface_roughness_achievable", "burr_formation_tendency", "microstructure_sensitivity"],
    "machinability": ["aisi_rating", "relative_to_1212", "machinability_index", "power_constant", "unit_power"],
    "cutting_recommendations": {
        "turning": ["speed_roughing", "speed_finishing", "feed_roughing", "feed_finishing", "doc_roughing", "doc_finishing"],
        "milling": ["speed_roughing", "speed_finishing", "feed_per_tooth_roughing", "feed_per_tooth_finishing", "doc_roughing", "doc_finishing", "woc_roughing", "woc_finishing"],
        "drilling": ["speed", "feed_per_rev", "peck_depth_ratio"],
        "tool_material": ["recommended_grade", "coating_recommendation", "geometry_recommendation"],
        "coolant": ["type", "pressure", "flow_rate"]
    },
    "process_specific": ["grinding_ratio", "edm_machinability", "laser_absorptivity", "weldability_rating"]
}

def count_params(schema, prefix=""):
    """Count total parameters in schema"""
    count = 0
    for key, value in schema.items():
        if isinstance(value, list):
            count += len(value)
        elif isinstance(value, dict):
            count += count_params(value, f"{prefix}{key}.")
    return count

def get_nested(obj, path):
    """Get nested value from object"""
    parts = path.split(".")
    current = obj
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
        if current is None:
            return None
    return current

def flatten_material(mat):
    """Extract all 127 parameters from a material"""
    params = {}
    
    # Identification
    for p in ["name", "iso_group", "material_number", "uns_number", "din_number", "jis_number", "category", "subcategory"]:
        params[f"id.{p}"] = mat.get(p)
    params["id.common_names"] = mat.get("common_names", [])
    
    # Physical
    phys = mat.get("physical", {})
    for p in ["density", "melting_point", "boiling_point", "specific_heat", "thermal_conductivity", 
              "thermal_expansion", "electrical_resistivity", "magnetic_permeability", 
              "poisson_ratio", "elastic_modulus", "shear_modulus", "bulk_modulus"]:
        params[f"phys.{p}"] = phys.get(p)
    
    # Mechanical
    mech = mat.get("mechanical", {})
    hardness = mech.get("hardness", {})
    if isinstance(hardness, dict):
        params["mech.hardness.brinell"] = hardness.get("brinell")
        params["mech.hardness.vickers"] = hardness.get("vickers")
        params["mech.hardness.rockwell_c"] = hardness.get("rockwell_c")
        params["mech.hardness.rockwell_b"] = hardness.get("rockwell_b")
    else:
        params["mech.hardness.brinell"] = hardness
    
    tensile = mech.get("tensile_strength", {})
    if isinstance(tensile, dict):
        params["mech.tensile.typical"] = tensile.get("typical")
        params["mech.tensile.min"] = tensile.get("min")
        params["mech.tensile.max"] = tensile.get("max")
    else:
        params["mech.tensile.typical"] = tensile
    
    yield_s = mech.get("yield_strength", {})
    if isinstance(yield_s, dict):
        params["mech.yield.typical"] = yield_s.get("typical")
        params["mech.yield.min"] = yield_s.get("min")
        params["mech.yield.max"] = yield_s.get("max")
    else:
        params["mech.yield.typical"] = yield_s
    
    for p in ["elongation", "reduction_of_area", "impact_strength", "fatigue_strength", 
              "fracture_toughness", "compressive_strength"]:
        params[f"mech.{p}"] = mech.get(p)
    
    # Kienzle
    kienzle = mat.get("kienzle", {})
    for p in ["kc1_1", "mc", "kc1_1_milling", "mc_milling", "kc1_1_drilling", "mc_drilling"]:
        params[f"kienzle.{p}"] = kienzle.get(p)
    
    # Johnson-Cook
    jc = mat.get("johnson_cook", {})
    for p in ["A", "B", "n", "C", "m", "T_melt", "T_ref", "epsilon_dot_ref"]:
        params[f"jc.{p}"] = jc.get(p)
    
    # Taylor
    taylor = mat.get("taylor", {})
    for p in ["C", "n", "C_carbide", "n_carbide", "C_ceramic", "n_ceramic", "C_cbn", "n_cbn"]:
        params[f"taylor.{p}"] = taylor.get(p)
    
    # Chip formation
    chip = mat.get("chip_formation", {})
    for p in ["chip_type", "chip_breaking", "shear_angle", "chip_compression_ratio", 
              "built_up_edge_tendency", "segmentation_frequency"]:
        params[f"chip.{p}"] = chip.get(p)
    
    # Tribology
    trib = mat.get("tribology", {})
    for p in ["friction_coefficient", "friction_coefficient_dry", "friction_coefficient_flood",
              "friction_coefficient_mql", "wear_coefficient", "adhesion_tendency", 
              "abrasiveness", "galling_tendency"]:
        params[f"trib.{p}"] = trib.get(p)
    
    # Thermal machining
    therm = mat.get("thermal_machining", {})
    for p in ["thermal_diffusivity", "heat_partition_coefficient", "critical_temperature",
              "recrystallization_temperature", "phase_transformation_temperature", 
              "maximum_cutting_temperature"]:
        params[f"therm.{p}"] = therm.get(p)
    
    # Surface integrity
    surf = mat.get("surface_integrity", {})
    for p in ["residual_stress_tendency", "work_hardening_depth", "white_layer_risk",
              "surface_roughness_achievable", "burr_formation_tendency", "microstructure_sensitivity"]:
        params[f"surf.{p}"] = surf.get(p)
    
    # Machinability
    mach = mat.get("machinability", {})
    for p in ["aisi_rating", "relative_to_1212", "machinability_index", "power_constant", "unit_power"]:
        params[f"mach.{p}"] = mach.get(p)
    
    # Cutting recommendations
    cut = mat.get("cutting_recommendations", {})
    turning = cut.get("turning", {})
    for p in ["speed_roughing", "speed_finishing", "feed_roughing", "feed_finishing", 
              "doc_roughing", "doc_finishing"]:
        params[f"cut.turn.{p}"] = turning.get(p)
    
    milling = cut.get("milling", {})
    for p in ["speed_roughing", "speed_finishing", "feed_per_tooth_roughing", 
              "feed_per_tooth_finishing", "doc_roughing", "doc_finishing",
              "woc_roughing", "woc_finishing"]:
        params[f"cut.mill.{p}"] = milling.get(p)
    
    drilling = cut.get("drilling", {})
    for p in ["speed", "feed_per_rev", "peck_depth_ratio"]:
        params[f"cut.drill.{p}"] = drilling.get(p)
    
    tool = cut.get("tool_material", {})
    for p in ["recommended_grade", "coating_recommendation", "geometry_recommendation"]:
        params[f"cut.tool.{p}"] = tool.get(p)
    
    coolant = cut.get("coolant", {})
    for p in ["type", "pressure", "flow_rate"]:
        params[f"cut.cool.{p}"] = coolant.get(p)
    
    # Process specific
    proc = mat.get("process_specific", {})
    for p in ["grinding_ratio", "edm_machinability", "laser_absorptivity", "weldability_rating"]:
        params[f"proc.{p}"] = proc.get(p)
    
    return params

def main():
    print("=" * 100)
    print("PRISM FULL 127-PARAMETER AUDIT")
    print("=" * 100)
    
    # Collect all materials
    all_materials = []
    
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS",
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if not dir_path.exists():
            continue
        
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_") or json_file.name == "index.json":
                continue
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for mat in data.get("materials", []):
                    if isinstance(mat, dict):
                        flat = flatten_material(mat)
                        flat["_source"] = f"{iso_dir}/{json_file.name}"
                        flat["_name"] = mat.get("name", "?")
                        all_materials.append(flat)
            except:
                pass
    
    print(f"\nTotal materials: {len(all_materials)}")
    
    # Count parameter coverage
    param_counts = defaultdict(int)
    param_values = defaultdict(set)
    
    for mat in all_materials:
        for key, val in mat.items():
            if key.startswith("_"):
                continue
            if val is not None and val != "" and val != [] and val != {}:
                param_counts[key] += 1
                if isinstance(val, (int, float, str, bool)):
                    param_values[key].add(val)
    
    # Report coverage
    print("\n" + "=" * 100)
    print("PARAMETER COVERAGE (of 127 target parameters)")
    print("=" * 100)
    
    categories = {
        "id": "Identification",
        "phys": "Physical Properties",
        "mech": "Mechanical Properties",
        "kienzle": "Kienzle Parameters",
        "jc": "Johnson-Cook Parameters",
        "taylor": "Taylor Tool Life",
        "chip": "Chip Formation",
        "trib": "Tribology",
        "therm": "Thermal Machining",
        "surf": "Surface Integrity",
        "mach": "Machinability",
        "cut": "Cutting Recommendations",
        "proc": "Process Specific"
    }
    
    total_params = 0
    populated_params = 0
    unique_params = 0
    
    for cat_prefix, cat_name in categories.items():
        cat_params = [(k, v) for k, v in param_counts.items() if k.startswith(cat_prefix + ".")]
        if not cat_params:
            continue
        
        print(f"\n{cat_name}:")
        print("-" * 80)
        
        for param, count in sorted(cat_params):
            total_params += 1
            pct = count / len(all_materials) * 100
            unique = len(param_values.get(param, set()))
            
            if count > 0:
                populated_params += 1
            if unique == len(all_materials) and count == len(all_materials):
                unique_params += 1
                status = "[100% UNIQUE]"
            elif count == len(all_materials):
                status = f"[{unique} unique values]"
            elif count > 0:
                status = f"[{pct:.0f}% coverage, {unique} unique]"
            else:
                status = "[MISSING]"
            
            print(f"  {param:45} {count:5}/{len(all_materials)} ({pct:5.1f}%) {status}")
    
    # Summary
    print("\n" + "=" * 100)
    print("SUMMARY")
    print("=" * 100)
    print(f"Total parameters tracked: {total_params}")
    print(f"Parameters with any data: {populated_params} ({populated_params/total_params*100:.1f}%)")
    print(f"Parameters 100% unique: {unique_params}")
    print(f"Materials: {len(all_materials)}")
    
    # Find parameters that need work
    print("\n" + "=" * 100)
    print("PARAMETERS NEEDING WORK (present but not 100% unique)")
    print("=" * 100)
    
    needs_work = []
    for param, count in param_counts.items():
        if count > 0 and count == len(all_materials):
            unique = len(param_values.get(param, set()))
            if unique < len(all_materials):
                needs_work.append((param, unique, count))
    
    for param, unique, count in sorted(needs_work, key=lambda x: x[1]):
        print(f"  {param:45} {unique:5} unique / {count} total ({unique/count*100:.1f}%)")
    
    # Missing parameters
    print("\n" + "=" * 100)
    print("MISSING PARAMETERS (0% coverage)")
    print("=" * 100)
    
    missing = [p for p, c in param_counts.items() if c == 0]
    for p in sorted(missing):
        print(f"  {p}")

if __name__ == "__main__":
    main()
