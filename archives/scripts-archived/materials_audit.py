"""
PRISM Materials Database Comprehensive Audit
Checks all materials for missing parameters against 127-parameter schema
"""

import json
import os
from pathlib import Path
from collections import defaultdict

# 127-parameter schema (from prism-material-schema)
REQUIRED_PARAMETERS = {
    # IDENTIFICATION (7)
    "identification": ["material_id", "name", "iso_group", "subgroup", "designation", 
                       "standards", "aliases"],
    
    # COMPOSITION (12)
    "composition": ["base_element", "carbon", "chromium", "nickel", "molybdenum",
                    "vanadium", "tungsten", "cobalt", "manganese", "silicon",
                    "other_elements", "composition_notes"],
    
    # MECHANICAL (18)
    "mechanical": ["tensile_strength", "yield_strength", "elongation", "hardness_hrc",
                   "hardness_hb", "hardness_hv", "modulus_elasticity", "shear_modulus",
                   "poisson_ratio", "fatigue_strength", "impact_strength", "fracture_toughness",
                   "ductility", "malleability", "creep_resistance", "stress_rupture",
                   "mechanical_notes", "test_conditions"],
    
    # THERMAL (14)
    "thermal": ["melting_point", "thermal_conductivity", "specific_heat", 
                "thermal_expansion", "thermal_diffusivity", "max_service_temp",
                "min_service_temp", "austenitizing_temp", "tempering_temp",
                "annealing_temp", "stress_relief_temp", "preheat_temp",
                "thermal_shock_resistance", "thermal_notes"],
    
    # MACHINABILITY (22)
    "machinability": ["machinability_rating", "machinability_index", "chip_formation",
                      "built_up_edge_tendency", "work_hardening_rate", "abrasiveness",
                      "recommended_cutting_speed", "recommended_feed", "recommended_doc",
                      "coolant_requirement", "tool_material_recommendation",
                      "surface_finish_achievable", "cutting_force_factor",
                      "specific_cutting_force_kc1", "mc_exponent", "chip_thickness_exponent",
                      "rake_angle_correction", "speed_correction_factor",
                      "feed_correction_factor", "wear_factor", "machinability_notes",
                      "difficult_features"],
    
    # TOOL_LIFE (12)
    "tool_life": ["taylor_n", "taylor_C", "taylor_conditions", "tool_wear_mechanism",
                  "crater_wear_tendency", "flank_wear_tendency", "notch_wear_tendency",
                  "bue_wear_tendency", "thermal_crack_tendency", "chipping_tendency",
                  "optimal_tool_geometry", "tool_life_notes"],
    
    # PHYSICAL (10)
    "physical": ["density", "electrical_conductivity", "electrical_resistivity",
                 "magnetic_permeability", "magnetic_properties", "reflectivity",
                 "emissivity", "surface_energy", "weldability", "physical_notes"],
    
    # JOHNSON_COOK (8)
    "johnson_cook": ["jc_A", "jc_B", "jc_n", "jc_C", "jc_m", "jc_reference_strain_rate",
                     "jc_reference_temp", "jc_melting_temp"],
    
    # SURFACE_INTEGRITY (8)
    "surface_integrity": ["residual_stress_tendency", "white_layer_tendency",
                          "subsurface_damage_tendency", "microhardness_change",
                          "grain_refinement_tendency", "surface_roughness_sensitivity",
                          "burnishing_response", "surface_integrity_notes"],
    
    # PROCESS_SPECIFIC (10)
    "process_specific": ["turning_notes", "milling_notes", "drilling_notes",
                         "grinding_notes", "threading_notes", "broaching_notes",
                         "edm_notes", "laser_notes", "waterjet_notes", "process_notes"],
    
    # QUALITY (6)
    "quality": ["data_source", "confidence_level", "last_validated", "validation_method",
                "known_issues", "quality_notes"]
}

TOTAL_PARAMS = sum(len(v) for v in REQUIRED_PARAMETERS.values())

def count_parameters(material_data, category=None):
    """Count filled parameters in a material"""
    if category:
        params = REQUIRED_PARAMETERS.get(category, [])
        section = material_data.get(category, {})
        filled = sum(1 for p in params if section.get(p) not in [None, "", [], {}])
        return filled, len(params)
    
    total_filled = 0
    for cat, params in REQUIRED_PARAMETERS.items():
        section = material_data.get(cat, {})
        total_filled += sum(1 for p in params if section.get(p) not in [None, "", [], {}])
    return total_filled, TOTAL_PARAMS

def audit_materials_directory(base_path):
    """Audit all materials in the database"""
    results = {
        "total_materials": 0,
        "by_iso_group": defaultdict(lambda: {"count": 0, "avg_coverage": 0, "materials": []}),
        "by_category": defaultdict(lambda: {"filled": 0, "total": 0}),
        "critical_missing": [],  # Materials with <50% coverage
        "incomplete_machinability": [],  # Missing kc1, taylor, etc.
        "incomplete_johnson_cook": [],  # Missing J-C parameters
        "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0},
        "detailed_audit": []
    }
    
    # Process each ISO group directory
    iso_dirs = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    for iso_dir in iso_dirs:
        dir_path = Path(base_path) / iso_dir
        if not dir_path.exists():
            continue
            
        # Find all JSON files
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_"):  # Skip index files
                continue
                
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Handle both single material and array formats
                materials = data if isinstance(data, list) else [data]
                
                for material in materials:
                    results["total_materials"] += 1
                    
                    # Get identification
                    ident = material.get("identification", {})
                    mat_id = ident.get("material_id", json_file.stem)
                    mat_name = ident.get("name", "Unknown")
                    iso_group = ident.get("iso_group", iso_dir[0])
                    
                    # Count parameters
                    filled, total = count_parameters(material)
                    coverage = filled / total if total > 0 else 0
                    
                    # Grade assignment
                    if coverage >= 0.90:
                        grade = "A"
                    elif coverage >= 0.75:
                        grade = "B"
                    elif coverage >= 0.60:
                        grade = "C"
                    elif coverage >= 0.40:
                        grade = "D"
                    else:
                        grade = "F"
                    
                    results["grade_distribution"][grade] += 1
                    
                    # Category breakdown
                    category_scores = {}
                    for cat in REQUIRED_PARAMETERS.keys():
                        cat_filled, cat_total = count_parameters(material, cat)
                        results["by_category"][cat]["filled"] += cat_filled
                        results["by_category"][cat]["total"] += cat_total
                        category_scores[cat] = cat_filled / cat_total if cat_total > 0 else 0
                    
                    # ISO group tracking
                    results["by_iso_group"][iso_group]["count"] += 1
                    results["by_iso_group"][iso_group]["materials"].append({
                        "id": mat_id,
                        "name": mat_name,
                        "coverage": coverage,
                        "grade": grade
                    })
                    
                    # Critical missing check
                    if coverage < 0.50:
                        results["critical_missing"].append({
                            "id": mat_id,
                            "name": mat_name,
                            "coverage": coverage,
                            "file": str(json_file)
                        })
                    
                    # Machinability check (critical for cutting calculations)
                    mach = material.get("machinability", {})
                    critical_mach = ["specific_cutting_force_kc1", "mc_exponent", 
                                     "machinability_rating", "recommended_cutting_speed"]
                    missing_mach = [p for p in critical_mach if not mach.get(p)]
                    if missing_mach:
                        results["incomplete_machinability"].append({
                            "id": mat_id,
                            "name": mat_name,
                            "missing": missing_mach
                        })
                    
                    # Johnson-Cook check (critical for FEA/simulation)
                    jc = material.get("johnson_cook", {})
                    critical_jc = ["jc_A", "jc_B", "jc_n", "jc_C", "jc_m"]
                    missing_jc = [p for p in critical_jc if not jc.get(p)]
                    if missing_jc:
                        results["incomplete_johnson_cook"].append({
                            "id": mat_id,
                            "name": mat_name,
                            "missing": missing_jc
                        })
                    
                    # Detailed audit entry
                    results["detailed_audit"].append({
                        "id": mat_id,
                        "name": mat_name,
                        "iso_group": iso_group,
                        "file": str(json_file),
                        "coverage": coverage,
                        "grade": grade,
                        "filled": filled,
                        "total": total,
                        "category_scores": category_scores
                    })
                    
            except Exception as e:
                print(f"Error processing {json_file}: {e}")
    
    # Calculate averages for ISO groups
    for iso, data in results["by_iso_group"].items():
        if data["materials"]:
            avg = sum(m["coverage"] for m in data["materials"]) / len(data["materials"])
            data["avg_coverage"] = avg
    
    return results

def print_report(results):
    """Print comprehensive audit report"""
    print("=" * 80)
    print("           PRISM MATERIALS DATABASE COMPREHENSIVE AUDIT")
    print("=" * 80)
    print(f"\nTotal Materials Audited: {results['total_materials']}")
    print(f"Schema Parameters: {TOTAL_PARAMS}")
    
    print("\n" + "-" * 40)
    print("GRADE DISTRIBUTION")
    print("-" * 40)
    for grade, count in sorted(results["grade_distribution"].items()):
        pct = count / results["total_materials"] * 100 if results["total_materials"] > 0 else 0
        bar = "#" * int(pct / 2)
        print(f"  Grade {grade}: {count:4d} ({pct:5.1f}%) {bar}")
    
    print("\n" + "-" * 40)
    print("BY ISO GROUP")
    print("-" * 40)
    for iso, data in sorted(results["by_iso_group"].items()):
        print(f"  {iso}: {data['count']:4d} materials, {data['avg_coverage']*100:5.1f}% avg coverage")
    
    print("\n" + "-" * 40)
    print("BY CATEGORY (% filled)")
    print("-" * 40)
    for cat, data in results["by_category"].items():
        pct = data["filled"] / data["total"] * 100 if data["total"] > 0 else 0
        bar = "#" * int(pct / 2)
        print(f"  {cat:20s}: {pct:5.1f}% {bar}")
    
    print("\n" + "-" * 40)
    print(f"CRITICAL ISSUES")
    print("-" * 40)
    print(f"  Materials with <50% coverage: {len(results['critical_missing'])}")
    print(f"  Missing critical machinability: {len(results['incomplete_machinability'])}")
    print(f"  Missing Johnson-Cook params: {len(results['incomplete_johnson_cook'])}")
    
    if results["critical_missing"][:10]:
        print("\n  Worst 10 materials:")
        for m in sorted(results["critical_missing"], key=lambda x: x["coverage"])[:10]:
            print(f"    - {m['id']}: {m['coverage']*100:.1f}% ({m['name'][:30]})")
    
    print("\n" + "=" * 80)

def save_results(results, output_path):
    """Save detailed results to JSON"""
    # Convert defaultdicts for JSON serialization
    output = {
        "audit_timestamp": str(Path(__file__).stat().st_mtime),
        "total_materials": results["total_materials"],
        "schema_parameters": TOTAL_PARAMS,
        "grade_distribution": dict(results["grade_distribution"]),
        "by_iso_group": {k: {"count": v["count"], "avg_coverage": v["avg_coverage"]} 
                         for k, v in results["by_iso_group"].items()},
        "by_category": {k: {"filled": v["filled"], "total": v["total"], 
                           "percent": v["filled"]/v["total"]*100 if v["total"] > 0 else 0}
                        for k, v in results["by_category"].items()},
        "critical_missing_count": len(results["critical_missing"]),
        "incomplete_machinability_count": len(results["incomplete_machinability"]),
        "incomplete_johnson_cook_count": len(results["incomplete_johnson_cook"]),
        "critical_missing": results["critical_missing"],
        "incomplete_machinability": results["incomplete_machinability"][:50],
        "incomplete_johnson_cook": results["incomplete_johnson_cook"][:50],
        "detailed_audit": results["detailed_audit"]
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    print(f"\nDetailed results saved to: {output_path}")

if __name__ == "__main__":
    BASE_PATH = r"C:\PRISM\data\materials"
    OUTPUT_PATH = r"C:\PRISM\audits\MATERIALS_AUDIT_RESULTS.json"
    
    # Ensure output directory exists
    Path(OUTPUT_PATH).parent.mkdir(parents=True, exist_ok=True)
    
    print("Running comprehensive materials audit...")
    results = audit_materials_directory(BASE_PATH)
    print_report(results)
    save_results(results, OUTPUT_PATH)
