#!/usr/bin/env python3
"""
PRISM EXHAUSTIVE WIRING PART 3
==============================
Product wiring + execution graphs + dependency resolution
"""

import json
from datetime import datetime
from collections import defaultdict

def load_exhaustive():
    with open(r"C:\PRISM\registries\WIRING_EXHAUSTIVE.json", 'r') as f:
        return json.load(f)

# Product requirements - which formula categories and engine categories each product needs
PRODUCT_REQUIREMENTS = {
    "SPEED_FEED_CALCULATOR": {
        "description": "Core calculator for speeds, feeds, and parameters",
        "formula_categories": ["CUTTING", "POWER", "THERMAL", "WEAR", "SURFACE", 
                              "MATERIAL", "VIBRATION", "CHIP", "OPTIMIZATION",
                              "PRISM_META", "HYBRID", "QUALITY"],
        "engine_categories": ["PHYSICS", "AI_ML", "PROCESS_INTEL", "QUALITY", "PRISM_UNIQUE"],
        "skill_patterns": ["prism-universal-formulas", "prism-material-physics", 
                          "prism-safety-framework", "prism-ai-ml-master",
                          "prism-optimization", "prism-manufacturing-tables"],
        "core_chains": ["cutting_force_chain", "tool_life_chain", "stability_chain",
                       "surface_chain", "optimization_chain"],
    },
    "POST_PROCESSOR": {
        "description": "G-code generation for all controller families",
        "formula_categories": ["MACHINE", "GEOMETRIC", "PROCESS"],
        "engine_categories": ["CAM", "INTEGRATION"],
        "skill_patterns": ["prism-fanuc-programming", "prism-siemens-programming",
                          "prism-heidenhain-programming", "prism-okuma-programming",
                          "prism-gcode-reference", "prism-api-contracts"],
        "core_chains": [],
    },
    "SHOP_MANAGER": {
        "description": "Quoting, scheduling, and shop floor management",
        "formula_categories": ["ECONOMICS", "SCHEDULING", "QUALITY", "SUSTAINABILITY",
                              "PROCESS"],
        "engine_categories": ["BUSINESS", "PROCESS_INTEL", "QUALITY"],
        "skill_patterns": ["prism-economics", "prism-scheduling", "prism-costing",
                          "prism-quality-master", "prism-process-optimizer"],
        "core_chains": ["economics_chain", "quality_chain"],
    },
    "AUTO_CNC_PROGRAMMER": {
        "description": "AI-driven automatic CNC program generation",
        "formula_categories": ["GEOMETRIC", "CUTTING", "OPTIMIZATION", "AI_ML",
                              "TOOL_GEOMETRY", "MACHINE", "HYBRID", "PRISM_META"],
        "engine_categories": ["CAM", "CAD", "AI_ML", "DIGITAL_TWIN", "PHYSICS", "PRISM_UNIQUE"],
        "skill_patterns": ["prism-fanuc-programming", "prism-ai-ml-master",
                          "prism-cognitive-core", "prism-skill-orchestrator",
                          "prism-toolpath", "prism-feature-recognition"],
        "core_chains": ["optimization_chain", "ai_chain", "hybrid_chain"],
    },
}

# Execution order: formulas that must run before others
EXECUTION_DEPENDENCIES = {
    # Material properties before cutting
    "F-MAT-001": [],  # Johnson-Cook is a root
    "F-MAT-002": ["F-MAT-001"],
    
    # Cutting forces depend on material
    "F-CUT-001": ["F-MAT-001"],
    "F-CUT-002": ["F-MAT-001"],
    "F-CUT-003": ["F-MAT-001"],
    "F-CUT-004": ["F-MAT-001", "F-CHIP-001"],
    
    # Power depends on force
    "F-POWER-001": ["F-CUT-001", "F-CUT-002", "F-CUT-003"],
    "F-POWER-002": ["F-CUT-001"],
    
    # Thermal depends on power
    "F-THERM-001": ["F-POWER-001"],
    "F-THERM-002": ["F-POWER-001", "F-CUT-001"],
    
    # Wear depends on thermal
    "F-WEAR-001": ["F-THERM-001"],
    "F-WEAR-002": ["F-THERM-001", "F-CUT-001"],
    "F-WEAR-003": ["F-WEAR-001"],  # Taylor from wear rate
    
    # Surface depends on vibration
    "F-SURF-001": ["F-CUT-001"],
    "F-SURF-002": ["F-CUT-001", "F-VIB-001"],
    "F-SURF-003": ["F-SURF-001", "F-VIB-008"],
    
    # Vibration depends on force
    "F-VIB-001": ["F-CUT-001"],
    "F-VIB-003": ["F-VIB-001", "F-VIB-002"],
    "F-VIB-005": ["F-VIB-003"],
    
    # Chip depends on material
    "F-CHIP-001": ["F-MAT-001"],
    "F-CHIP-002": ["F-CHIP-001"],
    
    # Quality depends on process outputs
    "F-QUAL-001": ["F-SURF-001"],
    "F-QUAL-002": ["F-SURF-001", "F-DEFL-001"],
    
    # Economics depends on wear/time
    "F-ECON-001": ["F-PROC-001", "F-WEAR-003"],
    "F-ECON-005": ["F-WEAR-003"],
    
    # Optimization depends on objectives
    "F-OPT-001": ["F-ECON-001", "F-PROC-002"],
    "F-OPT-010": ["F-OPT-001", "F-OPT-002", "F-OPT-003"],
    
    # PRISM meta depends on all components
    "F-PRM-001": ["F-PRM-010", "F-PRM-011", "F-PRM-012", "F-PRM-013", "F-PRM-014"],
    
    # Hybrid depends on physics + AI
    "F-HYB-001": ["F-CUT-001", "F-THERM-001"],
    "F-HYB-005": ["F-HYB-001", "F-HYB-002"],
}

def wire_products(exhaustive):
    """Wire products to their required resources"""
    
    f2e = exhaustive.get("precise_formula_engine_complete", {})
    e2s = exhaustive.get("engine_to_skills", {})
    
    # Index formulas by category
    with open(r"C:\PRISM\registries\FORMULA_REGISTRY.json", 'r') as f:
        formulas = json.load(f)
    
    formulas_by_cat = defaultdict(list)
    for formula in formulas.get("formulas", []):
        formulas_by_cat[formula.get("category", "")].append(formula["id"])
    
    # Index engines by category
    with open(r"C:\PRISM\registries\ENGINE_REGISTRY.json", 'r') as f:
        engines = json.load(f)
    
    engines_by_cat = defaultdict(list)
    for engine in engines.get("engines", []):
        engines_by_cat[engine.get("category", "")].append(engine["id"])
    
    product_wiring = {}
    
    for product, reqs in PRODUCT_REQUIREMENTS.items():
        # Collect formulas
        product_formulas = set()
        for fcat in reqs["formula_categories"]:
            product_formulas.update(formulas_by_cat.get(fcat, []))
        
        # Collect engines (from formula mappings + category)
        product_engines = set()
        for fid in product_formulas:
            product_engines.update(f2e.get(fid, []))
        for ecat in reqs["engine_categories"]:
            product_engines.update(engines_by_cat.get(ecat, []))
        
        # Collect skills (from engine mappings + patterns)
        product_skills = set()
        for eid in product_engines:
            product_skills.update(e2s.get(eid, []))
        product_skills.update(reqs["skill_patterns"])
        
        # Build execution graph for this product
        exec_graph = {}
        for fid in product_formulas:
            deps = EXECUTION_DEPENDENCIES.get(fid, [])
            # Only include deps that are in this product's formulas
            relevant_deps = [d for d in deps if d in product_formulas]
            exec_graph[fid] = relevant_deps
        
        product_wiring[product] = {
            "description": reqs["description"],
            "formulas": list(product_formulas),
            "engines": list(product_engines),
            "skills": list(product_skills),
            "core_chains": reqs["core_chains"],
            "execution_graph": exec_graph,
            "counts": {
                "formulas": len(product_formulas),
                "engines": len(product_engines),
                "skills": len(product_skills),
            }
        }
    
    return product_wiring

def topological_sort(graph):
    """Topological sort for execution order"""
    in_degree = defaultdict(int)
    for node in graph:
        if node not in in_degree:
            in_degree[node] = 0
        for dep in graph.get(node, []):
            in_degree[node] += 1
    
    # Start with nodes that have no dependencies
    queue = [n for n in graph if in_degree[n] == 0]
    result = []
    
    while queue:
        node = queue.pop(0)
        result.append(node)
        
        # Find nodes that depend on this one
        for candidate in graph:
            if node in graph.get(candidate, []):
                in_degree[candidate] -= 1
                if in_degree[candidate] == 0:
                    queue.append(candidate)
    
    return result

def generate_execution_orders(product_wiring):
    """Generate execution order for each product"""
    
    for product, wiring in product_wiring.items():
        exec_graph = wiring.get("execution_graph", {})
        if exec_graph:
            order = topological_sort(exec_graph)
            wiring["execution_order"] = order
            wiring["parallel_groups"] = []  # Could compute parallel execution groups
        else:
            wiring["execution_order"] = wiring["formulas"]
    
    return product_wiring

def main():
    print("=" * 80)
    print("PRISM EXHAUSTIVE WIRING PART 3 - PRODUCTS & EXECUTION")
    print("=" * 80)
    
    exhaustive = load_exhaustive()
    
    # Wire products
    print("\n[1/3] Wiring products to resources...")
    product_wiring = wire_products(exhaustive)
    
    for product, wiring in product_wiring.items():
        counts = wiring["counts"]
        print(f"  {product}:")
        print(f"    Formulas: {counts['formulas']}, Engines: {counts['engines']}, Skills: {counts['skills']}")
    
    # Generate execution orders
    print("\n[2/3] Computing execution orders...")
    product_wiring = generate_execution_orders(product_wiring)
    
    for product, wiring in product_wiring.items():
        order = wiring.get("execution_order", [])
        print(f"  {product}: {len(order)} formulas in sequence")
    
    # Add to exhaustive
    exhaustive["product_wiring"] = product_wiring
    exhaustive["execution_dependencies"] = EXECUTION_DEPENDENCIES
    
    # Compute final statistics
    total_formula_product = sum(w["counts"]["formulas"] for w in product_wiring.values())
    total_engine_product = sum(w["counts"]["engines"] for w in product_wiring.values())
    total_skill_product = sum(w["counts"]["skills"] for w in product_wiring.values())
    
    exhaustive["statistics_complete"]["product_formula_assignments"] = total_formula_product
    exhaustive["statistics_complete"]["product_engine_assignments"] = total_engine_product
    exhaustive["statistics_complete"]["product_skill_assignments"] = total_skill_product
    exhaustive["statistics_complete"]["execution_dependencies_defined"] = len(EXECUTION_DEPENDENCIES)
    
    exhaustive["version"] = "12.0.0"
    exhaustive["status"] = "EXHAUSTIVE_WITH_PRODUCTS"
    exhaustive["generatedAt"] = datetime.now().isoformat()
    
    # Save
    output_path = r"C:\PRISM\registries\WIRING_EXHAUSTIVE.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(exhaustive, f, indent=2)
    
    print(f"\n{'='*60}")
    print("PRODUCT WIRING COMPLETE")
    print(f"{'='*60}")
    print(f"  Products wired: 4")
    print(f"  Total formula assignments: {total_formula_product}")
    print(f"  Total engine assignments: {total_engine_product}")
    print(f"  Total skill assignments: {total_skill_product}")
    print(f"  Execution dependencies: {len(EXECUTION_DEPENDENCIES)}")
    print(f"  Saved: {output_path}")

if __name__ == "__main__":
    main()
