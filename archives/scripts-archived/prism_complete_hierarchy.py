#!/usr/bin/env python3
"""
PRISM EXHAUSTIVE HIERARCHY WIRING - COMPLETE
=============================================
Wire ALL layers with MAXIMUM cross-connections:

Layer -1: DATABASES (69 databases, 28,370 records)
Layer 0:  FORMULAS (490 formulas)
Layer 1:  ENGINES (447 engines)  
Layer 2:  SKILLS (1,227 skills)
Layer 3:  PRODUCTS (4 products)

Golden Rule: IF IT CAN BE USED, USE IT!
"""

import json
import os
from datetime import datetime
from collections import defaultdict

def load_registry(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

# =====================================================================
# WIRING MATRICES - MAXIMUM CROSS-CONNECTIONS
# =====================================================================

# Database category -> Engine category (what engines consume which DB types)
DB_CAT_TO_ENGINE_CAT = {
    "MATERIALS": ["PHYSICS", "AI_ML", "CAM", "PROCESS", "QUALITY", "DIGITAL_TWIN", "BUSINESS"],
    "MACHINES": ["PHYSICS", "CAM", "PROCESS", "SIMULATION", "DIGITAL_TWIN", "INTEGRATION"],
    "TOOLS": ["PHYSICS", "CAM", "PROCESS", "QUALITY", "OPTIMIZATION", "BUSINESS"],
    "CONTROLLERS": ["INTEGRATION", "PROCESS", "CAM", "QUALITY", "AI_ML"],
    "WORKHOLDING": ["CAM", "PHYSICS", "SIMULATION", "PROCESS"],
    "ALGORITHMS": ["AI_ML", "OPTIMIZATION", "CAM", "PROCESS", "QUALITY", "PRISM"],
    "KNOWLEDGE": ["AI_ML", "PRISM", "KNOWLEDGE", "OPTIMIZATION", "CAM", "PROCESS"],
    "CATALOGS": ["BUSINESS", "PROCESS", "CAM", "OPTIMIZATION"],
    "CONSTANTS": ["PHYSICS", "CAM", "PROCESS", "OPTIMIZATION", "AI_ML", "QUALITY", "BUSINESS", "SIMULATION", "DIGITAL_TWIN", "CAD", "PRISM", "INTEGRATION", "KNOWLEDGE"],
    "UNITS": ["PHYSICS", "CAM", "PROCESS", "OPTIMIZATION", "AI_ML", "QUALITY", "BUSINESS", "SIMULATION", "DIGITAL_TWIN", "CAD", "PRISM", "INTEGRATION", "KNOWLEDGE"],
    "BUSINESS": ["BUSINESS", "PROCESS", "OPTIMIZATION", "AI_ML"],
    "SIMULATION": ["SIMULATION", "CAM", "PROCESS", "DIGITAL_TWIN", "QUALITY"],
    "PHYSICS": ["PHYSICS", "CAM", "AI_ML", "OPTIMIZATION", "DIGITAL_TWIN", "PROCESS"],
}

# Engine category -> Skill category (what skills use which engine types)
ENGINE_CAT_TO_SKILL_CAT = {
    "PHYSICS": ["physics", "cutting", "thermal", "vibration", "material", "manufacturing", "calculation", "validation"],
    "AI_ML": ["ai", "ml", "neural", "optimization", "learning", "prediction", "cognitive", "intelligence"],
    "CAM": ["cam", "toolpath", "machining", "programming", "manufacturing", "post", "simulation"],
    "CAD": ["cad", "geometry", "modeling", "feature", "design", "visualization"],
    "PROCESS": ["process", "manufacturing", "quality", "optimization", "validation", "monitoring"],
    "SIMULATION": ["simulation", "verification", "collision", "visualization", "digital-twin"],
    "OPTIMIZATION": ["optimization", "ai", "ml", "process", "manufacturing", "calculation"],
    "QUALITY": ["quality", "validation", "inspection", "metrology", "compliance"],
    "BUSINESS": ["business", "cost", "scheduling", "quoting", "economics", "management"],
    "INTEGRATION": ["integration", "gateway", "api", "bridge", "controller", "post"],
    "DIGITAL_TWIN": ["digital-twin", "simulation", "monitoring", "ai", "prediction"],
    "PRISM": ["prism", "core", "master", "orchestrator", "cognitive", "meta"],
    "KNOWLEDGE": ["knowledge", "learning", "ai", "cognitive", "expert"],
}

# Skill category -> Product (what products use which skill types)
SKILL_CAT_TO_PRODUCT = {
    "physics": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER"],
    "cutting": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER"],
    "thermal": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER"],
    "vibration": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER"],
    "material": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER"],
    "manufacturing": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "POST_PROCESSOR"],
    "calculation": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER"],
    "validation": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "POST_PROCESSOR", "SHOP_MANAGER"],
    "ai": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER"],
    "ml": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER"],
    "neural": ["AUTO_CNC_PROGRAMMER"],
    "optimization": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER"],
    "learning": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER"],
    "prediction": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER"],
    "cognitive": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER"],
    "intelligence": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER"],
    "cam": ["AUTO_CNC_PROGRAMMER", "POST_PROCESSOR"],
    "toolpath": ["AUTO_CNC_PROGRAMMER"],
    "machining": ["AUTO_CNC_PROGRAMMER", "SPEED_FEED_CALCULATOR"],
    "programming": ["AUTO_CNC_PROGRAMMER", "POST_PROCESSOR"],
    "post": ["POST_PROCESSOR", "AUTO_CNC_PROGRAMMER"],
    "simulation": ["AUTO_CNC_PROGRAMMER", "POST_PROCESSOR"],
    "cad": ["AUTO_CNC_PROGRAMMER"],
    "geometry": ["AUTO_CNC_PROGRAMMER", "POST_PROCESSOR"],
    "modeling": ["AUTO_CNC_PROGRAMMER"],
    "feature": ["AUTO_CNC_PROGRAMMER"],
    "design": ["AUTO_CNC_PROGRAMMER"],
    "visualization": ["AUTO_CNC_PROGRAMMER", "POST_PROCESSOR"],
    "process": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "POST_PROCESSOR"],
    "quality": ["SHOP_MANAGER", "AUTO_CNC_PROGRAMMER"],
    "monitoring": ["SHOP_MANAGER"],
    "verification": ["POST_PROCESSOR", "AUTO_CNC_PROGRAMMER"],
    "collision": ["AUTO_CNC_PROGRAMMER", "POST_PROCESSOR"],
    "digital-twin": ["AUTO_CNC_PROGRAMMER", "SHOP_MANAGER"],
    "business": ["SHOP_MANAGER"],
    "cost": ["SHOP_MANAGER", "SPEED_FEED_CALCULATOR"],
    "scheduling": ["SHOP_MANAGER"],
    "quoting": ["SHOP_MANAGER"],
    "economics": ["SHOP_MANAGER", "SPEED_FEED_CALCULATOR"],
    "management": ["SHOP_MANAGER"],
    "integration": ["POST_PROCESSOR", "AUTO_CNC_PROGRAMMER"],
    "gateway": ["POST_PROCESSOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "SPEED_FEED_CALCULATOR"],
    "api": ["POST_PROCESSOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "SPEED_FEED_CALCULATOR"],
    "bridge": ["POST_PROCESSOR", "AUTO_CNC_PROGRAMMER"],
    "controller": ["POST_PROCESSOR"],
    "prism": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "POST_PROCESSOR"],
    "core": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "POST_PROCESSOR"],
    "master": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "POST_PROCESSOR"],
    "orchestrator": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "POST_PROCESSOR"],
    "meta": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER", "SHOP_MANAGER", "POST_PROCESSOR"],
    "knowledge": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER"],
    "expert": ["SPEED_FEED_CALCULATOR", "AUTO_CNC_PROGRAMMER"],
    "inspection": ["SHOP_MANAGER"],
    "metrology": ["SHOP_MANAGER", "AUTO_CNC_PROGRAMMER"],
    "compliance": ["SHOP_MANAGER"],
}

def build_exhaustive_hierarchy():
    """Build the complete exhaustive hierarchy wiring"""
    
    print("=" * 80)
    print("PRISM EXHAUSTIVE HIERARCHY WIRING")
    print("Golden Rule: IF IT CAN BE USED, USE IT!")
    print("=" * 80)
    
    # Load all registries
    print("\n[1/7] Loading registries...")
    db_reg = load_registry(r"C:\PRISM\registries\DATABASE_REGISTRY.json")
    f_reg = load_registry(r"C:\PRISM\registries\FORMULA_REGISTRY.json")
    e_reg = load_registry(r"C:\PRISM\registries\ENGINE_REGISTRY.json")
    
    # Try to load existing wiring
    try:
        wiring = load_registry(r"C:\PRISM\registries\WIRING_EXHAUSTIVE.json")
    except:
        wiring = {}
    
    databases = db_reg.get("databases", {})
    formulas = f_reg.get("formulas", [])
    engines = e_reg.get("engines", [])
    
    print(f"  Databases: {len(databases)}")
    print(f"  Formulas: {len(formulas)}")
    print(f"  Engines: {len(engines)}")
    
    # Build indexes
    formulas_by_cat = defaultdict(list)
    for f in formulas:
        formulas_by_cat[f.get("category", "")].append(f["id"])
    
    engines_by_cat = defaultdict(list)
    for e in engines:
        engines_by_cat[e.get("category", "")].append(e["id"])
    
    # =====================================================================
    # LAYER 1: DATABASE -> FORMULA WIRING
    # =====================================================================
    print("\n[2/7] Wiring DATABASES -> FORMULAS...")
    
    db_to_formulas = defaultdict(set)
    formula_to_dbs = defaultdict(set)
    
    # Category-based wiring
    DB_CAT_TO_FORMULA_CAT = {
        "MATERIALS": ["CUTTING", "THERMAL", "WEAR", "MATERIAL", "CHIP", "SURFACE", "VIBRATION", "POWER", "DEFLECTION", "TRIBOLOGY", "TOOL_GEOMETRY", "HYBRID", "PROCESS", "OPTIMIZATION", "AI_ML", "DIGITAL_TWIN", "ECONOMICS", "QUALITY"],
        "MACHINES": ["MACHINE", "VIBRATION", "GEOMETRIC", "POWER", "DEFLECTION", "PROCESS", "SCHEDULING", "COLLISION", "DIGITAL_TWIN", "FIXTURE", "OPTIMIZATION", "CUTTING", "THERMAL", "ECONOMICS"],
        "TOOLS": ["CUTTING", "TOOL_GEOMETRY", "WEAR", "SURFACE", "THERMAL", "CHIP", "PROCESS", "ECONOMICS", "OPTIMIZATION", "POWER", "VIBRATION", "HYBRID", "QUALITY"],
        "CONTROLLERS": ["MACHINE", "PROCESS", "QUALITY", "SIGNAL", "OPTIMIZATION", "AI_ML", "PRISM_META", "SCHEDULING"],
        "WORKHOLDING": ["FIXTURE", "DEFLECTION", "VIBRATION", "PROCESS", "QUALITY", "GEOMETRIC", "CUTTING", "OPTIMIZATION"],
        "ALGORITHMS": ["AI_ML", "OPTIMIZATION", "SIGNAL", "GEOMETRIC", "MACHINE", "PROCESS", "QUALITY", "SCHEDULING", "PRISM_META", "HYBRID", "DIGITAL_TWIN", "CUTTING", "THERMAL"],
        "KNOWLEDGE": ["AI_ML", "OPTIMIZATION", "PRISM_META", "HYBRID", "DIGITAL_TWIN", "CUTTING", "THERMAL", "MATERIAL", "PROCESS", "QUALITY", "GEOMETRIC", "MACHINE", "ECONOMICS", "SCHEDULING", "VIBRATION", "WEAR", "SURFACE", "CHIP", "POWER", "DEFLECTION"],
        "CATALOGS": ["CUTTING", "TOOL_GEOMETRY", "ECONOMICS", "MATERIAL", "OPTIMIZATION", "PROCESS", "HYBRID"],
        "CONSTANTS": list(set(cat for cats in formulas_by_cat.keys() for cat in [cats])),  # ALL categories
        "UNITS": list(set(cat for cats in formulas_by_cat.keys() for cat in [cats])),  # ALL categories
        "BUSINESS": ["ECONOMICS", "SCHEDULING", "SUSTAINABILITY", "PROCESS", "QUALITY", "OPTIMIZATION", "PRISM_META"],
        "SIMULATION": ["GEOMETRIC", "MACHINE", "PROCESS", "COLLISION", "DIGITAL_TWIN", "OPTIMIZATION", "QUALITY", "CUTTING"],
        "PHYSICS": ["CUTTING", "THERMAL", "WEAR", "MATERIAL", "POWER", "VIBRATION", "DEFLECTION", "CHIP", "SURFACE", "TRIBOLOGY", "PROCESS", "OPTIMIZATION", "HYBRID", "DIGITAL_TWIN"],
    }
    
    for db_id, db in databases.items():
        db_cat = db.get("category", "")
        formula_cats = DB_CAT_TO_FORMULA_CAT.get(db_cat, [])
        
        # Add all formulas in matching categories
        for fcat in formula_cats:
            for fid in formulas_by_cat.get(fcat, []):
                db_to_formulas[db_id].add(fid)
                formula_to_dbs[fid].add(db_id)
        
        # CONSTANTS and UNITS feed EVERYTHING
        if db_cat in ["CONSTANTS", "UNITS"]:
            for f in formulas:
                db_to_formulas[db_id].add(f["id"])
                formula_to_dbs[f["id"]].add(db_id)
    
    total_db_f = sum(len(v) for v in db_to_formulas.values())
    print(f"  DB->Formula connections: {total_db_f:,}")
    
    # =====================================================================
    # LAYER 2: DATABASE -> ENGINE WIRING (transitive through formulas)
    # =====================================================================
    print("\n[3/7] Wiring DATABASES -> ENGINES...")
    
    db_to_engines = defaultdict(set)
    engine_to_dbs = defaultdict(set)
    
    # Get existing formula->engine mappings
    f2e = wiring.get("precise_formula_engine_complete", {})
    
    # Build transitive DB->Engine through formulas
    for db_id, formula_ids in db_to_formulas.items():
        for fid in formula_ids:
            for eid in f2e.get(fid, []):
                db_to_engines[db_id].add(eid)
                engine_to_dbs[eid].add(db_id)
    
    # Also add direct DB->Engine by category
    for db_id, db in databases.items():
        db_cat = db.get("category", "")
        engine_cats = DB_CAT_TO_ENGINE_CAT.get(db_cat, [])
        
        for ecat in engine_cats:
            for eid in engines_by_cat.get(ecat, []):
                db_to_engines[db_id].add(eid)
                engine_to_dbs[eid].add(db_id)
    
    total_db_e = sum(len(v) for v in db_to_engines.values())
    print(f"  DB->Engine connections: {total_db_e:,}")
    
    # =====================================================================
    # LAYER 3: DATABASE -> SKILL WIRING (transitive through engines)
    # =====================================================================
    print("\n[4/7] Wiring DATABASES -> SKILLS...")
    
    db_to_skills = defaultdict(set)
    skill_to_dbs = defaultdict(set)
    
    # Get existing engine->skill mappings
    e2s = wiring.get("engine_to_skills", {})
    
    # Build transitive DB->Skill through engines
    for db_id, engine_ids in db_to_engines.items():
        for eid in engine_ids:
            for sid in e2s.get(eid, []):
                db_to_skills[db_id].add(sid)
                skill_to_dbs[sid].add(db_id)
    
    total_db_s = sum(len(v) for v in db_to_skills.values())
    print(f"  DB->Skill connections: {total_db_s:,}")
    
    # =====================================================================
    # LAYER 4: DATABASE -> PRODUCT WIRING (transitive through skills)
    # =====================================================================
    print("\n[5/7] Wiring DATABASES -> PRODUCTS...")
    
    db_to_products = defaultdict(set)
    product_to_dbs = defaultdict(set)
    
    # Get existing product wiring
    product_wiring = wiring.get("product_wiring", {})
    
    for product, pw in product_wiring.items():
        product_skills = set(pw.get("skills", []))
        for db_id, skill_list in db_to_skills.items():
            if product_skills & skill_list:
                db_to_products[db_id].add(product)
                product_to_dbs[product].add(db_id)
    
    total_db_p = sum(len(v) for v in db_to_products.values())
    print(f"  DB->Product connections: {total_db_p}")
    
    # =====================================================================
    # BUILD COMPLETE HIERARCHY
    # =====================================================================
    print("\n[6/7] Building complete hierarchy...")
    
    hierarchy = {
        "version": "14.0.0",
        "type": "COMPLETE_EXHAUSTIVE_HIERARCHY",
        "generatedAt": datetime.now().isoformat(),
        "goldenRule": "IF IT CAN BE USED, USE IT!",
        
        "layers": {
            "L-1_DATABASES": {
                "count": len(databases),
                "records": db_reg.get("totalRecords", 0),
            },
            "L0_FORMULAS": {
                "count": len(formulas),
            },
            "L1_ENGINES": {
                "count": len(engines),
            },
            "L2_SKILLS": {
                "count": len(e2s),
            },
            "L3_PRODUCTS": {
                "count": 4,
                "names": ["SPEED_FEED_CALCULATOR", "POST_PROCESSOR", "SHOP_MANAGER", "AUTO_CNC_PROGRAMMER"],
            },
        },
        
        "wiring": {
            # Direct layer connections
            "database_to_formula": {k: sorted(list(v)) for k, v in db_to_formulas.items()},
            "formula_to_database": {k: sorted(list(v)) for k, v in formula_to_dbs.items()},
            "formula_to_engine": wiring.get("precise_formula_engine_complete", {}),
            "engine_to_formula": {}, # Inverse
            "engine_to_skill": e2s,
            "skill_to_product": {},  # From product_wiring
            
            # Cross-layer connections (skip levels)
            "database_to_engine": {k: sorted(list(v)) for k, v in db_to_engines.items()},
            "engine_to_database": {k: sorted(list(v)) for k, v in engine_to_dbs.items()},
            "database_to_skill": {k: sorted(list(v)) for k, v in db_to_skills.items()},
            "skill_to_database": {k: sorted(list(v)) for k, v in skill_to_dbs.items()},
            "database_to_product": {k: sorted(list(v)) for k, v in db_to_products.items()},
            "product_to_database": {k: sorted(list(v)) for k, v in product_to_dbs.items()},
        },
        
        "product_wiring": product_wiring,
        "formula_chains": wiring.get("formula_chains", {}),
        "inverse_dependencies": wiring.get("inverse_dependencies", {}),
        "execution_dependencies": wiring.get("execution_dependencies", {}),
    }
    
    # Build inverse formula->engine
    for fid, eids in hierarchy["wiring"]["formula_to_engine"].items():
        for eid in eids:
            if eid not in hierarchy["wiring"]["engine_to_formula"]:
                hierarchy["wiring"]["engine_to_formula"][eid] = []
            hierarchy["wiring"]["engine_to_formula"][eid].append(fid)
    
    # Build skill->product
    for product, pw in product_wiring.items():
        for sid in pw.get("skills", []):
            if sid not in hierarchy["wiring"]["skill_to_product"]:
                hierarchy["wiring"]["skill_to_product"][sid] = []
            hierarchy["wiring"]["skill_to_product"][sid].append(product)
    
    # Calculate statistics
    stats = {
        "databases": len(databases),
        "database_records": db_reg.get("totalRecords", 0),
        "formulas": len(formulas),
        "engines": len(engines),
        "skills": len(e2s),
        "products": 4,
        
        "connections": {
            "db_formula": total_db_f,
            "formula_engine": wiring.get("statistics_complete", {}).get("formula_engine_connections", 0),
            "engine_skill": wiring.get("statistics_complete", {}).get("engine_skill_connections", 0),
            "db_engine_cross": total_db_e,
            "db_skill_cross": total_db_s,
            "db_product_cross": total_db_p,
        },
    }
    
    stats["total_connections"] = sum(stats["connections"].values())
    hierarchy["statistics"] = stats
    
    # =====================================================================
    # SAVE
    # =====================================================================
    print("\n[7/7] Saving...")
    
    output_path = r"C:\PRISM\registries\COMPLETE_HIERARCHY.json"
    save_json(hierarchy, output_path)
    
    print(f"\n{'='*60}")
    print("COMPLETE HIERARCHY WIRING DONE")
    print(f"{'='*60}")
    print(f"\n  Layers:")
    print(f"    L-1 DATABASES: {stats['databases']} ({stats['database_records']:,} records)")
    print(f"    L0  FORMULAS:  {stats['formulas']}")
    print(f"    L1  ENGINES:   {stats['engines']}")
    print(f"    L2  SKILLS:    {stats['skills']}")
    print(f"    L3  PRODUCTS:  {stats['products']}")
    
    print(f"\n  Connections:")
    print(f"    DB->Formula:     {stats['connections']['db_formula']:,}")
    print(f"    Formula->Engine: {stats['connections']['formula_engine']:,}")
    print(f"    Engine->Skill:   {stats['connections']['engine_skill']:,}")
    print(f"    DB->Engine (X):  {stats['connections']['db_engine_cross']:,}")
    print(f"    DB->Skill (X):   {stats['connections']['db_skill_cross']:,}")
    print(f"    DB->Product (X): {stats['connections']['db_product_cross']}")
    print(f"    -------------------------")
    print(f"    TOTAL:           {stats['total_connections']:,}")
    
    print(f"\n  Saved: {output_path}")
    
    return hierarchy

if __name__ == "__main__":
    build_exhaustive_hierarchy()
