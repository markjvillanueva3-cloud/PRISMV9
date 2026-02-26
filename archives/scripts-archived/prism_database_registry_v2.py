#!/usr/bin/env python3
"""
PRISM COMPLETE DATABASE REGISTRY v2.0
=====================================
99 databases, 114,012 records
"""

import json
from datetime import datetime

# Complete database inventory from hierarchy script
DATABASES = {
    # MATERIALS (15 databases)
    "DB-MAT-MASTER": {"category": "MATERIALS", "records": 1047, "params": 127, "desc": "Complete material library"},
    "DB-MAT-P-STEELS": {"category": "MATERIALS", "records": 400, "desc": "Carbon/alloy/tool steels"},
    "DB-MAT-M-STAINLESS": {"category": "MATERIALS", "records": 100, "desc": "Stainless steels"},
    "DB-MAT-K-CAST": {"category": "MATERIALS", "records": 60, "desc": "Cast irons"},
    "DB-MAT-N-NONFERROUS": {"category": "MATERIALS", "records": 200, "desc": "Aluminum, copper, etc."},
    "DB-MAT-S-SUPERALLOY": {"category": "MATERIALS", "records": 100, "desc": "Nickel/cobalt superalloys"},
    "DB-MAT-H-HARDENED": {"category": "MATERIALS", "records": 50, "desc": "Hardened steels"},
    "DB-MAT-X-SPECIALTY": {"category": "MATERIALS", "records": 50, "desc": "Composites, ceramics"},
    "DB-MAT-EXOTIC": {"category": "MATERIALS", "records": 50, "desc": "Exotic materials"},
    "DB-MAT-JOHNSON-COOK": {"category": "MATERIALS", "records": 500, "desc": "Constitutive model params"},
    "DB-MAT-KIENZLE": {"category": "MATERIALS", "records": 1047, "desc": "Cutting force coefficients"},
    "DB-MAT-TAYLOR": {"category": "MATERIALS", "records": 1047, "desc": "Tool life coefficients"},
    "DB-MAT-THERMAL": {"category": "MATERIALS", "records": 1047, "desc": "Thermal properties"},
    "DB-MAT-TRIBOLOGY": {"category": "MATERIALS", "records": 500, "desc": "Friction/wear properties"},
    "DB-MAT-CONDITIONS": {"category": "MATERIALS", "records": 2000, "desc": "Heat treatment conditions"},
    
    # MACHINES (10 databases)
    "DB-MACH-MASTER": {"category": "MACHINES", "records": 824, "params": 85, "desc": "Complete machine library"},
    "DB-MACH-BASIC": {"category": "MACHINES", "records": 824, "desc": "Basic specs"},
    "DB-MACH-CORE": {"category": "MACHINES", "records": 824, "desc": "Core kinematic data"},
    "DB-MACH-ENHANCED": {"category": "MACHINES", "records": 824, "desc": "Enhanced manufacturer specs"},
    "DB-MACH-LEVEL5": {"category": "MACHINES", "records": 100, "desc": "CAD-mapped high-fidelity"},
    "DB-MACH-3D": {"category": "MACHINES", "records": 200, "desc": "3D visualization models"},
    "DB-MACH-KINEMATICS": {"category": "MACHINES", "records": 824, "desc": "Kinematic chains"},
    "DB-MACH-SPINDLE": {"category": "MACHINES", "records": 824, "desc": "Spindle specifications"},
    "DB-MACH-AXIS": {"category": "MACHINES", "records": 824, "desc": "Axis dynamics"},
    "DB-MACH-RIGIDITY": {"category": "MACHINES", "records": 824, "desc": "Machine rigidity data"},
    
    # TOOLS (8 databases)
    "DB-TOOL-MASTER": {"category": "TOOLS", "records": 5000, "params": 85, "desc": "Complete cutting tool library"},
    "DB-TOOL-TYPES": {"category": "TOOLS", "records": 200, "desc": "Tool type definitions"},
    "DB-TOOL-INSERTS": {"category": "TOOLS", "records": 3000, "desc": "Indexable inserts"},
    "DB-TOOL-HOLDERS": {"category": "TOOLS", "records": 1500, "desc": "Tool holders"},
    "DB-TOOL-GEOMETRY": {"category": "TOOLS", "records": 5000, "desc": "Tool geometry params"},
    "DB-TOOL-COATINGS": {"category": "TOOLS", "records": 100, "desc": "Coating specifications"},
    "DB-TOOL-GRADES": {"category": "TOOLS", "records": 500, "desc": "Carbide grades"},
    "DB-TOOL-WEAR": {"category": "TOOLS", "records": 5000, "desc": "Wear characteristics"},
    
    # CONTROLLERS/ALARMS (15 databases)
    "DB-CTRL-MASTER": {"category": "CONTROLLERS", "records": 12, "desc": "Controller families"},
    "DB-ALARM-MASTER": {"category": "ALARMS", "records": 2850, "desc": "Consolidated alarms"},
    "DB-ALARM-FANUC": {"category": "ALARMS", "records": 500, "desc": "FANUC alarms"},
    "DB-ALARM-SIEMENS": {"category": "ALARMS", "records": 400, "desc": "Siemens 840D/828D"},
    "DB-ALARM-HAAS": {"category": "ALARMS", "records": 350, "desc": "HAAS alarms"},
    "DB-ALARM-MAZAK": {"category": "ALARMS", "records": 300, "desc": "Mazak alarms"},
    "DB-ALARM-OKUMA": {"category": "ALARMS", "records": 250, "desc": "Okuma OSP"},
    "DB-ALARM-HEIDENHAIN": {"category": "ALARMS", "records": 200, "desc": "Heidenhain TNC"},
    "DB-ALARM-MITSUBISHI": {"category": "ALARMS", "records": 200, "desc": "Mitsubishi M80/M800"},
    "DB-ALARM-BROTHER": {"category": "ALARMS", "records": 150, "desc": "Brother Speedio"},
    "DB-ALARM-HURCO": {"category": "ALARMS", "records": 150, "desc": "Hurco WinMax"},
    "DB-ALARM-FAGOR": {"category": "ALARMS", "records": 150, "desc": "Fagor 8070"},
    "DB-ALARM-DMG": {"category": "ALARMS", "records": 150, "desc": "DMG MORI CELOS"},
    "DB-ALARM-DOOSAN": {"category": "ALARMS", "records": 150, "desc": "Doosan/DN Solutions"},
    "DB-FIX-PROCEDURES": {"category": "ALARMS", "records": 2850, "desc": "Fix procedures"},
    
    # G-CODES/M-CODES (3 databases)
    "DB-GCODE-MASTER": {"category": "GCODES", "records": 2000, "desc": "Universal G-codes"},
    "DB-MCODE-MASTER": {"category": "GCODES", "records": 500, "desc": "Universal M-codes"},
    "DB-GCODE-CONTROLLER": {"category": "GCODES", "records": 12000, "desc": "Controller-specific"},
    
    # WORKHOLDING/FIXTURES (4 databases)
    "DB-FIXTURE-MASTER": {"category": "WORKHOLDING", "records": 500, "desc": "Fixture types"},
    "DB-WORKHOLD-MASTER": {"category": "WORKHOLDING", "records": 300, "desc": "Chucks/vises/clamps"},
    "DB-CHUCK-DATABASE": {"category": "WORKHOLDING", "records": 200, "desc": "Chuck specifications"},
    "DB-VISE-DATABASE": {"category": "WORKHOLDING", "records": 150, "desc": "Vise specifications"},
    
    # BUSINESS/COST (5 databases)
    "DB-COST-MASTER": {"category": "BUSINESS", "records": 1000, "desc": "Complete cost data"},
    "DB-COST-MACHINE": {"category": "BUSINESS", "records": 824, "desc": "Machine rates"},
    "DB-COST-TOOL": {"category": "BUSINESS", "records": 5000, "desc": "Tool costs"},
    "DB-COST-LABOR": {"category": "BUSINESS", "records": 100, "desc": "Labor rates"},
    "DB-COST-OVERHEAD": {"category": "BUSINESS", "records": 50, "desc": "Overhead costs"},
    
    # CATALOGS (4 databases)
    "DB-CATALOG-SANDVIK": {"category": "CATALOGS", "records": 5000, "desc": "Sandvik catalog"},
    "DB-CATALOG-KENNAMETAL": {"category": "CATALOGS", "records": 4000, "desc": "Kennametal catalog"},
    "DB-CATALOG-ISCAR": {"category": "CATALOGS", "records": 4000, "desc": "Iscar catalog"},
    "DB-CATALOG-CONSOLIDATED": {"category": "CATALOGS", "records": 15000, "desc": "All manufacturers"},
    
    # CONSTANTS/UNITS (4 databases)
    "DB-CONST-PHYSICAL": {"category": "CONSTANTS", "records": 200, "desc": "Physical constants"},
    "DB-CONST-ENGINEERING": {"category": "CONSTANTS", "records": 300, "desc": "Engineering constants"},
    "DB-UNITS-MASTER": {"category": "UNITS", "records": 200, "desc": "Unit systems"},
    "DB-UNITS-CONVERSION": {"category": "UNITS", "records": 1000, "desc": "Conversion factors"},
    
    # KNOWLEDGE BASES (10 databases)
    "DB-KB-ALGORITHMS": {"category": "KNOWLEDGE", "records": 500, "desc": "Algorithm definitions"},
    "DB-KB-DATA-STRUCT": {"category": "KNOWLEDGE", "records": 200, "desc": "Data structures"},
    "DB-KB-AI-ML": {"category": "KNOWLEDGE", "records": 300, "desc": "AI/ML architectures"},
    "DB-KB-MFG": {"category": "KNOWLEDGE", "records": 400, "desc": "Manufacturing knowledge"},
    "DB-KB-COURSES": {"category": "KNOWLEDGE", "records": 220, "desc": "MIT/Stanford courses"},
    "DB-KB-GRAPH": {"category": "KNOWLEDGE", "records": 10000, "desc": "Knowledge graph"},
    "DB-KB-PHYSICS": {"category": "KNOWLEDGE", "records": 500, "desc": "Physics knowledge"},
    "DB-KB-CAD": {"category": "KNOWLEDGE", "records": 300, "desc": "CAD knowledge"},
    "DB-KB-CAM": {"category": "KNOWLEDGE", "records": 400, "desc": "CAM knowledge"},
    "DB-KB-QUALITY": {"category": "KNOWLEDGE", "records": 200, "desc": "Quality knowledge"},
    
    # ALGORITHMS (6 databases)
    "DB-ALG-MASTER": {"category": "ALGORITHMS", "records": 200, "desc": "Core algorithms"},
    "DB-ALG-TOOLPATH": {"category": "ALGORITHMS", "records": 100, "desc": "Toolpath algorithms"},
    "DB-ALG-OPTIMIZATION": {"category": "ALGORITHMS", "records": 50, "desc": "Optimization algorithms"},
    "DB-ALG-MANUFACTURING": {"category": "ALGORITHMS", "records": 80, "desc": "MFG algorithms"},
    "DB-ALG-AI-ML": {"category": "ALGORITHMS", "records": 100, "desc": "AI/ML algorithms"},
    "DB-ALG-SIGNAL": {"category": "ALGORITHMS", "records": 50, "desc": "Signal processing"},
    
    # SIMULATION (4 databases)
    "DB-SIM-STOCK": {"category": "SIMULATION", "records": 100, "desc": "Stock definitions"},
    "DB-SIM-COLLISION": {"category": "SIMULATION", "records": 50, "desc": "Collision data"},
    "DB-SIM-KINEMATICS": {"category": "SIMULATION", "records": 824, "desc": "Kinematic simulation"},
    "DB-SIM-VERIFICATION": {"category": "SIMULATION", "records": 200, "desc": "Verification data"},
    
    # POST PROCESSOR (4 databases)
    "DB-POST-MASTER": {"category": "POST", "records": 200, "desc": "Post processor library"},
    "DB-POST-TEMPLATES": {"category": "POST", "records": 100, "desc": "Post templates"},
    "DB-POST-CONTROLLER": {"category": "POST", "records": 12, "desc": "Controller posts"},
    "DB-POST-CUSTOMIZATION": {"category": "POST", "records": 500, "desc": "Custom posts"},
    
    # COOLANT (3 databases)
    "DB-COOLANT-MASTER": {"category": "COOLANT", "records": 100, "desc": "Coolant types"},
    "DB-COOLANT-TYPES": {"category": "COOLANT", "records": 50, "desc": "Coolant categories"},
    "DB-COOLANT-COMPAT": {"category": "COOLANT", "records": 1000, "desc": "Material compatibility"},
    
    # QUALITY/METROLOGY (4 databases)
    "DB-QUALITY-STANDARDS": {"category": "QUALITY", "records": 100, "desc": "Quality standards"},
    "DB-QUALITY-TOLERANCES": {"category": "QUALITY", "records": 500, "desc": "Tolerance grades"},
    "DB-METROLOGY-INSTRUMENTS": {"category": "QUALITY", "records": 200, "desc": "Measurement instruments"},
    "DB-METROLOGY-METHODS": {"category": "QUALITY", "records": 100, "desc": "Inspection methods"},
}

# Calculate totals
total_dbs = len(DATABASES)
total_records = sum(d.get("records", 0) for d in DATABASES.values())

# Group by category
by_category = {}
for db_id, db in DATABASES.items():
    cat = db["category"]
    if cat not in by_category:
        by_category[cat] = {"count": 0, "records": 0, "databases": []}
    by_category[cat]["count"] += 1
    by_category[cat]["records"] += db.get("records", 0)
    by_category[cat]["databases"].append(db_id)

# Build registry
registry = {
    "version": "2.0.0",
    "generatedAt": datetime.now().isoformat(),
    "totalDatabases": total_dbs,
    "totalRecords": total_records,
    "databases": DATABASES,
    "categories": by_category,
}

# Save
output_path = r"C:\PRISM\registries\DATABASE_REGISTRY.json"
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(registry, f, indent=2)

print("=" * 60)
print("DATABASE REGISTRY v2.0")
print("=" * 60)
print(f"\nTotal Databases: {total_dbs}")
print(f"Total Records: {total_records:,}")
print(f"\nBy Category:")
for cat, info in sorted(by_category.items()):
    print(f"  {cat:15} {info['count']:>3} DBs, {info['records']:>8,} records")
print(f"\nSaved: {output_path}")
