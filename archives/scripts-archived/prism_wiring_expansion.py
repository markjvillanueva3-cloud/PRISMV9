#!/usr/bin/env python3
"""
PRISM COMPREHENSIVE WIRING EXPANSION
====================================
Achieve 100% utilization by mapping ALL resources
"""

import json
from datetime import datetime
from collections import defaultdict

# ═══════════════════════════════════════════════════════════════════════════════
# EXPANDED SKILL CATEGORY MAPPINGS (29 skill categories -> engine categories)
# ═══════════════════════════════════════════════════════════════════════════════

SKILL_CATEGORY_TO_ENGINES = {
    # Manufacturing Core (12 categories)
    "machining_operations": ["PHYSICS", "CAM", "PROCESS_INTEL"],
    "cutting_processes": ["PHYSICS", "CAM"],
    "material_science": ["PHYSICS", "PROCESS_INTEL", "AI_ML"],
    "tooling": ["PHYSICS", "CAM", "PROCESS_INTEL"],
    "workholding": ["CAM", "PHYSICS"],
    "metrology": ["QUALITY", "DIGITAL_TWIN"],
    "surface_engineering": ["PHYSICS", "QUALITY"],
    "thermal_management": ["PHYSICS", "DIGITAL_TWIN"],
    "tribology": ["PHYSICS", "PROCESS_INTEL"],
    "chip_formation": ["PHYSICS", "CAM"],
    "process_planning": ["PROCESS_INTEL", "CAM", "BUSINESS"],
    "manufacturing_systems": ["INTEGRATION", "BUSINESS", "PROCESS_INTEL"],
    
    # CNC/Controller (8 categories)
    "cnc_programming": ["CAM", "INTEGRATION"],
    "controller_specific": ["CAM", "INTEGRATION"],
    "gcode": ["CAM"],
    "post_processing": ["CAM", "INTEGRATION"],
    "simulation": ["DIGITAL_TWIN", "CAM"],
    "verification": ["QUALITY", "CAM"],
    "collision_detection": ["CAM", "DIGITAL_TWIN"],
    "toolpath": ["CAM"],
    
    # AI/ML (6 categories)
    "machine_learning": ["AI_ML"],
    "deep_learning": ["AI_ML"],
    "optimization": ["AI_ML", "PROCESS_INTEL"],
    "prediction": ["AI_ML", "DIGITAL_TWIN"],
    "classification": ["AI_ML", "QUALITY"],
    "reinforcement_learning": ["AI_ML"],
    
    # Quality (4 categories)
    "spc": ["QUALITY"],
    "inspection": ["QUALITY", "DIGITAL_TWIN"],
    "tolerance": ["QUALITY", "CAD"],
    "dimensional": ["QUALITY", "METROLOGY"],
    
    # CAD/Design (4 categories)
    "cad_modeling": ["CAD"],
    "feature_recognition": ["CAD", "CAM"],
    "geometry": ["CAD", "CAM"],
    "dfm": ["CAD", "PROCESS_INTEL"],
    
    # Business (4 categories)
    "costing": ["BUSINESS"],
    "scheduling": ["BUSINESS", "PROCESS_INTEL"],
    "quoting": ["BUSINESS"],
    "sustainability": ["BUSINESS", "PROCESS_INTEL"],
    
    # Digital Twin/Integration (4 categories)
    "digital_twin": ["DIGITAL_TWIN", "AI_ML"],
    "monitoring": ["DIGITAL_TWIN", "QUALITY"],
    "api": ["INTEGRATION"],
    "data_pipeline": ["INTEGRATION", "AI_ML"],
    
    # PRISM Specific (5 categories)
    "prism_core": ["PRISM_UNIQUE", "INTEGRATION"],
    "cognitive": ["AI_ML", "PRISM_UNIQUE"],
    "knowledge": ["KNOWLEDGE", "PRISM_UNIQUE"],
    "safety": ["PRISM_UNIQUE", "QUALITY"],
    "orchestration": ["INTEGRATION", "PRISM_UNIQUE"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# FORMULA TO SPECIFIC ENGINE MAPPINGS (granular)
# ═══════════════════════════════════════════════════════════════════════════════

FORMULA_TO_SPECIFIC_ENGINES = {
    # Cutting formulas -> Specific physics engines
    "F-CUT-001": ["E-PHYS-KIENZLE", "E-PHYS-CUTTING-FORCE", "E-CAM-FEEDS"],
    "F-CUT-002": ["E-PHYS-KIENZLE", "E-PHYS-FEED-FORCE"],
    "F-CUT-003": ["E-PHYS-KIENZLE", "E-PHYS-PASSIVE-FORCE"],
    "F-THERM-001": ["E-PHYS-THERMAL", "E-DT-TEMPERATURE"],
    "F-WEAR-001": ["E-PHYS-TAYLOR", "E-PHYS-TOOL-LIFE"],
    "F-VIB-001": ["E-PHYS-CHATTER", "E-PHYS-STABILITY"],
    "F-SURF-001": ["E-PHYS-SURFACE", "E-QUAL-ROUGHNESS"],
    "F-MAT-001": ["E-PHYS-JOHNSON-COOK", "E-PHYS-CONSTITUTIVE"],
    "F-OPT-001": ["E-AI-PSO", "E-AI-GA", "E-AI-OPTIMIZER"],
    "F-ML-001": ["E-AI-NEURAL", "E-AI-TRAINER"],
    "F-QUAL-001": ["E-QUAL-SPC", "E-QUAL-CAPABILITY"],
    "F-ECON-001": ["E-BUS-COST", "E-BUS-QUOTE"],
    "F-PRM-001": ["E-PRISM-OMEGA", "E-PRISM-QUALITY"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# ALL PRODUCTS AND THEIR ENGINE/SKILL REQUIREMENTS
# ═══════════════════════════════════════════════════════════════════════════════

PRODUCT_REQUIREMENTS = {
    "SPEED_FEED_CALCULATOR": {
        "engine_categories": ["PHYSICS", "AI_ML", "PROCESS_INTEL", "QUALITY"],
        "formula_categories": ["CUTTING", "POWER", "THERMAL", "WEAR", "SURFACE", 
                              "MATERIAL", "OPTIMIZATION", "AI_ML"],
        "skill_categories": ["machining_operations", "material_science", "tooling",
                            "optimization", "prediction", "prism_core", "safety"],
        "min_engines": 50,
        "min_formulas": 100,
        "min_skills": 30,
    },
    "POST_PROCESSOR": {
        "engine_categories": ["CAM", "INTEGRATION"],
        "formula_categories": ["MACHINE", "GEOMETRIC", "PROCESS"],
        "skill_categories": ["cnc_programming", "controller_specific", "gcode",
                            "post_processing", "simulation", "verification"],
        "min_engines": 40,
        "min_formulas": 50,
        "min_skills": 25,
    },
    "SHOP_MANAGER": {
        "engine_categories": ["BUSINESS", "PROCESS_INTEL", "QUALITY"],
        "formula_categories": ["ECONOMICS", "SCHEDULING", "QUALITY", "SUSTAINABILITY"],
        "skill_categories": ["costing", "scheduling", "quoting", "process_planning",
                            "spc", "manufacturing_systems"],
        "min_engines": 30,
        "min_formulas": 60,
        "min_skills": 20,
    },
    "AUTO_CNC_PROGRAMMER": {
        "engine_categories": ["CAM", "CAD", "AI_ML", "DIGITAL_TWIN", "PHYSICS"],
        "formula_categories": ["GEOMETRIC", "CUTTING", "TOOLPATH", "OPTIMIZATION",
                              "COLLISION", "AI_ML"],
        "skill_categories": ["toolpath", "feature_recognition", "collision_detection",
                            "machine_learning", "simulation", "cnc_programming",
                            "cognitive", "orchestration"],
        "min_engines": 60,
        "min_formulas": 80,
        "min_skills": 35,
    },
}

def load_registries():
    with open(r"C:\PRISM\registries\FORMULA_REGISTRY.json", 'r') as f:
        formulas = json.load(f)
    with open(r"C:\PRISM\registries\ENGINE_REGISTRY.json", 'r') as f:
        engines = json.load(f)
    with open(r"C:\PRISM\registries\WIRING_REGISTRY.json", 'r') as f:
        wiring = json.load(f)
    return formulas, engines, wiring

def expand_formula_engine_wiring(formulas, engines):
    """Create granular formula->engine connections"""
    formula_to_engines = defaultdict(set)
    engine_to_formulas = defaultdict(set)
    
    # Index engines by category
    engines_by_cat = defaultdict(list)
    for e in engines.get("engines", []):
        cat = e.get("category", "UNKNOWN")
        engines_by_cat[cat].append(e["id"])
    
    # Category-based wiring (all formulas in category -> all engines in target cats)
    CATEGORY_MAP = {
        "CUTTING": ["PHYSICS", "CAM"],
        "POWER": ["PHYSICS", "PROCESS_INTEL"],
        "THERMAL": ["PHYSICS", "DIGITAL_TWIN"],
        "WEAR": ["PHYSICS", "PROCESS_INTEL"],
        "VIBRATION": ["PHYSICS", "CAM", "DIGITAL_TWIN"],
        "SURFACE": ["PHYSICS", "QUALITY"],
        "DEFLECTION": ["PHYSICS", "CAM"],
        "CHIP": ["PHYSICS", "CAM"],
        "MATERIAL": ["PHYSICS", "AI_ML"],
        "PROCESS": ["CAM", "PROCESS_INTEL"],
        "ECONOMICS": ["BUSINESS"],
        "QUALITY": ["QUALITY", "PROCESS_INTEL"],
        "OPTIMIZATION": ["AI_ML", "PROCESS_INTEL"],
        "MACHINE": ["CAM", "DIGITAL_TWIN"],
        "GEOMETRIC": ["CAD", "CAM"],
        "SUSTAINABILITY": ["BUSINESS"],
        "AI_ML": ["AI_ML"],
        "SIGNAL": ["AI_ML", "DIGITAL_TWIN"],
        "PRISM_META": ["PRISM_UNIQUE"],
        "TOOL_GEOMETRY": ["CAM", "PHYSICS"],
        "COOLANT": ["PHYSICS"],
        "FIXTURE": ["CAM"],
        "SCHEDULING": ["BUSINESS"],
        "METROLOGY": ["QUALITY"],
        "TRIBOLOGY": ["PHYSICS"],
        "DIGITAL_TWIN": ["DIGITAL_TWIN"],
        "HYBRID": ["AI_ML", "PHYSICS", "PRISM_UNIQUE"],
    }
    
    for f in formulas.get("formulas", []):
        fid = f["id"]
        fcat = f.get("category", "UNKNOWN")
        target_cats = CATEGORY_MAP.get(fcat, ["PHYSICS"])
        
        for ecat in target_cats:
            for eid in engines_by_cat.get(ecat, []):
                formula_to_engines[fid].add(eid)
                engine_to_formulas[eid].add(fid)
    
    # Convert sets to lists
    return {
        "formula_to_engines": {k: list(v) for k, v in formula_to_engines.items()},
        "engine_to_formulas": {k: list(v) for k, v in engine_to_formulas.items()},
    }

def expand_product_wiring(formulas, engines):
    """Wire products to all required resources"""
    product_wiring = {}
    
    # Index by category
    formulas_by_cat = defaultdict(list)
    for f in formulas.get("formulas", []):
        formulas_by_cat[f.get("category", "")].append(f["id"])
    
    engines_by_cat = defaultdict(list)
    for e in engines.get("engines", []):
        engines_by_cat[e.get("category", "")].append(e["id"])
    
    for product, reqs in PRODUCT_REQUIREMENTS.items():
        prod_formulas = set()
        prod_engines = set()
        
        # Collect formulas
        for fcat in reqs["formula_categories"]:
            prod_formulas.update(formulas_by_cat.get(fcat, []))
        
        # Collect engines
        for ecat in reqs["engine_categories"]:
            prod_engines.update(engines_by_cat.get(ecat, []))
        
        product_wiring[product] = {
            "formulas": list(prod_formulas),
            "engines": list(prod_engines),
            "formula_count": len(prod_formulas),
            "engine_count": len(prod_engines),
            "meets_minimum": {
                "formulas": len(prod_formulas) >= reqs["min_formulas"],
                "engines": len(prod_engines) >= reqs["min_engines"],
            }
        }
    
    return product_wiring

def compute_full_utilization(formula_wiring, engine_count=447, formula_count=490):
    """Compute utilization percentages"""
    formulas_wired = len(formula_wiring.get("formula_to_engines", {}))
    engines_wired = len(formula_wiring.get("engine_to_formulas", {}))
    
    # Count connections
    total_f2e = sum(len(v) for v in formula_wiring.get("formula_to_engines", {}).values())
    total_e2f = sum(len(v) for v in formula_wiring.get("engine_to_formulas", {}).values())
    
    return {
        "formulas": {
            "total": formula_count,
            "wired": formulas_wired,
            "pct": f"{formulas_wired/formula_count*100:.1f}%",
        },
        "engines": {
            "total": engine_count,
            "wired": engines_wired,
            "pct": f"{engines_wired/engine_count*100:.1f}%",
        },
        "connections": {
            "formula_to_engine": total_f2e,
            "avg_engines_per_formula": f"{total_f2e/formula_count:.1f}",
            "avg_formulas_per_engine": f"{total_e2f/engine_count:.1f}",
        }
    }

def main():
    print("=" * 80)
    print("PRISM COMPREHENSIVE WIRING EXPANSION")
    print("=" * 80)
    
    # Load
    print("\n[1/4] Loading registries...")
    formulas, engines, wiring = load_registries()
    print(f"  Formulas: {formulas['totalFormulas']}")
    print(f"  Engines: {engines['totalEngines']}")
    
    # Expand formula->engine
    print("\n[2/4] Expanding Formula->Engine wiring...")
    formula_wiring = expand_formula_engine_wiring(formulas, engines)
    
    # Expand products
    print("\n[3/4] Wiring Products to resources...")
    product_wiring = expand_product_wiring(formulas, engines)
    
    for prod, pw in product_wiring.items():
        print(f"  {prod}: {pw['formula_count']} formulas, {pw['engine_count']} engines")
    
    # Compute utilization
    print("\n[4/4] Computing utilization...")
    utilization = compute_full_utilization(formula_wiring)
    
    print(f"  Formulas wired: {utilization['formulas']['wired']}/{utilization['formulas']['total']} ({utilization['formulas']['pct']})")
    print(f"  Engines wired: {utilization['engines']['wired']}/{utilization['engines']['total']} ({utilization['engines']['pct']})")
    print(f"  Connections: {utilization['connections']['formula_to_engine']}")
    print(f"  Avg engines/formula: {utilization['connections']['avg_engines_per_formula']}")
    print(f"  Avg formulas/engine: {utilization['connections']['avg_formulas_per_engine']}")
    
    # Save expanded wiring
    expanded_registry = {
        "version": "2.0.0",
        "generatedAt": datetime.now().isoformat(),
        "status": "EXPANDED",
        "utilization": utilization,
        "formula_engine_wiring": formula_wiring,
        "product_wiring": product_wiring,
        "category_mappings": {
            "skill_to_engine": SKILL_CATEGORY_TO_ENGINES,
            "product_requirements": PRODUCT_REQUIREMENTS,
        }
    }
    
    output_path = r"C:\PRISM\registries\WIRING_REGISTRY_EXPANDED.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(expanded_registry, f, indent=2)
    
    print(f"\n{'='*60}")
    print("EXPANSION COMPLETE")
    print(f"{'='*60}")
    print(f"  Saved: {output_path}")

if __name__ == "__main__":
    main()
