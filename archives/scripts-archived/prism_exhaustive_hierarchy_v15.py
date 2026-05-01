#!/usr/bin/env python3
"""
PRISM EXHAUSTIVE COMPLETE HIERARCHY v15.0
==========================================
GOLDEN RULE: IF IT CAN BE USED, USE IT!

ALL resources, ALL connections, ALL cross-layer wiring.
"""

import json
import os
from datetime import datetime
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

REGISTRIES_PATH = r"C:\PRISM\registries"

# ═══════════════════════════════════════════════════════════════════════════════
# COMPLETE DATABASE INVENTORY (Expanded from file scan)
# ═══════════════════════════════════════════════════════════════════════════════

DATABASES = {
    # ─────────────────────────────────────────────────────────────────────────────
    # MATERIALS (8 + sub-databases = 15)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-MAT-MASTER": {"category": "MATERIALS", "records": 1047, "params": 127},
    "DB-MAT-P-STEELS": {"category": "MATERIALS", "records": 400},
    "DB-MAT-M-STAINLESS": {"category": "MATERIALS", "records": 100},
    "DB-MAT-K-CAST": {"category": "MATERIALS", "records": 60},
    "DB-MAT-N-NONFERROUS": {"category": "MATERIALS", "records": 200},
    "DB-MAT-S-SUPERALLOY": {"category": "MATERIALS", "records": 100},
    "DB-MAT-H-HARDENED": {"category": "MATERIALS", "records": 50},
    "DB-MAT-X-SPECIALTY": {"category": "MATERIALS", "records": 50},
    "DB-MAT-EXOTIC": {"category": "MATERIALS", "records": 50},
    "DB-MAT-JOHNSON-COOK": {"category": "MATERIALS", "records": 500},
    "DB-MAT-KIENZLE": {"category": "MATERIALS", "records": 1047},
    "DB-MAT-TAYLOR": {"category": "MATERIALS", "records": 1047},
    "DB-MAT-THERMAL": {"category": "MATERIALS", "records": 1047},
    "DB-MAT-TRIBOLOGY": {"category": "MATERIALS", "records": 500},
    "DB-MAT-CONDITIONS": {"category": "MATERIALS", "records": 2000},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # MACHINES (10 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-MACH-MASTER": {"category": "MACHINES", "records": 824, "params": 85},
    "DB-MACH-BASIC": {"category": "MACHINES", "records": 824},
    "DB-MACH-CORE": {"category": "MACHINES", "records": 824},
    "DB-MACH-ENHANCED": {"category": "MACHINES", "records": 824},
    "DB-MACH-LEVEL5": {"category": "MACHINES", "records": 100},
    "DB-MACH-3D": {"category": "MACHINES", "records": 200},
    "DB-MACH-KINEMATICS": {"category": "MACHINES", "records": 824},
    "DB-MACH-SPINDLE": {"category": "MACHINES", "records": 824},
    "DB-MACH-AXIS": {"category": "MACHINES", "records": 824},
    "DB-MACH-RIGIDITY": {"category": "MACHINES", "records": 824},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # TOOLS (8 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-TOOL-MASTER": {"category": "TOOLS", "records": 5000, "params": 85},
    "DB-TOOL-TYPES": {"category": "TOOLS", "records": 200},
    "DB-TOOL-INSERTS": {"category": "TOOLS", "records": 3000},
    "DB-TOOL-HOLDERS": {"category": "TOOLS", "records": 1500},
    "DB-TOOL-GEOMETRY": {"category": "TOOLS", "records": 5000},
    "DB-TOOL-COATINGS": {"category": "TOOLS", "records": 100},
    "DB-TOOL-GRADES": {"category": "TOOLS", "records": 500},
    "DB-TOOL-WEAR": {"category": "TOOLS", "records": 5000},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # CONTROLLERS/ALARMS (15 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-CTRL-MASTER": {"category": "CONTROLLERS", "records": 12},
    "DB-ALARM-MASTER": {"category": "ALARMS", "records": 2850},
    "DB-ALARM-FANUC": {"category": "ALARMS", "records": 500},
    "DB-ALARM-SIEMENS": {"category": "ALARMS", "records": 400},
    "DB-ALARM-HAAS": {"category": "ALARMS", "records": 350},
    "DB-ALARM-MAZAK": {"category": "ALARMS", "records": 300},
    "DB-ALARM-OKUMA": {"category": "ALARMS", "records": 250},
    "DB-ALARM-HEIDENHAIN": {"category": "ALARMS", "records": 200},
    "DB-ALARM-MITSUBISHI": {"category": "ALARMS", "records": 200},
    "DB-ALARM-BROTHER": {"category": "ALARMS", "records": 150},
    "DB-ALARM-HURCO": {"category": "ALARMS", "records": 150},
    "DB-ALARM-FAGOR": {"category": "ALARMS", "records": 150},
    "DB-ALARM-DMG": {"category": "ALARMS", "records": 150},
    "DB-ALARM-DOOSAN": {"category": "ALARMS", "records": 150},
    "DB-FIX-PROCEDURES": {"category": "ALARMS", "records": 2850},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # G-CODES/M-CODES (3 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-GCODE-MASTER": {"category": "GCODES", "records": 2000},
    "DB-MCODE-MASTER": {"category": "GCODES", "records": 500},
    "DB-GCODE-CONTROLLER": {"category": "GCODES", "records": 12000},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # WORKHOLDING/FIXTURES (4 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-FIXTURE-MASTER": {"category": "WORKHOLDING", "records": 500},
    "DB-WORKHOLD-MASTER": {"category": "WORKHOLDING", "records": 300},
    "DB-CHUCK-DATABASE": {"category": "WORKHOLDING", "records": 200},
    "DB-VISE-DATABASE": {"category": "WORKHOLDING", "records": 150},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # BUSINESS/COST (5 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-COST-MASTER": {"category": "BUSINESS", "records": 1000},
    "DB-COST-MACHINE": {"category": "BUSINESS", "records": 824},
    "DB-COST-TOOL": {"category": "BUSINESS", "records": 5000},
    "DB-COST-LABOR": {"category": "BUSINESS", "records": 100},
    "DB-COST-OVERHEAD": {"category": "BUSINESS", "records": 50},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # CATALOGS (4 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-CATALOG-SANDVIK": {"category": "CATALOGS", "records": 5000},
    "DB-CATALOG-KENNAMETAL": {"category": "CATALOGS", "records": 4000},
    "DB-CATALOG-ISCAR": {"category": "CATALOGS", "records": 4000},
    "DB-CATALOG-CONSOLIDATED": {"category": "CATALOGS", "records": 15000},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # CONSTANTS/UNITS (4 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-CONST-PHYSICAL": {"category": "CONSTANTS", "records": 200},
    "DB-CONST-ENGINEERING": {"category": "CONSTANTS", "records": 300},
    "DB-UNITS-MASTER": {"category": "UNITS", "records": 200},
    "DB-UNITS-CONVERSION": {"category": "UNITS", "records": 1000},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # KNOWLEDGE BASES (10 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-KB-ALGORITHMS": {"category": "KNOWLEDGE", "records": 500},
    "DB-KB-DATA-STRUCT": {"category": "KNOWLEDGE", "records": 200},
    "DB-KB-AI-ML": {"category": "KNOWLEDGE", "records": 300},
    "DB-KB-MFG": {"category": "KNOWLEDGE", "records": 400},
    "DB-KB-COURSES": {"category": "KNOWLEDGE", "records": 220},
    "DB-KB-GRAPH": {"category": "KNOWLEDGE", "records": 10000},
    "DB-KB-PHYSICS": {"category": "KNOWLEDGE", "records": 500},
    "DB-KB-CAD": {"category": "KNOWLEDGE", "records": 300},
    "DB-KB-CAM": {"category": "KNOWLEDGE", "records": 400},
    "DB-KB-QUALITY": {"category": "KNOWLEDGE", "records": 200},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # ALGORITHMS (6 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-ALG-MASTER": {"category": "ALGORITHMS", "records": 200},
    "DB-ALG-TOOLPATH": {"category": "ALGORITHMS", "records": 100},
    "DB-ALG-OPTIMIZATION": {"category": "ALGORITHMS", "records": 50},
    "DB-ALG-MANUFACTURING": {"category": "ALGORITHMS", "records": 80},
    "DB-ALG-AI-ML": {"category": "ALGORITHMS", "records": 100},
    "DB-ALG-SIGNAL": {"category": "ALGORITHMS", "records": 50},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # SIMULATION (4 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-SIM-STOCK": {"category": "SIMULATION", "records": 100},
    "DB-SIM-COLLISION": {"category": "SIMULATION", "records": 50},
    "DB-SIM-KINEMATICS": {"category": "SIMULATION", "records": 824},
    "DB-SIM-VERIFICATION": {"category": "SIMULATION", "records": 200},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # POST PROCESSOR (4 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-POST-MASTER": {"category": "POST", "records": 200},
    "DB-POST-TEMPLATES": {"category": "POST", "records": 100},
    "DB-POST-CONTROLLER": {"category": "POST", "records": 12},
    "DB-POST-CUSTOMIZATION": {"category": "POST", "records": 500},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # COOLANT (3 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-COOLANT-MASTER": {"category": "COOLANT", "records": 100},
    "DB-COOLANT-TYPES": {"category": "COOLANT", "records": 50},
    "DB-COOLANT-COMPATIBILITY": {"category": "COOLANT", "records": 1000},
    
    # ─────────────────────────────────────────────────────────────────────────────
    # QUALITY/METROLOGY (4 databases)
    # ─────────────────────────────────────────────────────────────────────────────
    "DB-QUALITY-STANDARDS": {"category": "QUALITY", "records": 100},
    "DB-QUALITY-TOLERANCES": {"category": "QUALITY", "records": 500},
    "DB-METROLOGY-INSTRUMENTS": {"category": "QUALITY", "records": 200},
    "DB-METROLOGY-METHODS": {"category": "QUALITY", "records": 100},
}

print(f"Total databases: {len(DATABASES)}")
print(f"Total records: {sum(d.get('records', 0) for d in DATABASES.values()):,}")
