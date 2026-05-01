#!/usr/bin/env python3
"""
PRISM EXHAUSTIVE HIERARCHY WIRING - PART 1
==========================================
DATABASE -> FORMULA mappings with MAXIMUM cross-connections

Golden Rule: IF IT CAN BE USED, USE IT!
"""

import json
from datetime import datetime
from collections import defaultdict

# Load registries
def load_registry(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

# =====================================================================
# DATABASE CATEGORY -> FORMULA CATEGORY MAPPINGS
# Every formula that COULD use a database SHOULD be wired to it
# =====================================================================

# Which formula categories need which database categories
DB_CAT_TO_FORMULA_CAT = {
    # Materials databases feed cutting/physics formulas
    "MATERIALS": [
        "CUTTING", "THERMAL", "WEAR", "MATERIAL", "CHIP", "SURFACE",
        "VIBRATION", "POWER", "DEFLECTION", "TRIBOLOGY", "TOOL_GEOMETRY",
        "HYBRID", "PROCESS", "OPTIMIZATION", "AI_ML", "DIGITAL_TWIN",
        "ECONOMICS", "QUALITY", "METROLOGY"
    ],
    
    # Machines databases feed machine-related formulas
    "MACHINES": [
        "MACHINE", "VIBRATION", "GEOMETRIC", "POWER", "DEFLECTION",
        "PROCESS", "SCHEDULING", "COLLISION", "DIGITAL_TWIN", "FIXTURE",
        "OPTIMIZATION", "CUTTING", "THERMAL", "ECONOMICS"
    ],
    
    # Tools databases feed tooling formulas
    "TOOLS": [
        "CUTTING", "TOOL_GEOMETRY", "WEAR", "SURFACE", "THERMAL", "CHIP",
        "PROCESS", "ECONOMICS", "OPTIMIZATION", "POWER", "VIBRATION",
        "HYBRID", "QUALITY", "METROLOGY"
    ],
    
    # Controllers/Alarms feed machine control formulas
    "CONTROLLERS": [
        "MACHINE", "PROCESS", "QUALITY", "SIGNAL", "OPTIMIZATION",
        "AI_ML", "PRISM_META", "SCHEDULING"
    ],
    
    # Workholding databases feed fixture formulas
    "WORKHOLDING": [
        "FIXTURE", "DEFLECTION", "VIBRATION", "PROCESS", "QUALITY",
        "GEOMETRIC", "CUTTING", "OPTIMIZATION"
    ],
    
    # Algorithms feed AI/optimization formulas
    "ALGORITHMS": [
        "AI_ML", "OPTIMIZATION", "SIGNAL", "GEOMETRIC", "MACHINE",
        "PROCESS", "QUALITY", "SCHEDULING", "PRISM_META", "HYBRID",
        "DIGITAL_TWIN", "CUTTING", "THERMAL"
    ],
    
    # Knowledge bases feed everything
    "KNOWLEDGE": [
        "AI_ML", "OPTIMIZATION", "PRISM_META", "HYBRID", "DIGITAL_TWIN",
        "CUTTING", "THERMAL", "MATERIAL", "PROCESS", "QUALITY",
        "GEOMETRIC", "MACHINE", "ECONOMICS", "SCHEDULING", "VIBRATION",
        "WEAR", "SURFACE", "CHIP", "POWER", "DEFLECTION"
    ],
    
    # Catalogs feed material/tool selection
    "CATALOGS": [
        "CUTTING", "TOOL_GEOMETRY", "ECONOMICS", "MATERIAL",
        "OPTIMIZATION", "PROCESS", "HYBRID"
    ],
    
    # Constants feed ALL physics formulas
    "CONSTANTS": [
        "CUTTING", "THERMAL", "MATERIAL", "POWER", "VIBRATION",
        "DEFLECTION", "TRIBOLOGY", "CHIP", "WEAR", "SURFACE",
        "MACHINE", "GEOMETRIC", "PROCESS", "OPTIMIZATION", "AI_ML",
        "QUALITY", "ECONOMICS", "PRISM_META", "HYBRID", "DIGITAL_TWIN",
        "METROLOGY", "FIXTURE", "COOLANT", "SCHEDULING", "SUSTAINABILITY",
        "SIGNAL", "TOOL_GEOMETRY", "COLLISION"
    ],
    
    # Units feed ALL formulas (universal)
    "UNITS": [
        "CUTTING", "THERMAL", "MATERIAL", "POWER", "VIBRATION",
        "DEFLECTION", "TRIBOLOGY", "CHIP", "WEAR", "SURFACE",
        "MACHINE", "GEOMETRIC", "PROCESS", "OPTIMIZATION", "AI_ML",
        "QUALITY", "ECONOMICS", "PRISM_META", "HYBRID", "DIGITAL_TWIN",
        "METROLOGY", "FIXTURE", "COOLANT", "SCHEDULING", "SUSTAINABILITY",
        "SIGNAL", "TOOL_GEOMETRY", "COLLISION"
    ],
    
    # Business databases feed economics/scheduling
    "BUSINESS": [
        "ECONOMICS", "SCHEDULING", "SUSTAINABILITY", "PROCESS", "QUALITY",
        "OPTIMIZATION", "PRISM_META"
    ],
    
    # Simulation databases feed verification formulas
    "SIMULATION": [
        "GEOMETRIC", "MACHINE", "PROCESS", "COLLISION", "DIGITAL_TWIN",
        "OPTIMIZATION", "QUALITY", "CUTTING"
    ],
    
    # Physics lookups feed physics formulas
    "PHYSICS": [
        "CUTTING", "THERMAL", "WEAR", "MATERIAL", "POWER", "VIBRATION",
        "DEFLECTION", "CHIP", "SURFACE", "TRIBOLOGY", "PROCESS",
        "OPTIMIZATION", "HYBRID", "DIGITAL_TWIN"
    ],
}

# Specific high-precision database->formula mappings
SPECIFIC_DB_FORMULA = {
    # Material databases -> specific formulas
    "DB-MAT-P-STEELS": {
        "formulas": ["F-CUT-*", "F-THERM-*", "F-WEAR-*", "F-MAT-*", "F-CHIP-*", "F-SURF-*"],
        "reason": "Steel cutting parameters"
    },
    "DB-MAT-JOHNSON-COOK": {
        "formulas": ["F-MAT-001", "F-MAT-002", "F-MAT-003", "F-CHIP-*", "F-CUT-004", "F-CUT-005", "F-THERM-*"],
        "reason": "Constitutive model coefficients"
    },
    "DB-PHYS-TAYLOR": {
        "formulas": ["F-WEAR-001", "F-WEAR-002", "F-WEAR-003", "F-ECON-*", "F-OPT-*"],
        "reason": "Taylor tool life coefficients"
    },
    "DB-PHYS-FORCE": {
        "formulas": ["F-CUT-001", "F-CUT-002", "F-CUT-003", "F-POWER-*", "F-VIB-*"],
        "reason": "Cutting force coefficients"
    },
    "DB-PHYS-THERMAL": {
        "formulas": ["F-THERM-*", "F-WEAR-*", "F-MAT-*"],
        "reason": "Thermal properties"
    },
    "DB-MACH-KINEMATICS": {
        "formulas": ["F-MACH-*", "F-GEOM-*", "F-VIB-001", "F-VIB-002", "F-VIB-003"],
        "reason": "Machine dynamics"
    },
    "DB-TOOL-CUTTING": {
        "formulas": ["F-CUT-*", "F-TOOL-*", "F-WEAR-*", "F-SURF-*", "F-THERM-*", "F-CHIP-*", "F-ECON-005"],
        "reason": "Tool geometry and properties"
    },
    "DB-CTRL-GCODE": {
        "formulas": ["F-MACH-*", "F-GEOM-*", "F-PROC-*"],
        "reason": "G-code capabilities"
    },
    "DB-ALGO-OPTIMIZATION": {
        "formulas": ["F-OPT-*", "F-AI-*", "F-PROC-*"],
        "reason": "Optimization algorithms"
    },
    "DB-KNOW-COURSES": {
        "formulas": ["F-AI-*", "F-OPT-*", "F-HYB-*", "F-DT-*", "F-PRM-*"],
        "reason": "Academic knowledge"
    },
}

def wire_databases_to_formulas():
    """Wire all databases to formulas with MAXIMUM cross-connections"""
    
    # Load registries
    db_reg = load_registry(r"C:\PRISM\registries\DATABASE_REGISTRY.json")
    f_reg = load_registry(r"C:\PRISM\registries\FORMULA_REGISTRY.json")
    
    databases = db_reg.get("databases", {})
    formulas = f_reg.get("formulas", [])
    
    # Build formula index by category
    formulas_by_cat = defaultdict(list)
    for f in formulas:
        formulas_by_cat[f.get("category", "UNKNOWN")].append(f["id"])
    
    # Build wirings
    db_to_formulas = defaultdict(set)
    formula_to_dbs = defaultdict(set)
    
    # 1. Wire by category mapping (broad coverage)
    for db_id, db in databases.items():
        db_cat = db.get("category", "")
        formula_cats = DB_CAT_TO_FORMULA_CAT.get(db_cat, [])
        
        for fcat in formula_cats:
            for fid in formulas_by_cat.get(fcat, []):
                db_to_formulas[db_id].add(fid)
                formula_to_dbs[fid].add(db_id)
    
    # 2. Add specific high-precision mappings
    for db_id, mapping in SPECIFIC_DB_FORMULA.items():
        if db_id not in databases:
            continue
        
        for pattern in mapping["formulas"]:
            if pattern.endswith("-*"):
                prefix = pattern[:-1]
                for f in formulas:
                    if f["id"].startswith(prefix):
                        db_to_formulas[db_id].add(f["id"])
                        formula_to_dbs[f["id"]].add(db_id)
            else:
                for f in formulas:
                    if f["id"] == pattern:
                        db_to_formulas[db_id].add(f["id"])
                        formula_to_dbs[f["id"]].add(db_id)
    
    # 3. Add universal connections (CONSTANTS and UNITS feed EVERYTHING)
    for db_id, db in databases.items():
        if db.get("category") in ["CONSTANTS", "UNITS"]:
            for f in formulas:
                db_to_formulas[db_id].add(f["id"])
                formula_to_dbs[f["id"]].add(db_id)
    
    # Convert to lists
    return {
        "db_to_formulas": {k: sorted(list(v)) for k, v in db_to_formulas.items()},
        "formula_to_dbs": {k: sorted(list(v)) for k, v in formula_to_dbs.items()},
    }

def main():
    print("=" * 80)
    print("PRISM EXHAUSTIVE DATABASE -> FORMULA WIRING")
    print("=" * 80)
    
    wiring = wire_databases_to_formulas()
    
    total_db_formula = sum(len(v) for v in wiring["db_to_formulas"].values())
    avg_formulas_per_db = total_db_formula / len(wiring["db_to_formulas"]) if wiring["db_to_formulas"] else 0
    avg_dbs_per_formula = sum(len(v) for v in wiring["formula_to_dbs"].values()) / len(wiring["formula_to_dbs"]) if wiring["formula_to_dbs"] else 0
    
    print(f"\nDB -> Formula Connections: {total_db_formula:,}")
    print(f"Databases with mappings: {len(wiring['db_to_formulas'])}")
    print(f"Formulas with DB sources: {len(wiring['formula_to_dbs'])}")
    print(f"Avg formulas per DB: {avg_formulas_per_db:.1f}")
    print(f"Avg DBs per formula: {avg_dbs_per_formula:.1f}")
    
    # Save
    output = {
        "version": "1.0.0",
        "type": "DB_FORMULA_WIRING",
        "generatedAt": datetime.now().isoformat(),
        "statistics": {
            "total_connections": total_db_formula,
            "databases_mapped": len(wiring["db_to_formulas"]),
            "formulas_mapped": len(wiring["formula_to_dbs"]),
            "avg_formulas_per_db": round(avg_formulas_per_db, 1),
            "avg_dbs_per_formula": round(avg_dbs_per_formula, 1),
        },
        "wiring": wiring,
    }
    
    path = r"C:\PRISM\registries\DB_FORMULA_WIRING.json"
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved: {path}")
    
    return output

if __name__ == "__main__":
    main()
