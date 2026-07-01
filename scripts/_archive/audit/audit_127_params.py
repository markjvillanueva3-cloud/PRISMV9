#!/usr/bin/env python3
"""
PRISM Manufacturing Intelligence v9.0
127-Parameter Completeness Audit Script

This script audits ALL material files across ALL ISO groups to ensure
every material has all 127 required parameters.

Parameter Categories (127 total):
1. Identity (8): id, name, standard, category, subcategory, isoGroup, unifiedClass, aliases
2. Composition (12): Various composition fields
3. Physical (15): density, meltingPoint, thermalConductivity, etc.
4. Mechanical (20): tensileStrength, yieldStrength, elongation, etc.
5. Kienzle (8): Kc1_1, mc, Kf1_1, mf, Kr1_1, mr, chipBreakability, builtUpEdgeTendency
6. Johnson-Cook (8): A, B, n, C, m, meltingTemp, referenceStrainRate, referenceTemp
7. Taylor (9): carbide, ceramic, cbn, diamond coefficients
8. Machinability (12): index, rating, chipType, etc.
9. Surface (10): achievableRa, recommendedRa, burnishability, etc.
10. Coolant (8): compatibility, recommendedType, mqlSuitable, etc.
11. Cutting (12): speedRange, feedRange, depthOfCut, etc.
12. Applications (5): primaryUse, industries, typicalParts, competingMaterials, notes

Usage: python audit_127_params.py [--fix] [--verbose]
"""

import os
import re
import json
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# PRISM root paths
PRISM_ROOT = Path(r"C:\PRISM")
MATERIALS_ROOT = PRISM_ROOT / "data" / "materials"
STATE_ROOT = PRISM_ROOT / "state"

# ISO Groups
ISO_GROUPS = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]

# ═══════════════════════════════════════════════════════════════════════════════
# 127 REQUIRED PARAMETERS - COMPLETE SCHEMA
# ═══════════════════════════════════════════════════════════════════════════════

REQUIRED_PARAMS = {
    "identity": [
        "id", "name", "standard", "category", "subcategory", 
        "isoGroup", "unifiedClass", "aliases"
    ],  # 8 params
    
    "composition": [
        "carbon", "chromium", "nickel", "molybdenum", "vanadium",
        "tungsten", "cobalt", "manganese", "silicon", "phosphorus",
        "sulfur", "other"
    ],  # 12 params (metals) - varies by material type
    
    "physical": [
        "density", "meltingPoint", "thermalConductivity", "specificHeat",
        "thermalExpansion", "electricalResistivity", "magneticPermeability",
        "elasticModulus", "shearModulus", "bulkModulus", "poissonsRatio",
        "opticalProperties", "surfaceEnergy", "moistureAbsorption", "outgassing"
    ],  # 15 params
    
    "mechanical": [
        "tensileStrength", "yieldStrength", "elongation", "reductionOfArea",
        "hardness", "impactEnergy", "fractureToughness", "fatigueStrength",
        "creepResistance", "wearResistance", "compressiveStrength",
        "shearStrength", "flexuralStrength", "flexuralModulus",
        "notchSensitivity", "stressCorrosionCracking", "hydrogenEmbrittlement",
        "temperEmbrittlement", "workHardening", "residualStress"
    ],  # 20 params
    
    "kienzle": [
        "Kc1_1", "mc", "Kf1_1", "mf", "Kr1_1", "mr",
        "chipBreakability", "builtUpEdgeTendency"
    ],  # 8 params
    
    "johnsonCook": [
        "A", "B", "n", "C", "m", "meltingTemp",
        "referenceStrainRate", "referenceTemp"
    ],  # 8 params
    
    "taylor": [
        "carbide_C", "carbide_n", "ceramic_C", "ceramic_n",
        "cbn_C", "cbn_n", "diamond_C", "diamond_n", "vRef"
    ],  # 9 params
    
    "machinability": [
        "index", "rating", "chipType", "cuttingForceLevel",
        "heatGeneration", "toolWearRate", "surfaceIntegrity",
        "burFormation", "workHardening", "springback",
        "chatterTendency", "specialConsiderations"
    ],  # 12 params
    
    "surface": [
        "achievableRa", "recommendedRa", "burnishability",
        "workHardeningDepth", "residualStressTendency", "microcrackRisk",
        "delaminationRisk", "thermalDamageRisk", "polishability", "coatingAdhesion"
    ],  # 10 params
    
    "coolant": [
        "compatibility", "recommendedType", "concentration",
        "pressure", "mqlSuitable", "cryogenicSuitable",
        "highPressureSuitable", "notes"
    ],  # 8 params
    
    "cutting": [
        "speedRange_roughing", "speedRange_finishing",
        "feedRange_roughing", "feedRange_finishing",
        "docRange_roughing", "docRange_finishing",
        "rampAngle", "helixAngle", "entryStrategy",
        "exitStrategy", "peckingRequired", "specialTooling"
    ],  # 12 params
    
    "applications": [
        "primaryUse", "industries", "typicalParts",
        "competingMaterials", "notes"
    ]  # 5 params
}

TOTAL_PARAMS = sum(len(v) for v in REQUIRED_PARAMS.values())  # Should be 127

# ═══════════════════════════════════════════════════════════════════════════════
# PARAMETER EXTRACTION PATTERNS
# ═══════════════════════════════════════════════════════════════════════════════

def extract_materials_from_file(filepath):
    """Extract materials and their parameters from a JS file."""
    materials = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return materials
    
    # Find material entries - looking for patterns like { id: "...", name: "...",
    # This regex captures material objects
    material_pattern = r'\{\s*(?://[^\n]*\n\s*)?id:\s*["\']([^"\']+)["\']'
    
    material_ids = re.findall(material_pattern, content)
    
    for mat_id in material_ids:
        material_info = {
            "id": mat_id,
            "file": str(filepath),
            "params_found": defaultdict(list),
            "params_missing": defaultdict(list),
            "coverage": {}
        }
        
        # Find the material block
        mat_pattern = rf'id:\s*["\']{ re.escape(mat_id)}["\'].*?(?=\{{\s*(?://[^\n]*\n\s*)?id:|$)'
        mat_match = re.search(mat_pattern, content, re.DOTALL)
        
        if mat_match:
            mat_block = mat_match.group(0)
            
            # Check each parameter category
            for category, params in REQUIRED_PARAMS.items():
                for param in params:
                    # Search for the parameter in various patterns
                    patterns = [
                        rf'{param}\s*:',
                        rf'"{param}"\s*:',
                        rf"'{param}'\s*:",
                        rf'{param}_',
                        rf'_{param}'
                    ]
                    
                    found = any(re.search(p, mat_block, re.IGNORECASE) for p in patterns)
                    
                    if found:
                        material_info["params_found"][category].append(param)
                    else:
                        material_info["params_missing"][category].append(param)
                
                # Calculate coverage for this category
                found_count = len(material_info["params_found"][category])
                total_count = len(params)
                material_info["coverage"][category] = (found_count / total_count) * 100 if total_count > 0 else 100
        
        materials.append(material_info)
    
    return materials

def audit_all_materials():
    """Audit all materials across all ISO groups."""
    results = {
        "timestamp": datetime.now().isoformat(),
        "totalMaterials": 0,
        "totalFiles": 0,
        "parameterSchema": {
            "totalRequired": TOTAL_PARAMS,
            "categories": {k: len(v) for k, v in REQUIRED_PARAMS.items()}
        },
        "byISOGroup": {},
        "byCategory": defaultdict(lambda: {"complete": 0, "partial": 0, "missing": []}),
        "materialsWithGaps": [],
        "summary": {}
    }
    
    for iso_group in ISO_GROUPS:
        group_path = MATERIALS_ROOT / iso_group
        group_results = {
            "materials": 0,
            "files": 0,
            "completeParams": 0,
            "partialParams": 0,
            "missingParams": [],
            "materialDetails": []
        }
        
        if not group_path.exists():
            print(f"[SKIP] {iso_group}: Directory not found")
            results["byISOGroup"][iso_group] = group_results
            continue
        
        js_files = list(group_path.glob("*.js"))
        group_results["files"] = len(js_files)
        
        for js_file in js_files:
            materials = extract_materials_from_file(js_file)
            group_results["materials"] += len(materials)
            
            for mat in materials:
                # Calculate overall completeness
                total_found = sum(len(v) for v in mat["params_found"].values())
                total_missing = sum(len(v) for v in mat["params_missing"].values())
                overall_coverage = (total_found / TOTAL_PARAMS) * 100 if TOTAL_PARAMS > 0 else 100
                
                mat_summary = {
                    "id": mat["id"],
                    "file": os.path.basename(mat["file"]),
                    "overallCoverage": round(overall_coverage, 1),
                    "totalFound": total_found,
                    "totalMissing": total_missing,
                    "categoryCoverage": mat["coverage"],
                    "missingByCategory": dict(mat["params_missing"])
                }
                
                group_results["materialDetails"].append(mat_summary)
                
                # Track materials with gaps
                if total_missing > 0:
                    results["materialsWithGaps"].append({
                        "id": mat["id"],
                        "isoGroup": iso_group,
                        "file": os.path.basename(mat["file"]),
                        "missingCount": total_missing,
                        "coverage": round(overall_coverage, 1),
                        "missingParams": dict(mat["params_missing"])
                    })
                
                # Track by category
                for category, params in mat["params_missing"].items():
                    if params:
                        results["byCategory"][category]["partial"] += 1
                        results["byCategory"][category]["missing"].extend(
                            [f"{mat['id']}.{p}" for p in params]
                        )
                    else:
                        results["byCategory"][category]["complete"] += 1
        
        results["byISOGroup"][iso_group] = group_results
        results["totalMaterials"] += group_results["materials"]
        results["totalFiles"] += group_results["files"]
        
        print(f"[AUDIT] {iso_group}: {group_results['materials']} materials, {group_results['files']} files")
    
    # Generate summary
    complete_count = results["totalMaterials"] - len(results["materialsWithGaps"])
    results["summary"] = {
        "totalMaterials": results["totalMaterials"],
        "completelyPopulated": complete_count,
        "withGaps": len(results["materialsWithGaps"]),
        "completenessRate": round((complete_count / results["totalMaterials"]) * 100, 1) if results["totalMaterials"] > 0 else 100,
        "mostCommonMissingParams": get_most_common_missing(results["materialsWithGaps"])
    }
    
    return results

def get_most_common_missing(materials_with_gaps):
    """Find most commonly missing parameters."""
    missing_count = defaultdict(int)
    
    for mat in materials_with_gaps:
        for category, params in mat.get("missingParams", {}).items():
            for param in params:
                missing_count[f"{category}.{param}"] += 1
    
    # Sort by count
    sorted_missing = sorted(missing_count.items(), key=lambda x: x[1], reverse=True)
    return sorted_missing[:20]  # Top 20

def print_audit_report(results):
    """Print formatted audit report."""
    print("\n" + "═" * 80)
    print("    PRISM v9.0 - 127-PARAMETER COMPLETENESS AUDIT REPORT")
    print("═" * 80)
    
    print(f"\nTimestamp: {results['timestamp']}")
    print(f"Required Parameters: {results['parameterSchema']['totalRequired']}")
    
    print("\n┌─────────────────┬───────────┬───────────┬───────────────┐")
    print("│   ISO Group     │ Materials │   Files   │   Coverage    │")
    print("├─────────────────┼───────────┼───────────┼───────────────┤")
    
    for iso_group, data in results["byISOGroup"].items():
        mat_count = data["materials"]
        file_count = data["files"]
        
        # Calculate average coverage for this group
        if data["materialDetails"]:
            avg_coverage = sum(m["overallCoverage"] for m in data["materialDetails"]) / len(data["materialDetails"])
        else:
            avg_coverage = 0
        
        status = "✅" if avg_coverage >= 95 else "⚠️" if avg_coverage >= 70 else "❌"
        
        print(f"│ {iso_group:<15} │ {mat_count:>9} │ {file_count:>9} │ {avg_coverage:>6.1f}% {status:<5} │")
    
    print("└─────────────────┴───────────┴───────────┴───────────────┘")
    
    # Summary
    print(f"\n📊 SUMMARY:")
    print(f"   Total Materials: {results['summary']['totalMaterials']}")
    print(f"   Completely Populated (127/127): {results['summary']['completelyPopulated']}")
    print(f"   Materials With Gaps: {results['summary']['withGaps']}")
    print(f"   Overall Completeness Rate: {results['summary']['completenessRate']}%")
    
    # Most common missing parameters
    if results['summary']['mostCommonMissingParams']:
        print(f"\n📋 MOST COMMONLY MISSING PARAMETERS:")
        for param, count in results['summary']['mostCommonMissingParams'][:10]:
            print(f"   • {param}: {count} materials")
    
    # Category breakdown
    print(f"\n📁 PARAMETER CATEGORIES ({TOTAL_PARAMS} total):")
    for category, count in results['parameterSchema']['categories'].items():
        print(f"   {category}: {count} params")
    
    print("\n" + "═" * 80)

def save_audit_results(results, filepath):
    """Save audit results to JSON file."""
    # Simplify materialsWithGaps for JSON serialization
    simplified = results.copy()
    simplified["byCategory"] = dict(results["byCategory"])
    
    # Convert defaultdicts to regular dicts
    for key in simplified["byCategory"]:
        if isinstance(simplified["byCategory"][key], defaultdict):
            simplified["byCategory"][key] = dict(simplified["byCategory"][key])
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(simplified, f, indent=2, default=str)
    
    print(f"\n💾 Results saved to: {filepath}")

def main():
    print("🔍 PRISM v9.0 - 127-Parameter Completeness Audit")
    print("=" * 60)
    
    # Verify parameter count
    print(f"\n📐 Parameter Schema Verification:")
    print(f"   Expected: 127 parameters")
    print(f"   Defined:  {TOTAL_PARAMS} parameters")
    
    if TOTAL_PARAMS != 127:
        print(f"   ⚠️ WARNING: Parameter count mismatch!")
    else:
        print(f"   ✅ Parameter count verified")
    
    # Run audit
    print("\n🔄 Scanning all material files...")
    results = audit_all_materials()
    
    # Print report
    print_audit_report(results)
    
    # Save results
    output_path = STATE_ROOT / "audit_127_params_report.json"
    save_audit_results(results, output_path)
    
    # Return exit code based on completeness
    if results['summary']['completenessRate'] >= 95:
        print("\n✅ AUDIT PASSED: >95% parameter completeness")
        return 0
    elif results['summary']['completenessRate'] >= 70:
        print("\n⚠️ AUDIT WARNING: 70-95% parameter completeness")
        return 1
    else:
        print("\n❌ AUDIT FAILED: <70% parameter completeness")
        return 2

if __name__ == "__main__":
    sys.exit(main())
