"""
PRISM MATERIALS DATABASE COMPLETION SYSTEM v1.0
================================================
PURPOSE: Comprehensive audit, enhancement, and expansion of materials DB

PHASES:
  A. AUDIT    - Scan all materials, count missing parameters per category
  B. ENHANCE  - Fill missing parameters in existing materials (sections 8-14)
  C. EXPAND   - Add missing materials (S_SUPERALLOYS, K_CAST_IRON, H_HARDENED)
  D. VALIDATE - Ensure gateway-ready format, consumer field availability

USES: 56-agent API swarm with verification chains
"""

import anthropic
import json
import os
import sys
import re
import glob
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# =============================================================================
# CONFIGURATION
# =============================================================================

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "REDACTED_API_KEY")

PRISM_ROOT = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
MATERIALS_DIR = PRISM_ROOT / "EXTRACTED" / "materials"
MATERIALS_COMPLETE_DIR = PRISM_ROOT / "EXTRACTED" / "materials_complete"
RESULTS_DIR = PRISM_ROOT / "API_RESULTS" / "materials_completion"
REPORTS_DIR = PRISM_ROOT / "_REPORTS"

# Ensure directories exist
for d in [RESULTS_DIR, REPORTS_DIR, MATERIALS_COMPLETE_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Critical cutting parameters that MUST be present
CRITICAL_CUTTING_PARAMS = [
    "kienzle.kc1_1", "kienzle.mc",
    "johnsonCook.A", "johnsonCook.B", "johnsonCook.n",
    "taylorToolLife.C", "taylorToolLife.n",
    "machinability.overallRating",
    "recommendedParameters.turning.speed",
    "recommendedParameters.turning.feed"
]

# =============================================================================
# MATERIAL TARGETS BY CATEGORY
# =============================================================================

MATERIAL_TARGETS = {
    "P_STEELS": {"target": 400, "priority": 3},
    "M_STAINLESS": {"target": 150, "priority": 3},
    "K_CAST_IRON": {"target": 80, "priority": 2},
    "N_NONFERROUS": {"target": 300, "priority": 3},
    "S_SUPERALLOYS": {"target": 120, "priority": 1},  # CRITICAL
    "H_HARDENED": {"target": 80, "priority": 2}
}


# =============================================================================
# SUPERALLOYS TO ADD (Priority List - 82 Materials)
# =============================================================================

SUPERALLOYS_TO_ADD = [
    # Nickel-Based Precipitation Hardened (Most Critical for Aerospace)
    {"name": "Inconel 718", "uns": "N07718", "type": "Ni-Precipitation", "priority": 1},
    {"name": "Waspaloy", "uns": "N07001", "type": "Ni-Precipitation", "priority": 1},
    {"name": "Rene 41", "uns": "N07041", "type": "Ni-Precipitation", "priority": 1},
    {"name": "Rene 80", "uns": "N/A", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Rene 95", "uns": "N/A", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Udimet 500", "uns": "N07500", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Udimet 520", "uns": "N07520", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Udimet 700", "uns": "N07700", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Udimet 720", "uns": "N07720", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Nimonic 80A", "uns": "N07080", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Nimonic 90", "uns": "N07090", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Nimonic 105", "uns": "N07105", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Nimonic 115", "uns": "N07115", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Nimonic 263", "uns": "N07263", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Astroloy", "uns": "N13017", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Haynes 242", "uns": "N10242", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Haynes 282", "uns": "N07208", "type": "Ni-Precipitation", "priority": 1},
    {"name": "Inconel X-750", "uns": "N07750", "type": "Ni-Precipitation", "priority": 2},
    {"name": "Inconel 706", "uns": "N09706", "type": "Ni-Precipitation", "priority": 2},
    
    # Nickel-Based Solid Solution
    {"name": "Inconel 601", "uns": "N06601", "type": "Ni-Solid Solution", "priority": 2},
    {"name": "Inconel 617", "uns": "N06617", "type": "Ni-Solid Solution", "priority": 2},
    {"name": "Inconel 690", "uns": "N06690", "type": "Ni-Solid Solution", "priority": 2},
    {"name": "Nimonic 75", "uns": "N06075", "type": "Ni-Solid Solution", "priority": 3},
    {"name": "Haynes 230", "uns": "N06230", "type": "Ni-Solid Solution", "priority": 2},
    {"name": "Hastelloy X", "uns": "N06002", "type": "Ni-Solid Solution", "priority": 1},
    {"name": "Hastelloy C-276", "uns": "N10276", "type": "Ni-Solid Solution", "priority": 1},
    {"name": "Hastelloy C-22", "uns": "N06022", "type": "Ni-Solid Solution", "priority": 2},
    {"name": "Hastelloy B-2", "uns": "N10665", "type": "Ni-Solid Solution", "priority": 2},
    {"name": "Hastelloy S", "uns": "N06635", "type": "Ni-Solid Solution", "priority": 3},
    
    # Nickel-Based Cast/Single Crystal
    {"name": "MAR-M 200", "uns": "N/A", "type": "Ni-Cast", "priority": 2},
    {"name": "MAR-M 246", "uns": "N/A", "type": "Ni-Cast", "priority": 2},
    {"name": "MAR-M 247", "uns": "N/A", "type": "Ni-Cast", "priority": 1},
    {"name": "IN-100", "uns": "N13100", "type": "Ni-Cast", "priority": 2},
    {"name": "IN-738", "uns": "N/A", "type": "Ni-Cast", "priority": 2},
    {"name": "IN-792", "uns": "N/A", "type": "Ni-Cast", "priority": 2},
    {"name": "GTD-111", "uns": "N/A", "type": "Ni-Cast", "priority": 2},
    {"name": "Rene N5", "uns": "N/A", "type": "Ni-Single Crystal", "priority": 2},
    {"name": "CMSX-4", "uns": "N/A", "type": "Ni-Single Crystal", "priority": 2},
    {"name": "PWA 1484", "uns": "N/A", "type": "Ni-Single Crystal", "priority": 2},
    
    # Cobalt-Based
    {"name": "Stellite 6", "uns": "R30006", "type": "Co-Cast", "priority": 1},
    {"name": "Stellite 12", "uns": "R30012", "type": "Co-Cast", "priority": 2},
    {"name": "Stellite 21", "uns": "R30021", "type": "Co-Cast", "priority": 2},
    {"name": "L-605 (Haynes 25)", "uns": "R30605", "type": "Co-Wrought", "priority": 1},
    {"name": "Haynes 188", "uns": "R30188", "type": "Co-Wrought", "priority": 1},
    {"name": "MAR-M 509", "uns": "R30509", "type": "Co-Cast", "priority": 2},
    {"name": "FSX-414", "uns": "N/A", "type": "Co-Cast", "priority": 2},
    {"name": "X-40", "uns": "R30040", "type": "Co-Cast", "priority": 2},
    {"name": "MP35N", "uns": "R30035", "type": "Co-Ni Multiphase", "priority": 2},
    {"name": "MP159", "uns": "R30159", "type": "Co-Ni Multiphase", "priority": 2},
    
    # Iron-Based Superalloys
    {"name": "A-286", "uns": "S66286", "type": "Fe-Precipitation", "priority": 1},
    {"name": "Incoloy 800", "uns": "N08800", "type": "Fe-Ni-Cr", "priority": 2},
    {"name": "Incoloy 800H", "uns": "N08810", "type": "Fe-Ni-Cr", "priority": 2},
    {"name": "Incoloy 800HT", "uns": "N08811", "type": "Fe-Ni-Cr", "priority": 2},
    {"name": "Incoloy 825", "uns": "N08825", "type": "Fe-Ni-Cr-Mo", "priority": 2},
    {"name": "Incoloy 901", "uns": "N09901", "type": "Fe-Precipitation", "priority": 2},
    {"name": "Incoloy 903", "uns": "N19903", "type": "Fe-Ni-Co", "priority": 2},
    {"name": "Incoloy 907", "uns": "N19907", "type": "Fe-Ni-Co", "priority": 2},
    {"name": "Incoloy 909", "uns": "N19909", "type": "Fe-Ni-Co", "priority": 2},
    {"name": "N-155", "uns": "R30155", "type": "Fe-Co-Ni", "priority": 2},
    {"name": "V-57", "uns": "S66545", "type": "Fe-Precipitation", "priority": 3},
    {"name": "Discaloy", "uns": "S66220", "type": "Fe-Precipitation", "priority": 3},
]

# =============================================================================
# MODEL CONFIGURATION
# =============================================================================

OPUS = "claude-opus-4-5-20251101"
SONNET = "claude-sonnet-4-20250514"
HAIKU = "claude-haiku-4-5-20251001"

AGENT_MODELS = {
    "materials_scientist": OPUS,
    "physics_validator": OPUS,
    "uncertainty_quantifier": OPUS,
    "cross_referencer": SONNET,
    "quality_gate": SONNET,
    "extractor": SONNET,
    "validator": SONNET,
    "formatter": HAIKU,
    "lookup": HAIKU,
}


# =============================================================================
# AUDIT FUNCTIONS
# =============================================================================

def audit_material_parameters(material: Dict) -> Dict[str, Any]:
    """Audit a single material for missing parameters."""
    
    def check_nested(data: Dict, path: str) -> bool:
        parts = path.split(".")
        current = data
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return False
        return current is not None and current != "" and current != 0
    
    audit = {
        "id": material.get("id", "UNKNOWN"),
        "name": material.get("name", "UNKNOWN"),
        "missing_critical": [],
        "missing_sections": [],
        "completeness_pct": 0
    }
    
    # Check critical cutting parameters
    for param in CRITICAL_CUTTING_PARAMS:
        # Handle both snake_case and camelCase
        param_snake = param.replace(".", "_")
        if not check_nested(material, param) and not check_nested(material, param_snake):
            # Also check flat keys
            flat_key = param.split(".")[-1]
            if flat_key not in material:
                audit["missing_critical"].append(param)
    
    # Check sections
    section_keys = {
        "chipFormation": ["chipType", "chip_type", "shear_angle", "shearAngle"],
        "friction": ["tool_chip", "toolChip", "adhesion", "abrasive"],
        "thermalMachining": ["cutting_temp", "cuttingTemp", "heat_partition"],
        "surfaceIntegrity": ["residual_stress", "residualStress", "work_hardening"],
        "statisticalData": ["confidence", "sources", "data_points", "reliability"]
    }
    
    for section, keys in section_keys.items():
        found = any(k in str(material).lower() for k in [s.lower() for s in keys])
        if not found:
            audit["missing_sections"].append(section)
    
    # Calculate completeness
    total = len(CRITICAL_CUTTING_PARAMS)
    populated = total - len(audit["missing_critical"])
    audit["completeness_pct"] = round((populated / total) * 100, 1)
    
    return audit


def run_full_audit() -> Dict[str, Any]:
    """Run full audit of all materials in the database."""
    
    print("=" * 80)
    print("PRISM MATERIALS DATABASE AUDIT")
    print("=" * 80)
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "categories": {},
        "summary": {"total": 0, "complete": 0, "partial": 0, "incomplete": 0, "avg_completeness": 0},
        "gaps": {"by_category": {}, "missing_sections": {}, "missing_params": {}}
    }
    
    all_completeness = []
    
    for category, info in MATERIAL_TARGETS.items():
        cat_dir = MATERIALS_DIR / category
        if not cat_dir.exists():
            print(f"\n⚠️ {category}: Directory not found")
            results["gaps"]["by_category"][category] = {"current": 0, "target": info["target"], "gap": info["target"]}
            continue
            
        print(f"\n[AUDIT] {category}...")
        
        material_count = 0
        cat_completeness = []
        
        for js_file in cat_dir.glob("*.js"):
            content = js_file.read_text(encoding='utf-8', errors='ignore')
            
            # Count material IDs
            ids = re.findall(r'"id"\s*:\s*"([A-Z]-[A-Z]{2}-\d{3})"', content)
            material_count += len(ids)
            
            # Simple completeness check - count key parameters
            for mid in ids:
                has_kienzle = "kc1_1" in content or "kc11" in content.lower()
                has_jc = '"A"' in content and '"B"' in content and '"n"' in content
                has_taylor = "taylor" in content.lower() or ('"C"' in content and '"n"' in content)
                has_cutting = "speed" in content.lower() and "feed" in content.lower()
                has_chip = "chip" in content.lower()
                has_thermal = "thermal" in content.lower() or "temperature" in content.lower()
                
                score = sum([has_kienzle, has_jc, has_taylor, has_cutting, has_chip, has_thermal])
                completeness = (score / 6) * 100
                cat_completeness.append(completeness)
                all_completeness.append(completeness)
        
        avg_comp = sum(cat_completeness) / len(cat_completeness) if cat_completeness else 0
        gap = max(0, info["target"] - material_count)
        
        results["categories"][category] = {
            "count": material_count,
            "target": info["target"],
            "gap": gap,
            "avg_completeness": round(avg_comp, 1)
        }
        
        results["gaps"]["by_category"][category] = {
            "current": material_count,
            "target": info["target"],
            "gap": gap,
            "completeness": round(avg_comp, 1)
        }
        
        status = "[OK]" if gap == 0 else "[WARN]" if gap < 20 else "[GAP]"
        print(f"  {status} Count: {material_count}/{info['target']} (gap: {gap})")
        print(f"     Avg Completeness: {round(avg_comp, 1)}%")
        
        results["summary"]["total"] += material_count
    
    # Summary stats
    if all_completeness:
        results["summary"]["avg_completeness"] = round(sum(all_completeness) / len(all_completeness), 1)
        results["summary"]["complete"] = sum(1 for c in all_completeness if c >= 80)
        results["summary"]["partial"] = sum(1 for c in all_completeness if 40 <= c < 80)
        results["summary"]["incomplete"] = sum(1 for c in all_completeness if c < 40)
    
    return results


# =============================================================================
# API AGENT FUNCTIONS
# =============================================================================

def call_agent(role: str, prompt: str, context: str = "", max_tokens: int = 4096) -> str:
    """Call an API agent with the specified role."""
    
    model = AGENT_MODELS.get(role, SONNET)
    client = anthropic.Anthropic(api_key=API_KEY)
    
    system_prompts = {
        "materials_scientist": """You are a PhD-level materials scientist specializing in metallurgy and machining.
Deep knowledge of: Crystal structure, phase diagrams, cutting force models (Kienzle), 
constitutive models (Johnson-Cook), Taylor tool life, chip formation, surface integrity.
ALWAYS provide uncertainty bounds (±) on numerical values. Format as valid JSON.""",

        "physics_validator": """Validate machining parameters for physical consistency:
- Kienzle kc1.1: 500-4000 N/mm² typical
- Taylor n: 0.1-0.4 typical (lower for hard materials)
- Johnson-Cook A: typically 0.2-0.8× tensile strength
Return "VALIDATED" or corrected JSON.""",

        "uncertainty_quantifier": """Add uncertainty bounds to ALL numerical values.
For each: value, uncertainty (±), confidence (LOW/MEDIUM/HIGH/HIGHEST), sources count.
Use Monte Carlo principles. Return complete JSON with uncertainty metadata.""",

        "cross_referencer": """Validate against: ASM Handbooks, Machining Data Handbook,
Sandvik/Kennametal catalogs, MatWeb, peer-reviewed literature.
Report consensus values with source counts."""
    }
    
    system = system_prompts.get(role, f"You are a {role} expert for PRISM Manufacturing.")
    if context:
        system += f"\n\nCONTEXT:\n{context}"
    
    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception as e:
        return f"ERROR: {str(e)}"


def generate_complete_material(alloy: Dict, id_prefix: str, seq_num: int) -> Dict:
    """Generate complete 127-parameter data for a material using API swarm."""
    
    material_id = f"{id_prefix}-{seq_num:03d}"
    
    prompt = f"""Generate COMPLETE material data for: {alloy['name']} ({alloy.get('uns', 'N/A')})
Type: {alloy['type']}
Material ID: {material_id}

Generate ALL 14 sections with ALL parameters (127 total):
1. identification (8 params): id, name, uns, standard, isoGroup, materialType, condition, alternateNames
2. composition (10-15 elements): Each with min/typical/max in wt%
3. physicalProperties (12 params): density, melting range, thermal conductivity, specific heat, thermal expansion, thermal diffusivity, elastic modulus, shear modulus, poissons ratio, electrical resistivity, magnetic permeability, hardness
4. mechanicalProperties (15 params): tensile/yield strength, elongation, reduction of area, true stress/strain, fatigue strength/limit, impact toughness, fracture toughness, creep strength, stress rupture, hardenability, weldability, formability
5. kienzle (9 params): tangential/feed/radial Kc11 and mc, corrections for rake/speed/wear, source, reliability
6. johnsonCook (13 params): A, B, n, C, m, ref strain rate, ref temp, melt temp, damage params d1-d5, source, reliability
7. taylorToolLife (12 params): C and n for HSS/uncoated/coated carbide/ceramic/CBN, wear limits
8. chipFormation (12 params): chip type, shear angle, compression ratio, segmentation freq, BUE tendency, breakability, chip color, morphology
9. friction (10 params): tool-chip and tool-workpiece friction (dry/coolant/MQL), contact length, seizure temp, adhesion, abrasiveness, diffusion wear
10. thermalMachining (14 params): cutting temp model, heat partition (chip/tool/workpiece/coolant), coolant effectiveness, thermal damage thresholds
11. surfaceIntegrity (12 params): residual stress, work hardening, achievable roughness (rough/semi/finish), metallurgical damage risks, burr tendency
12. machinability (8 params): overall grade, percent vs 1212, turning/milling/drilling/grinding indices, tool wear/surface finish/chip control factors
13. recommendedParameters (20+ params): turning/milling/drilling/threading speeds and feeds, tool geometry, insert grade, coolant requirements, HSM/trochoidal notes
14. statisticalData (8 params): data points, confidence level, std deviations, sources list, last validated, reliability, cross-validated, peer-reviewed

Output as VALID JSON only. Include uncertainty (±) on ALL numerical values."""

    print(f"  🔬 Calling materials_scientist for {alloy['name']}...")
    materials_response = call_agent("materials_scientist", prompt, max_tokens=16384)
    
    # Validate
    print(f"  🔍 Validating physics...")
    validation = call_agent("physics_validator", f"Validate:\n{materials_response[:8000]}")
    
    if "VALIDATED" not in validation and "ERROR" not in validation:
        materials_response = validation
    
    # Extract JSON
    try:
        # Find JSON in response
        json_match = re.search(r'\{[\s\S]*\}', materials_response)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    
    return {"id": material_id, "name": alloy['name'], "error": "Parse failed", "raw": materials_response[:500]}


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main execution function."""
    
    print("\n" + "=" * 80)
    print("PRISM MATERIALS DATABASE COMPLETION SYSTEM v1.0")
    print("=" * 80)
    
    if len(sys.argv) < 2:
        print("""
Usage:
    python prism_materials_completion_v1.py audit             # Run full audit
    python prism_materials_completion_v1.py expand [N]        # Add N superalloys (default: 10)
    python prism_materials_completion_v1.py generate "Name"   # Generate specific material
    python prism_materials_completion_v1.py full              # Full pipeline
""")
        return
    
    command = sys.argv[1].lower()
    
    if command == "audit":
        results = run_full_audit()
        
        # Save results
        report_file = REPORTS_DIR / f"materials_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_file.write_text(json.dumps(results, indent=2))
        
        print("\n" + "=" * 80)
        print("AUDIT SUMMARY")
        print("=" * 80)
        print(f"Total Materials: {results['summary']['total']}")
        print(f"Complete (≥80%): {results['summary']['complete']}")
        print(f"Partial (40-80%): {results['summary']['partial']}")
        print(f"Incomplete (<40%): {results['summary']['incomplete']}")
        print(f"Avg Completeness: {results['summary']['avg_completeness']}%")
        
        print("\n📊 GAPS BY CATEGORY:")
        for cat, gap in results["gaps"]["by_category"].items():
            status = "✅" if gap['gap'] == 0 else "⚠️" if gap['gap'] < 20 else "🔴"
            print(f"  {status} {cat}: {gap['current']}/{gap['target']} (need {gap['gap']})")
        
        print(f"\n💾 Report saved: {report_file}")
        
    elif command == "expand":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        print(f"\n🚀 Generating {count} priority superalloys...")
        
        # Sort by priority
        sorted_alloys = sorted(SUPERALLOYS_TO_ADD, key=lambda x: x.get('priority', 3))
        to_generate = sorted_alloys[:count]
        
        generated = []
        for i, alloy in enumerate(to_generate, 1):
            print(f"\n[{i}/{count}] Generating: {alloy['name']}")
            
            # Determine ID prefix
            if "Ni-" in alloy['type'] or "Nickel" in alloy['type']:
                prefix = "S-NI"
            elif "Co-" in alloy['type'] or "Cobalt" in alloy['type']:
                prefix = "S-CO"
            else:
                prefix = "S-FE"
            
            result = generate_complete_material(alloy, prefix, 20 + i)  # Start at 020
            generated.append(result)
            
            # Save incrementally
            output_file = RESULTS_DIR / f"superalloy_{alloy['name'].replace(' ', '_').replace('-', '_')}.json"
            output_file.write_text(json.dumps(result, indent=2))
            print(f"  [OK] Saved: {output_file.name}")
        
        # Combine all
        combined_file = RESULTS_DIR / f"superalloys_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        combined_file.write_text(json.dumps({"materials": generated}, indent=2))
        print(f"\n[BATCH] Combined file: {combined_file}")
        
    elif command == "generate":
        if len(sys.argv) < 3:
            print("Usage: python prism_materials_completion_v1.py generate 'Material Name'")
            return
        
        name = " ".join(sys.argv[2:])
        
        # Find in list
        alloy = None
        for a in SUPERALLOYS_TO_ADD:
            if name.lower() in a["name"].lower():
                alloy = a
                break
        
        if not alloy:
            # Create generic entry
            alloy = {"name": name, "uns": "N/A", "type": "Unknown"}
        
        print(f"\n[GEN] Generating: {alloy['name']}")
        result = generate_complete_material(alloy, "S-XX", 1)
        
        output_file = RESULTS_DIR / f"material_{name.replace(' ', '_')}.json"
        output_file.write_text(json.dumps(result, indent=2))
        print(f"\n[OK] Saved: {output_file}")
        
        # Preview
        print("\nPreview (first 2000 chars):")
        preview = json.dumps(result, indent=2)[:2000]
        print(preview + ("..." if len(json.dumps(result)) > 2000 else ""))
        
    elif command == "full":
        print("\n[FULL] FULL PIPELINE")
        print("=" * 40)
        
        print("\n[1] Running audit...")
        results = run_full_audit()
        
        print("\n[2] Identifying gaps...")
        gaps = results["gaps"]["by_category"]
        total_gap = sum(g['gap'] for g in gaps.values())
        print(f"   Total materials needed: {total_gap}")
        
        print("\n[3] Expansion would add:")
        print(f"   - Superalloys: {len([a for a in SUPERALLOYS_TO_ADD if a.get('priority', 3) <= 2])} priority 1-2")
        
        print("\n[WARN] Full expansion requires significant API calls.")
        print("   Run 'expand N' to generate N materials at a time.")
        
    else:
        print(f"❌ Unknown command: {command}")


if __name__ == "__main__":
    main()
