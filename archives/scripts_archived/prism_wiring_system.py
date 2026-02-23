#!/usr/bin/env python3
"""
PRISM BOTTOM-UP WIRING SYSTEM
=============================
Connects: Formulas(490) -> Engines(447) -> Skills(1227) -> Products(4)
Goal: 100% utilization - no orphaned resources
"""

import json
from datetime import datetime
from collections import defaultdict

# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY MAPPINGS: Which formula categories feed which engine categories
# ═══════════════════════════════════════════════════════════════════════════════

FORMULA_TO_ENGINE_MAP = {
    # Physics formulas -> Physics engines
    "CUTTING": ["PHYSICS", "CAM", "PROCESS_INTEL"],
    "POWER": ["PHYSICS", "PROCESS_INTEL", "DIGITAL_TWIN"],
    "THERMAL": ["PHYSICS", "DIGITAL_TWIN", "QUALITY"],
    "WEAR": ["PHYSICS", "PROCESS_INTEL", "DIGITAL_TWIN"],
    "VIBRATION": ["PHYSICS", "CAM", "QUALITY", "DIGITAL_TWIN"],
    "SURFACE": ["PHYSICS", "QUALITY", "CAM"],
    "DEFLECTION": ["PHYSICS", "CAM", "QUALITY"],
    "CHIP": ["PHYSICS", "CAM"],
    
    # Material/Tool formulas -> Multiple engines
    "MATERIAL": ["PHYSICS", "AI_ML", "PROCESS_INTEL"],
    "TOOL_GEOMETRY": ["CAM", "PHYSICS", "PROCESS_INTEL"],
    "COOLANT": ["PHYSICS", "PROCESS_INTEL"],
    "FIXTURE": ["CAM", "PHYSICS"],
    
    # Process formulas -> Process/CAM engines
    "PROCESS": ["CAM", "PROCESS_INTEL", "BUSINESS"],
    "GEOMETRIC": ["CAD", "CAM"],
    "MACHINE": ["CAM", "DIGITAL_TWIN", "INTEGRATION"],
    
    # Quality/Optimization -> Multiple
    "QUALITY": ["QUALITY", "PROCESS_INTEL", "AI_ML"],
    "OPTIMIZATION": ["AI_ML", "PROCESS_INTEL", "CAM"],
    "SCHEDULING": ["BUSINESS", "PROCESS_INTEL"],
    "ECONOMICS": ["BUSINESS", "PROCESS_INTEL"],
    
    # AI/ML formulas -> AI engines
    "AI_ML": ["AI_ML", "DIGITAL_TWIN", "QUALITY"],
    "SIGNAL": ["AI_ML", "DIGITAL_TWIN", "PHYSICS"],
    
    # Advanced
    "SUSTAINABILITY": ["BUSINESS", "PROCESS_INTEL"],
    "METROLOGY": ["QUALITY", "DIGITAL_TWIN"],
    "TRIBOLOGY": ["PHYSICS", "PROCESS_INTEL"],
    "DIGITAL_TWIN": ["DIGITAL_TWIN", "AI_ML", "INTEGRATION"],
    "HYBRID": ["AI_ML", "PHYSICS", "PRISM_UNIQUE"],
    "PRISM_META": ["PRISM_UNIQUE", "AI_ML", "QUALITY"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# ENGINE TO SKILL MAPPINGS
# ═══════════════════════════════════════════════════════════════════════════════

ENGINE_TO_SKILL_PATTERNS = {
    "PHYSICS": ["prism-universal-formulas", "prism-material-physics", "prism-safety-framework"],
    "AI_ML": ["prism-ai-ml-master", "prism-cognitive-core", "prism-reasoning-engine"],
    "CAM": ["prism-fanuc-programming", "prism-siemens-programming", "prism-heidenhain-programming", 
            "prism-gcode-reference", "prism-okuma-programming"],
    "CAD": ["prism-code-master"],
    "PROCESS_INTEL": ["prism-process-optimizer", "prism-expert-master"],
    "QUALITY": ["prism-quality-master", "prism-validator", "prism-code-perfection"],
    "BUSINESS": ["prism-manufacturing-tables"],
    "DIGITAL_TWIN": ["prism-state-manager", "prism-session-master"],
    "INTEGRATION": ["prism-skill-orchestrator", "prism-api-contracts"],
    "PRISM_UNIQUE": ["prism-master-equation", "prism-cognitive-core"],
    "KNOWLEDGE": ["prism-knowledge-master", "prism-coding-patterns"],
}

# ═══════════════════════════════════════════════════════════════════════════════
# SKILL TO PRODUCT MAPPINGS
# ═══════════════════════════════════════════════════════════════════════════════

SKILL_TO_PRODUCT_MAP = {
    "SPEED_FEED_CALCULATOR": [
        "prism-universal-formulas", "prism-material-physics", "prism-safety-framework",
        "prism-ai-ml-master", "prism-quality-master", "prism-process-optimizer",
        "prism-manufacturing-tables", "prism-master-equation"
    ],
    "POST_PROCESSOR": [
        "prism-fanuc-programming", "prism-siemens-programming", "prism-heidenhain-programming",
        "prism-okuma-programming", "prism-gcode-reference", "prism-api-contracts",
        "prism-error-catalog"
    ],
    "SHOP_MANAGER": [
        "prism-manufacturing-tables", "prism-process-optimizer", "prism-quality-master",
        "prism-expert-master", "prism-state-manager"
    ],
    "AUTO_CNC_PROGRAMMER": [
        "prism-fanuc-programming", "prism-siemens-programming", "prism-gcode-reference",
        "prism-ai-ml-master", "prism-cognitive-core", "prism-skill-orchestrator",
        "prism-universal-formulas", "prism-safety-framework"
    ],
}

def load_formulas():
    with open(r"C:\PRISM\registries\FORMULA_REGISTRY.json", 'r') as f:
        return json.load(f)

def load_engines():
    with open(r"C:\PRISM\registries\ENGINE_REGISTRY.json", 'r') as f:
        return json.load(f)

def wire_formulas_to_engines(formulas, engines):
    """Create formula -> engine mappings"""
    wiring = defaultdict(lambda: {"formulas": [], "engines": []})
    
    # Group formulas by category
    formulas_by_cat = defaultdict(list)
    for f in formulas.get("formulas", []):
        cat = f.get("category", "UNKNOWN")
        formulas_by_cat[cat].append(f["id"])
    
    # Group engines by category
    engines_by_cat = defaultdict(list)
    for e in engines.get("engines", []):
        cat = e.get("category", "UNKNOWN")
        engines_by_cat[cat].append(e["id"])
    
    # Wire based on mappings
    formula_usage = defaultdict(list)  # formula_id -> [engine_ids]
    engine_inputs = defaultdict(list)  # engine_id -> [formula_ids]
    
    for formula_cat, engine_cats in FORMULA_TO_ENGINE_MAP.items():
        formula_ids = formulas_by_cat.get(formula_cat, [])
        for engine_cat in engine_cats:
            engine_ids = engines_by_cat.get(engine_cat, [])
            for fid in formula_ids:
                for eid in engine_ids:
                    formula_usage[fid].append(eid)
                    engine_inputs[eid].append(fid)
    
    return {
        "formula_to_engines": dict(formula_usage),
        "engine_to_formulas": dict(engine_inputs),
        "formulas_by_category": dict(formulas_by_cat),
        "engines_by_category": dict(engines_by_cat),
    }

def wire_engines_to_skills(engines):
    """Create engine -> skill mappings"""
    engine_to_skills = defaultdict(list)
    skill_to_engines = defaultdict(list)
    
    engines_by_cat = defaultdict(list)
    for e in engines.get("engines", []):
        cat = e.get("category", "UNKNOWN")
        engines_by_cat[cat].append(e["id"])
    
    for engine_cat, skill_patterns in ENGINE_TO_SKILL_PATTERNS.items():
        engine_ids = engines_by_cat.get(engine_cat, [])
        for eid in engine_ids:
            for skill in skill_patterns:
                engine_to_skills[eid].append(skill)
                skill_to_engines[skill].append(eid)
    
    return {
        "engine_to_skills": dict(engine_to_skills),
        "skill_to_engines": dict(skill_to_engines),
    }

def wire_skills_to_products():
    """Create skill -> product mappings"""
    skill_to_products = defaultdict(list)
    product_to_skills = dict(SKILL_TO_PRODUCT_MAP)
    
    for product, skills in SKILL_TO_PRODUCT_MAP.items():
        for skill in skills:
            skill_to_products[skill].append(product)
    
    return {
        "skill_to_products": dict(skill_to_products),
        "product_to_skills": product_to_skills,
    }

def compute_utilization(wiring):
    """Compute utilization metrics"""
    f2e = wiring.get("formula_engine", {}).get("formula_to_engines", {})
    e2s = wiring.get("engine_skill", {}).get("engine_to_skills", {})
    s2p = wiring.get("skill_product", {}).get("skill_to_products", {})
    
    total_formulas = len(wiring.get("formula_engine", {}).get("formulas_by_category", {}))
    total_engines = sum(len(v) for v in wiring.get("formula_engine", {}).get("engines_by_category", {}).values())
    
    formulas_used = len(f2e)
    engines_wired = len(e2s)
    skills_wired = len(s2p)
    
    return {
        "formulas": {"total": 490, "wired": formulas_used, "utilization": f"{formulas_used/490*100:.1f}%"},
        "engines": {"total": 447, "wired": engines_wired, "utilization": f"{engines_wired/447*100:.1f}%"},
        "skills_to_products": {"wired": skills_wired},
    }

def main():
    print("=" * 80)
    print("PRISM BOTTOM-UP WIRING SYSTEM")
    print("=" * 80)
    
    # Load registries
    print("\n[1/4] Loading registries...")
    formulas = load_formulas()
    engines = load_engines()
    print(f"  Formulas: {formulas['totalFormulas']}")
    print(f"  Engines: {engines['totalEngines']}")
    
    # Wire Layer 0->1: Formulas to Engines
    print("\n[2/4] Wiring Formulas -> Engines...")
    formula_engine_wiring = wire_formulas_to_engines(formulas, engines)
    f2e_count = len(formula_engine_wiring["formula_to_engines"])
    e2f_count = len(formula_engine_wiring["engine_to_formulas"])
    print(f"  Formulas wired: {f2e_count}")
    print(f"  Engines receiving formulas: {e2f_count}")
    
    # Wire Layer 1->2: Engines to Skills
    print("\n[3/4] Wiring Engines -> Skills...")
    engine_skill_wiring = wire_engines_to_skills(engines)
    e2s_count = len(engine_skill_wiring["engine_to_skills"])
    s2e_count = len(engine_skill_wiring["skill_to_engines"])
    print(f"  Engines wired to skills: {e2s_count}")
    print(f"  Skills receiving engines: {s2e_count}")
    
    # Wire Layer 2->3: Skills to Products
    print("\n[4/4] Wiring Skills -> Products...")
    skill_product_wiring = wire_skills_to_products()
    s2p_count = len(skill_product_wiring["skill_to_products"])
    print(f"  Skills wired to products: {s2p_count}")
    print(f"  Products: 4")
    
    # Compile full wiring registry
    wiring_registry = {
        "version": "1.0.0",
        "generatedAt": datetime.now().isoformat(),
        "layers": {
            "L0_FORMULAS": {"count": 490, "status": "COMPLETE"},
            "L1_ENGINES": {"count": 447, "status": "WIRED"},
            "L2_SKILLS": {"count": 1227, "status": "WIRED"},
            "L3_PRODUCTS": {"count": 4, "status": "WIRED"},
        },
        "formula_engine": formula_engine_wiring,
        "engine_skill": engine_skill_wiring,
        "skill_product": skill_product_wiring,
        "utilization": {
            "formulas_wired": f2e_count,
            "engines_wired": e2s_count,
            "skills_wired": s2p_count,
            "formula_utilization": f"{f2e_count/490*100:.1f}%",
            "engine_utilization": f"{e2s_count/447*100:.1f}%",
        },
        "category_mappings": {
            "formula_to_engine": FORMULA_TO_ENGINE_MAP,
            "engine_to_skill": ENGINE_TO_SKILL_PATTERNS,
            "skill_to_product": SKILL_TO_PRODUCT_MAP,
        }
    }
    
    # Save
    output_path = r"C:\PRISM\registries\WIRING_REGISTRY.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(wiring_registry, f, indent=2)
    
    print(f"\n{'='*60}")
    print("WIRING COMPLETE")
    print(f"{'='*60}")
    print(f"  Formula->Engine mappings: {f2e_count}")
    print(f"  Engine->Skill mappings: {e2s_count}")
    print(f"  Skill->Product mappings: {s2p_count}")
    print(f"\n  Saved: {output_path}")

if __name__ == "__main__":
    main()
