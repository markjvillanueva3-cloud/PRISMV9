#!/usr/bin/env python3
"""
PRISM EXHAUSTIVE HIERARCHY BUILDER v15.0 - MAIN
================================================
Builds the complete 5-layer hierarchy with MAXIMUM cross-connections.
"""

import json
from datetime import datetime
from collections import defaultdict

# Import constants from parts 1 and 2
exec(open(r"C:\PRISM\scripts\prism_exhaustive_hierarchy_v15.py", encoding='utf-8').read())
exec(open(r"C:\PRISM\scripts\prism_exhaustive_hierarchy_v15_part2.py", encoding='utf-8').read())

def build_exhaustive_hierarchy():
    """Build the complete hierarchy with all cross-connections"""
    
    print("=" * 80)
    print("PRISM EXHAUSTIVE HIERARCHY BUILDER v15.0")
    print("GOLDEN RULE: IF IT CAN BE USED, USE IT!")
    print("=" * 80)
    
    # Load existing registries
    print("\n[1/8] Loading registries...")
    
    try:
        with open(r"C:\PRISM\registries\FORMULA_REGISTRY.json", 'r') as f:
            formula_reg = json.load(f)
        formulas = formula_reg.get("formulas", [])
        print(f"  Formulas: {len(formulas)}")
    except:
        formulas = [{"id": f"F-{cat[:3].upper()}-{i:03d}", "category": cat} 
                   for cat in FORMULA_CATEGORIES for i in range(1, 20)]
        print(f"  Formulas (generated): {len(formulas)}")
    
    try:
        with open(r"C:\PRISM\registries\ENGINE_REGISTRY.json", 'r') as f:
            engine_reg = json.load(f)
        engines = engine_reg.get("engines", [])
        print(f"  Engines: {len(engines)}")
    except:
        engines = []
        print("  Engines: Using category-based")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER -1 → LAYER 0: Database → Formula
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n[2/8] Wiring DATABASE -> FORMULA...")
    
    db_to_formula = defaultdict(set)
    formula_to_db = defaultdict(set)
    
    # Build formula index by category
    formulas_by_cat = defaultdict(list)
    for f in formulas:
        formulas_by_cat[f.get("category", "UNKNOWN")].append(f["id"])
    
    # Wire databases to formulas via category mappings
    for db_id, db_info in DATABASES.items():
        db_cat = db_info.get("category", "")
        formula_cats = DB_CAT_TO_FORMULA_CAT.get(db_cat, [])
        
        for fcat in formula_cats:
            for fid in formulas_by_cat.get(fcat, []):
                db_to_formula[db_id].add(fid)
                formula_to_db[fid].add(db_id)
    
    db_formula_connections = sum(len(v) for v in db_to_formula.values())
    print(f"  DB->Formula: {db_formula_connections:,} connections")
    print(f"  Avg formulas/DB: {db_formula_connections / len(DATABASES):.1f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 0 → LAYER 1: Formula → Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n[3/8] Wiring FORMULA -> ENGINE...")
    
    formula_to_engine = defaultdict(set)
    engine_to_formula = defaultdict(set)
    
    # Build engine index by category
    engines_by_cat = defaultdict(list)
    for e in engines:
        engines_by_cat[e.get("category", "UNKNOWN")].append(e["id"])
    
    # If no engines loaded, generate IDs
    if not engines:
        engine_ids = {
            "PHYSICS": [f"E-PHYS-{i:03d}" for i in range(1, 122)],
            "AI_ML": [f"E-AI-{i:03d}" for i in range(1, 130)],
            "CAM": [f"E-CAM-{i:03d}" for i in range(1, 72)],
            "CAD": [f"E-CAD-{i:03d}" for i in range(1, 30)],
            "PROCESS_INTEL": [f"E-PROC-{i:03d}" for i in range(1, 22)],
            "PRISM_UNIQUE": [f"E-PRM-{i:03d}" for i in range(1, 16)],
            "INTEGRATION": [f"E-INT-{i:03d}" for i in range(1, 14)],
            "QUALITY": [f"E-QUAL-{i:03d}" for i in range(1, 14)],
            "BUSINESS": [f"E-BUS-{i:03d}" for i in range(1, 14)],
            "DIGITAL_TWIN": [f"E-DT-{i:03d}" for i in range(1, 13)],
            "KNOWLEDGE": [f"E-KB-{i:03d}" for i in range(1, 11)],
        }
        engines_by_cat = engine_ids
    
    # Wire formulas to engines via category mappings
    for f in formulas:
        fcat = f.get("category", "")
        engine_cats = FORMULA_CAT_TO_ENGINE_CAT.get(fcat, [])
        
        for ecat in engine_cats:
            for eid in engines_by_cat.get(ecat, []):
                formula_to_engine[f["id"]].add(eid)
                engine_to_formula[eid].add(f["id"])
    
    formula_engine_connections = sum(len(v) for v in formula_to_engine.values())
    print(f"  Formula->Engine: {formula_engine_connections:,} connections")
    print(f"  Avg engines/formula: {formula_engine_connections / max(len(formulas), 1):.1f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 1 → LAYER 2: Engine → Skill
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n[4/8] Wiring ENGINE -> SKILL...")
    
    engine_to_skill = defaultdict(set)
    skill_to_engine = defaultdict(set)
    
    # Generate skill IDs per category (1,227 skills = ~42 per category)
    skills_by_cat = {}
    for scat in SKILL_CATEGORIES:
        skills_by_cat[scat] = [f"S-{scat[:4].upper()}-{i:03d}" for i in range(1, 43)]
    
    # Wire engines to skills via category mappings
    all_engine_cats = set()
    for ecat, eids in engines_by_cat.items():
        all_engine_cats.add(ecat)
        skill_cats = ENGINE_CAT_TO_SKILL_CAT.get(ecat, [])
        
        for eid in eids:
            for scat in skill_cats:
                for sid in skills_by_cat.get(scat, []):
                    engine_to_skill[eid].add(sid)
                    skill_to_engine[sid].add(eid)
    
    engine_skill_connections = sum(len(v) for v in engine_to_skill.values())
    total_engines = sum(len(v) for v in engines_by_cat.values())
    print(f"  Engine->Skill: {engine_skill_connections:,} connections")
    print(f"  Avg skills/engine: {engine_skill_connections / max(total_engines, 1):.1f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # LAYER 2 → LAYER 3: Skill → Product
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n[5/8] Wiring SKILL -> PRODUCT...")
    
    skill_to_product = defaultdict(set)
    product_to_skill = defaultdict(set)
    
    for product, skill_cats in SKILL_CAT_TO_PRODUCT.items():
        for scat in skill_cats:
            for sid in skills_by_cat.get(scat, []):
                skill_to_product[sid].add(product)
                product_to_skill[product].add(sid)
    
    skill_product_connections = sum(len(v) for v in skill_to_product.values())
    total_skills = sum(len(v) for v in skills_by_cat.values())
    print(f"  Skill->Product: {skill_product_connections:,} connections")
    print(f"  Avg products/skill: {skill_product_connections / max(total_skills, 1):.1f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CROSS-LAYER CONNECTIONS (Skip-level wiring)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n[6/8] Building CROSS-LAYER connections...")
    
    # DB -> Engine (transitive)
    db_to_engine = defaultdict(set)
    for db_id, fids in db_to_formula.items():
        for fid in fids:
            db_to_engine[db_id].update(formula_to_engine.get(fid, set()))
    
    # DB -> Skill (transitive)
    db_to_skill = defaultdict(set)
    for db_id, eids in db_to_engine.items():
        for eid in eids:
            db_to_skill[db_id].update(engine_to_skill.get(eid, set()))
    
    # DB -> Product (transitive)
    db_to_product = defaultdict(set)
    for db_id, sids in db_to_skill.items():
        for sid in sids:
            db_to_product[db_id].update(skill_to_product.get(sid, set()))
    
    # Formula -> Skill (transitive)
    formula_to_skill = defaultdict(set)
    for fid, eids in formula_to_engine.items():
        for eid in eids:
            formula_to_skill[fid].update(engine_to_skill.get(eid, set()))
    
    # Formula -> Product (transitive)
    formula_to_product = defaultdict(set)
    for fid, sids in formula_to_skill.items():
        for sid in sids:
            formula_to_product[fid].update(skill_to_product.get(sid, set()))
    
    # Engine -> Product (transitive)
    engine_to_product = defaultdict(set)
    for eid, sids in engine_to_skill.items():
        for sid in sids:
            engine_to_product[eid].update(skill_to_product.get(sid, set()))
    
    cross_db_engine = sum(len(v) for v in db_to_engine.values())
    cross_db_skill = sum(len(v) for v in db_to_skill.values())
    cross_db_product = sum(len(v) for v in db_to_product.values())
    cross_formula_skill = sum(len(v) for v in formula_to_skill.values())
    cross_formula_product = sum(len(v) for v in formula_to_product.values())
    cross_engine_product = sum(len(v) for v in engine_to_product.values())
    
    print(f"  DB->Engine (X): {cross_db_engine:,}")
    print(f"  DB->Skill (X): {cross_db_skill:,}")
    print(f"  DB->Product (X): {cross_db_product}")
    print(f"  Formula->Skill (X): {cross_formula_skill:,}")
    print(f"  Formula->Product (X): {cross_formula_product}")
    print(f"  Engine->Product (X): {cross_engine_product}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILD FINAL HIERARCHY
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n[7/8] Building final hierarchy structure...")
    
    total_records = sum(d.get("records", 0) for d in DATABASES.values())
    
    hierarchy = {
        "version": "15.0.0",
        "type": "EXHAUSTIVE_COMPLETE_HIERARCHY",
        "generatedAt": datetime.now().isoformat(),
        "goldenRule": "IF IT CAN BE USED, USE IT!",
        
        "layers": {
            "L-1_DATABASES": {
                "count": len(DATABASES),
                "records": total_records,
                "categories": list(set(d.get("category", "") for d in DATABASES.values())),
            },
            "L0_FORMULAS": {
                "count": len(formulas),
                "categories": FORMULA_CATEGORIES,
            },
            "L1_ENGINES": {
                "count": total_engines,
                "categories": ENGINE_CATEGORIES,
            },
            "L2_SKILLS": {
                "count": total_skills,
                "categories": SKILL_CATEGORIES,
            },
            "L3_PRODUCTS": {
                "count": 4,
                "names": ["SPEED_FEED_CALCULATOR", "POST_PROCESSOR", 
                         "SHOP_MANAGER", "AUTO_CNC_PROGRAMMER"],
            },
        },
        
        "direct_wiring": {
            "database_to_formula": {k: list(v) for k, v in db_to_formula.items()},
            "formula_to_engine": {k: list(v) for k, v in formula_to_engine.items()},
            "engine_to_skill": {k: list(v) for k, v in engine_to_skill.items()},
            "skill_to_product": {k: list(v) for k, v in skill_to_product.items()},
        },
        
        "inverse_wiring": {
            "formula_to_database": {k: list(v) for k, v in formula_to_db.items()},
            "engine_to_formula": {k: list(v) for k, v in engine_to_formula.items()},
            "skill_to_engine": {k: list(v) for k, v in skill_to_engine.items()},
            "product_to_skill": {k: list(v) for k, v in product_to_skill.items()},
        },
        
        "cross_layer_wiring": {
            "database_to_engine": {k: list(v) for k, v in db_to_engine.items()},
            "database_to_skill": {k: list(v) for k, v in db_to_skill.items()},
            "database_to_product": {k: list(v) for k, v in db_to_product.items()},
            "formula_to_skill": {k: list(v) for k, v in formula_to_skill.items()},
            "formula_to_product": {k: list(v) for k, v in formula_to_product.items()},
            "engine_to_product": {k: list(v) for k, v in engine_to_product.items()},
        },
        
        "statistics": {
            "databases": len(DATABASES),
            "database_records": total_records,
            "formulas": len(formulas),
            "engines": total_engines,
            "skills": total_skills,
            "products": 4,
            
            "direct_connections": {
                "db_formula": db_formula_connections,
                "formula_engine": formula_engine_connections,
                "engine_skill": engine_skill_connections,
                "skill_product": skill_product_connections,
            },
            
            "cross_layer_connections": {
                "db_engine": cross_db_engine,
                "db_skill": cross_db_skill,
                "db_product": cross_db_product,
                "formula_skill": cross_formula_skill,
                "formula_product": cross_formula_product,
                "engine_product": cross_engine_product,
            },
            
            "total_direct": (db_formula_connections + formula_engine_connections + 
                            engine_skill_connections + skill_product_connections),
            
            "total_cross": (cross_db_engine + cross_db_skill + cross_db_product +
                           cross_formula_skill + cross_formula_product + cross_engine_product),
            
            "total_all_connections": (
                db_formula_connections + formula_engine_connections + 
                engine_skill_connections + skill_product_connections +
                cross_db_engine + cross_db_skill + cross_db_product +
                cross_formula_skill + cross_formula_product + cross_engine_product
            ),
        },
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SAVE
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n[8/8] Saving hierarchy...")
    
    output_path = r"C:\PRISM\registries\COMPLETE_HIERARCHY_v15.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(hierarchy, f, indent=2)
    
    # Print summary
    stats = hierarchy["statistics"]
    print("\n" + "=" * 60)
    print("EXHAUSTIVE HIERARCHY COMPLETE")
    print("=" * 60)
    
    print(f"\nLAYERS:")
    print(f"  L-1 DATABASES: {stats['databases']} ({stats['database_records']:,} records)")
    print(f"  L0  FORMULAS:  {stats['formulas']}")
    print(f"  L1  ENGINES:   {stats['engines']}")
    print(f"  L2  SKILLS:    {stats['skills']}")
    print(f"  L3  PRODUCTS:  {stats['products']}")
    
    print(f"\nDIRECT CONNECTIONS:")
    dc = stats["direct_connections"]
    print(f"  DB->Formula:    {dc['db_formula']:,}")
    print(f"  Formula->Engine: {dc['formula_engine']:,}")
    print(f"  Engine->Skill:   {dc['engine_skill']:,}")
    print(f"  Skill->Product:  {dc['skill_product']:,}")
    print(f"  Subtotal:        {stats['total_direct']:,}")
    
    print(f"\nCROSS-LAYER CONNECTIONS:")
    cc = stats["cross_layer_connections"]
    print(f"  DB->Engine:      {cc['db_engine']:,}")
    print(f"  DB->Skill:       {cc['db_skill']:,}")
    print(f"  DB->Product:     {cc['db_product']}")
    print(f"  Formula->Skill:  {cc['formula_skill']:,}")
    print(f"  Formula->Product: {cc['formula_product']}")
    print(f"  Engine->Product: {cc['engine_product']}")
    print(f"  Subtotal:        {stats['total_cross']:,}")
    
    print(f"\nTOTAL CONNECTIONS: {stats['total_all_connections']:,}")
    print(f"\nSaved: {output_path}")
    
    return hierarchy

if __name__ == "__main__":
    build_exhaustive_hierarchy()
