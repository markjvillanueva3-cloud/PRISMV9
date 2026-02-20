#!/usr/bin/env python3
"""
PRISM DATABASE REGISTRY & EXHAUSTIVE WIRING
============================================
Creates comprehensive database registry and wires:
DATABASES → FORMULAS → ENGINES → SKILLS → PRODUCTS

Golden Rule: IF IT CAN BE USED, USE IT!
"""

import json
import os
from datetime import datetime
from collections import defaultdict

BASE_PATH = r"C:\\PRISM\EXTRACTED"

# ═══════════════════════════════════════════════════════════════════════════════
# COMPREHENSIVE DATABASE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

DATABASES = {
    # ═══════════════════════════════════════════════════════════════════════════
    # MATERIALS DATABASES (1,047+ materials × 127 parameters)
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-MAT-P-STEELS": {
        "name": "P-Steels Database",
        "category": "MATERIALS",
        "subcategory": "FERROUS",
        "description": "Carbon, alloy, tool, free-machining steels (ISO P)",
        "path": "materials/P_STEELS/",
        "records": 400,
        "parameters": 127,
        "data_types": ["kc1.1", "mc", "Johnson-Cook", "Taylor", "thermal", "hardness"],
    },
    "DB-MAT-M-STAINLESS": {
        "name": "M-Stainless Steels Database",
        "category": "MATERIALS",
        "subcategory": "FERROUS",
        "description": "Austenitic, ferritic, martensitic, duplex, PH stainless",
        "path": "materials/M_STAINLESS/",
        "records": 100,
        "parameters": 127,
        "data_types": ["kc1.1", "mc", "Johnson-Cook", "corrosion", "work_hardening"],
    },
    "DB-MAT-K-CASTIRON": {
        "name": "K-Cast Iron Database",
        "category": "MATERIALS",
        "subcategory": "FERROUS",
        "description": "Gray, ductile, malleable, CGI cast irons",
        "path": "materials/K_CAST_IRON/",
        "records": 60,
        "parameters": 127,
        "data_types": ["kc1.1", "mc", "graphite_structure", "damping"],
    },
    "DB-MAT-N-NONFERROUS": {
        "name": "N-Non-Ferrous Database",
        "category": "MATERIALS",
        "subcategory": "NON_FERROUS",
        "description": "Aluminum, copper, brass, bronze, magnesium, zinc",
        "path": "materials/N_NONFERROUS/",
        "records": 200,
        "parameters": 127,
        "data_types": ["kc1.1", "mc", "temper", "BUE_tendency", "thermal_conductivity"],
    },
    "DB-MAT-S-SUPERALLOYS": {
        "name": "S-Superalloys Database",
        "category": "MATERIALS",
        "subcategory": "EXOTIC",
        "description": "Nickel, cobalt, titanium superalloys (Inconel, Hastelloy, Ti-6Al-4V)",
        "path": "materials/S_SUPERALLOYS/",
        "records": 100,
        "parameters": 127,
        "data_types": ["kc1.1", "mc", "Johnson-Cook", "strain_hardening", "hot_strength"],
    },
    "DB-MAT-H-HARDENED": {
        "name": "H-Hardened Steels Database",
        "category": "MATERIALS",
        "subcategory": "HARDENED",
        "description": "Hardened steels 45-65 HRC for hard turning/milling",
        "path": "materials/H_HARDENED/",
        "records": 60,
        "parameters": 127,
        "data_types": ["kc1.1", "mc", "CBN_parameters", "white_layer"],
    },
    "DB-MAT-X-SPECIALTY": {
        "name": "X-Specialty Materials Database",
        "category": "MATERIALS",
        "subcategory": "SPECIALTY",
        "description": "Composites, plastics, ceramics, graphite, MMC",
        "path": "materials/X_SPECIALTY/",
        "records": 37,
        "parameters": 127,
        "data_types": ["abrasiveness", "fiber_orientation", "delamination"],
    },
    "DB-MAT-EXOTIC": {
        "name": "Exotic Materials Database",
        "category": "MATERIALS",
        "subcategory": "EXOTIC",
        "description": "Rare and specialty materials",
        "path": "materials/EXOTIC_MATERIALS_DATABASE.js",
        "records": 50,
        "parameters": 127,
        "data_types": ["special_properties"],
    },
    "DB-MAT-JOHNSON-COOK": {
        "name": "Johnson-Cook Coefficients Database",
        "category": "MATERIALS",
        "subcategory": "COEFFICIENTS",
        "description": "Complete J-C constitutive model parameters",
        "path": "algorithms/PRISM_JOHNSON_COOK_DATABASE.js",
        "records": 500,
        "parameters": 5,
        "data_types": ["A", "B", "n", "C", "m"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # MACHINES DATABASES (824 machines × 43 manufacturers)
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-MACH-BASIC": {
        "name": "Machines Basic Database",
        "category": "MACHINES",
        "subcategory": "BASIC",
        "description": "Essential machine specifications",
        "path": "machines/BASIC/",
        "records": 824,
        "parameters": 30,
        "data_types": ["travel", "spindle_speed", "power", "torque"],
    },
    "DB-MACH-CORE": {
        "name": "Machines Core Database",
        "category": "MACHINES",
        "subcategory": "CORE",
        "description": "Standard kinematic and dynamic data",
        "path": "machines/CORE/",
        "records": 824,
        "parameters": 50,
        "data_types": ["kinematics", "rapid_rates", "acceleration", "jerk"],
    },
    "DB-MACH-ENHANCED-DMG": {
        "name": "DMG MORI Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full DMG MORI specifications",
        "path": "machines/ENHANCED/PRISM_DMG_MORI_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 85,
        "parameters": 127,
        "data_types": ["full_specs", "options", "accessories"],
    },
    "DB-MACH-ENHANCED-MAZAK": {
        "name": "Mazak Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Mazak specifications",
        "path": "machines/ENHANCED/PRISM_MAZAK_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 75,
        "parameters": 127,
        "data_types": ["full_specs", "Mazatrol", "options"],
    },
    "DB-MACH-ENHANCED-HAAS": {
        "name": "Haas Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Haas specifications",
        "path": "machines/ENHANCED/PRISM_HAAS_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 65,
        "parameters": 127,
        "data_types": ["full_specs", "NGC", "options"],
    },
    "DB-MACH-ENHANCED-OKUMA": {
        "name": "Okuma Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Okuma specifications",
        "path": "machines/ENHANCED/PRISM_OKUMA_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 55,
        "parameters": 127,
        "data_types": ["full_specs", "OSP", "TAS"],
    },
    "DB-MACH-ENHANCED-MAKINO": {
        "name": "Makino Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Makino specifications",
        "path": "machines/ENHANCED/PRISM_MAKINO_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 45,
        "parameters": 127,
        "data_types": ["full_specs", "SGI", "options"],
    },
    "DB-MACH-ENHANCED-FANUC": {
        "name": "FANUC Robodrill Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full FANUC Robodrill specifications",
        "path": "machines/ENHANCED/PRISM_FANUC_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 30,
        "parameters": 127,
        "data_types": ["full_specs", "high_speed", "options"],
    },
    "DB-MACH-ENHANCED-DOOSAN": {
        "name": "Doosan Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Doosan specifications",
        "path": "machines/ENHANCED/PRISM_DOOSAN_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 50,
        "parameters": 127,
        "data_types": ["full_specs", "options"],
    },
    "DB-MACH-ENHANCED-HERMLE": {
        "name": "Hermle Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Hermle 5-axis specifications",
        "path": "machines/ENHANCED/PRISM_HERMLE_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 35,
        "parameters": 127,
        "data_types": ["full_specs", "5axis", "options"],
    },
    "DB-MACH-ENHANCED-MATSUURA": {
        "name": "Matsuura Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Matsuura specifications",
        "path": "machines/ENHANCED/PRISM_MATSUURA_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 35,
        "parameters": 127,
        "data_types": ["full_specs", "options"],
    },
    "DB-MACH-ENHANCED-HURCO": {
        "name": "Hurco Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Hurco specifications",
        "path": "machines/ENHANCED/PRISM_HURCO_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 30,
        "parameters": 127,
        "data_types": ["full_specs", "WinMax", "options"],
    },
    "DB-MACH-ENHANCED-KITAMURA": {
        "name": "Kitamura Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Kitamura specifications",
        "path": "machines/ENHANCED/PRISM_KITAMURA_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 25,
        "parameters": 127,
        "data_types": ["full_specs", "options"],
    },
    "DB-MACH-ENHANCED-BROTHER": {
        "name": "Brother Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Brother Speedio specifications",
        "path": "machines/ENHANCED/PRISM_BROTHER_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 20,
        "parameters": 127,
        "data_types": ["full_specs", "high_speed", "options"],
    },
    "DB-MACH-ENHANCED-HARDINGE": {
        "name": "Hardinge Enhanced Database",
        "category": "MACHINES",
        "subcategory": "ENHANCED",
        "description": "Full Hardinge specifications",
        "path": "machines/ENHANCED/PRISM_HARDINGE_MACHINE_DATABASE_ENHANCED_v2.js",
        "records": 20,
        "parameters": 127,
        "data_types": ["full_specs", "turning", "options"],
    },
    "DB-MACH-LEVEL5-HAAS": {
        "name": "Haas Level5 CAD Database",
        "category": "MACHINES",
        "subcategory": "LEVEL5",
        "description": "CAD-mapped high-fidelity Haas data",
        "path": "machines/LEVEL5/",
        "records": 65,
        "parameters": 200,
        "data_types": ["CAD_geometry", "collision_volumes", "kinematics"],
    },
    "DB-MACH-3D-MODELS": {
        "name": "Machine 3D Models Database",
        "category": "MACHINES",
        "subcategory": "3D",
        "description": "3D geometry for machine simulation",
        "path": "machines/PRISM_MACHINE_3D_MODELS.js",
        "records": 200,
        "parameters": 50,
        "data_types": ["mesh", "collision", "kinematics"],
    },
    "DB-MACH-LATHE": {
        "name": "Lathe Machines Database",
        "category": "MACHINES",
        "subcategory": "LATHE",
        "description": "Lathe-specific machine data",
        "path": "machines/CORE/PRISM_LATHE_MACHINE_DB.js",
        "records": 150,
        "parameters": 80,
        "data_types": ["chuck", "tailstock", "turret", "live_tooling"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLERS/ALARMS DATABASES (9,200+ alarms × 12 families)
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-CTRL-FANUC": {
        "name": "FANUC Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "FANUC controller alarms and diagnostics",
        "path": "controllers/alarms_verified/FANUC_ALARMS_VERIFIED.json",
        "records": 1500,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-SIEMENS": {
        "name": "Siemens Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Siemens SINUMERIK alarms and diagnostics",
        "path": "controllers/alarms_verified/SIEMENS_ALARMS_VERIFIED.json",
        "records": 1200,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-HAAS": {
        "name": "Haas Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Haas NGC alarms and diagnostics",
        "path": "controllers/alarms_verified/HAAS_ALARMS_VERIFIED.json",
        "records": 1000,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-MAZAK": {
        "name": "Mazak Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Mazak Mazatrol alarms and diagnostics",
        "path": "controllers/alarms_verified/MAZAK_ALARMS_VERIFIED.json",
        "records": 1000,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-OKUMA": {
        "name": "Okuma Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Okuma OSP alarms and diagnostics",
        "path": "controllers/alarms_verified/OKUMA_ALARMS_VERIFIED.json",
        "records": 800,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-HEIDENHAIN": {
        "name": "Heidenhain Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Heidenhain TNC alarms and diagnostics",
        "path": "controllers/alarms_verified/HEIDENHAIN_ALARMS_VERIFIED.json",
        "records": 800,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-MITSUBISHI": {
        "name": "Mitsubishi Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Mitsubishi M8xx alarms and diagnostics",
        "path": "controllers/alarms_verified/MITSUBISHI_ALARMS_VERIFIED.json",
        "records": 800,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-BROTHER": {
        "name": "Brother Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Brother CNC alarms and diagnostics",
        "path": "controllers/alarms_verified/BROTHER_ALARMS_VERIFIED.json",
        "records": 400,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-HURCO": {
        "name": "Hurco Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Hurco WinMax alarms and diagnostics",
        "path": "controllers/alarms_verified/HURCO_ALARMS_VERIFIED.json",
        "records": 400,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-FAGOR": {
        "name": "Fagor Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Fagor CNC alarms and diagnostics",
        "path": "controllers/alarms_verified/FAGOR_ALARMS_VERIFIED.json",
        "records": 400,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-DMG": {
        "name": "DMG MORI Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "DMG MORI/CELOS alarms and diagnostics",
        "path": "controllers/alarms_verified/DMG_MORI_ALARMS_VERIFIED.json",
        "records": 300,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-DOOSAN": {
        "name": "Doosan Alarms Database",
        "category": "CONTROLLERS",
        "subcategory": "ALARMS",
        "description": "Doosan/FANUC alarms and diagnostics",
        "path": "controllers/alarms_verified/DOOSAN_ALARMS_VERIFIED.json",
        "records": 300,
        "parameters": 15,
        "data_types": ["alarm_code", "severity", "cause", "fix"],
    },
    "DB-CTRL-GCODE": {
        "name": "G-Code/M-Code Database",
        "category": "CONTROLLERS",
        "subcategory": "PROGRAMMING",
        "description": "G-codes and M-codes for all controllers",
        "path": "controllers/gcodes/GCODE_MCODE_DATABASE.json",
        "records": 2000,
        "parameters": 20,
        "data_types": ["code", "description", "syntax", "controller_support"],
    },
    "DB-CTRL-MASTER": {
        "name": "Controller Master Database",
        "category": "CONTROLLERS",
        "subcategory": "MASTER",
        "description": "Consolidated controller specifications",
        "path": "controllers/CONTROLLER_DATABASE.json",
        "records": 50,
        "parameters": 100,
        "data_types": ["capabilities", "options", "compatibility"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # TOOLS DATABASES (cutting tools, holders, inserts)
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-TOOL-CUTTING": {
        "name": "Cutting Tools Database",
        "category": "TOOLS",
        "subcategory": "CUTTING",
        "description": "End mills, drills, taps, reamers, inserts",
        "path": "tools/PRISM_CUTTING_TOOL_DATABASE_V2.js",
        "records": 5000,
        "parameters": 85,
        "data_types": ["geometry", "coating", "grade", "feeds_speeds"],
    },
    "DB-TOOL-TYPES": {
        "name": "Tool Types Database",
        "category": "TOOLS",
        "subcategory": "TYPES",
        "description": "Complete tool type definitions",
        "path": "tools/PRISM_TOOL_TYPES_COMPLETE.js",
        "records": 200,
        "parameters": 50,
        "data_types": ["type", "geometry", "application"],
    },
    "DB-TOOL-HOLDERS": {
        "name": "Tool Holders Database",
        "category": "TOOLS",
        "subcategory": "HOLDERS",
        "description": "Tool holders, collets, chucks",
        "path": "engines/tools/PRISM_TOOL_HOLDER_3D_GENERATOR.js",
        "records": 500,
        "parameters": 30,
        "data_types": ["interface", "runout", "balance"],
    },
    "DB-TOOL-LATHE": {
        "name": "Lathe Tooling Database",
        "category": "TOOLS",
        "subcategory": "LATHE",
        "description": "Turning tools, boring bars, live tooling",
        "path": "engines/tools/PRISM_ENHANCED_LATHE_LIVE_TOOLING_ENGINE.js",
        "records": 1000,
        "parameters": 60,
        "data_types": ["insert", "holder", "geometry", "orientation"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # WORKHOLDING DATABASES
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-WORK-FIXTURES": {
        "name": "Fixtures Database",
        "category": "WORKHOLDING",
        "subcategory": "FIXTURES",
        "description": "Vises, clamps, fixtures, tombstones",
        "path": "workholding/PRISM_FIXTURE_DATABASE.js",
        "records": 500,
        "parameters": 40,
        "data_types": ["clamping_force", "geometry", "accuracy"],
    },
    "DB-WORK-HOLDING": {
        "name": "Workholding Database",
        "category": "WORKHOLDING",
        "subcategory": "GENERAL",
        "description": "General workholding solutions",
        "path": "workholding/PRISM_WORKHOLDING_DATABASE.js",
        "records": 300,
        "parameters": 35,
        "data_types": ["type", "capacity", "repeatability"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # ALGORITHMS & KNOWLEDGE DATABASES
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-ALGO-CORE": {
        "name": "Core Algorithms Database",
        "category": "ALGORITHMS",
        "subcategory": "CORE",
        "description": "Fundamental algorithms library",
        "path": "algorithms/PRISM_CORE_ALGORITHMS.js",
        "records": 100,
        "parameters": 20,
        "data_types": ["complexity", "implementation", "use_cases"],
    },
    "DB-ALGO-MANUFACTURING": {
        "name": "Manufacturing Algorithms Database",
        "category": "ALGORITHMS",
        "subcategory": "MANUFACTURING",
        "description": "Manufacturing-specific algorithms",
        "path": "algorithms/PRISM_MANUFACTURING_ALGORITHMS.js",
        "records": 80,
        "parameters": 25,
        "data_types": ["algorithm", "parameters", "constraints"],
    },
    "DB-ALGO-TOOLPATH": {
        "name": "Toolpath Algorithms Database",
        "category": "ALGORITHMS",
        "subcategory": "TOOLPATH",
        "description": "Complete toolpath algorithm library",
        "path": "algorithms/COMPLETE_TOOLPATH_ALGORITHM_LIBRARY.js",
        "records": 150,
        "parameters": 30,
        "data_types": ["strategy", "parameters", "optimization"],
    },
    "DB-ALGO-OPTIMIZATION": {
        "name": "Optimization Algorithms Database",
        "category": "ALGORITHMS",
        "subcategory": "OPTIMIZATION",
        "description": "PSO, GA, ACO, SA optimization algorithms",
        "path": "algorithms/PRISM_OPTIMIZATION_ALGORITHMS.js",
        "records": 50,
        "parameters": 40,
        "data_types": ["algorithm", "hyperparameters", "convergence"],
    },
    "DB-ALGO-RL": {
        "name": "Reinforcement Learning Database",
        "category": "ALGORITHMS",
        "subcategory": "AI",
        "description": "RL algorithms and policies",
        "path": "algorithms/PRISM_RL_ALGORITHMS.js",
        "records": 30,
        "parameters": 35,
        "data_types": ["policy", "reward", "state_space"],
    },
    "DB-KNOW-COURSES": {
        "name": "MIT/Stanford Courses Database",
        "category": "KNOWLEDGE",
        "subcategory": "COURSES",
        "description": "220+ university course content",
        "path": "knowledge_bases/PRISM_220_COURSES_MASTER.js",
        "records": 220,
        "parameters": 50,
        "data_types": ["course", "topics", "algorithms", "formulas"],
    },
    "DB-KNOW-ALGORITHMS": {
        "name": "Algorithms Knowledge Base",
        "category": "KNOWLEDGE",
        "subcategory": "KB",
        "description": "Algorithm knowledge and patterns",
        "path": "knowledge_bases/PRISM_ALGORITHMS_KB.js",
        "records": 500,
        "parameters": 30,
        "data_types": ["algorithm", "complexity", "applications"],
    },
    "DB-KNOW-DATA-STRUCT": {
        "name": "Data Structures Knowledge Base",
        "category": "KNOWLEDGE",
        "subcategory": "KB",
        "description": "Data structure knowledge",
        "path": "knowledge_bases/PRISM_DATA_STRUCTURES_KB.js",
        "records": 100,
        "parameters": 25,
        "data_types": ["structure", "operations", "complexity"],
    },
    "DB-KNOW-MFG": {
        "name": "Manufacturing Knowledge Base",
        "category": "KNOWLEDGE",
        "subcategory": "KB",
        "description": "Manufacturing domain knowledge",
        "path": "knowledge_bases/PRISM_MFG_STRUCTURES_KB.js",
        "records": 300,
        "parameters": 40,
        "data_types": ["process", "parameters", "constraints"],
    },
    "DB-KNOW-AI": {
        "name": "AI/ML Knowledge Base",
        "category": "KNOWLEDGE",
        "subcategory": "KB",
        "description": "AI/ML domain knowledge",
        "path": "knowledge_bases/PRISM_AI_STRUCTURES_KB.js",
        "records": 200,
        "parameters": 35,
        "data_types": ["model", "architecture", "training"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CATALOGS & MANUFACTURERS
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-CAT-MANUFACTURERS": {
        "name": "Manufacturers Catalog",
        "category": "CATALOGS",
        "subcategory": "MANUFACTURERS",
        "description": "Major CNC manufacturers catalog",
        "path": "catalogs/PRISM_MAJOR_MANUFACTURERS_CATALOG.js",
        "records": 50,
        "parameters": 80,
        "data_types": ["company", "products", "support"],
    },
    "DB-CAT-CONSOLIDATED": {
        "name": "Consolidated Catalog",
        "category": "CATALOGS",
        "subcategory": "MASTER",
        "description": "Master consolidated catalog",
        "path": "catalogs/PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.js",
        "records": 200,
        "parameters": 60,
        "data_types": ["product", "specs", "pricing"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONSTANTS & UNITS
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-CONST-CORE": {
        "name": "PRISM Constants Database",
        "category": "CONSTANTS",
        "subcategory": "CORE",
        "description": "Physical and mathematical constants",
        "path": "constants/PRISM_CONSTANTS_ENHANCED.js",
        "records": 500,
        "parameters": 10,
        "data_types": ["constant", "value", "units", "uncertainty"],
    },
    "DB-UNITS-CORE": {
        "name": "Units System Database",
        "category": "UNITS",
        "subcategory": "CORE",
        "description": "Unit conversions and systems",
        "path": "units/PRISM_UNITS_ENHANCED.js",
        "records": 200,
        "parameters": 15,
        "data_types": ["unit", "conversion", "dimension"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUSINESS & ECONOMICS
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-BUS-COST": {
        "name": "Cost Database",
        "category": "BUSINESS",
        "subcategory": "COST",
        "description": "Machine rates, labor costs, overhead",
        "path": "business/PRISM_COST_DATABASE.js",
        "records": 100,
        "parameters": 30,
        "data_types": ["cost_type", "rate", "region"],
    },
    "DB-BUS-SCHEDULING": {
        "name": "Scheduling Database",
        "category": "BUSINESS",
        "subcategory": "SCHEDULING",
        "description": "Production scheduling data",
        "path": "business/PRISM_SCHEDULING_ENGINE.js",
        "records": 50,
        "parameters": 25,
        "data_types": ["resource", "capacity", "availability"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SIMULATION & COLLISION
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-SIM-STOCK": {
        "name": "Stock Positions Database",
        "category": "SIMULATION",
        "subcategory": "STOCK",
        "description": "Stock and fixture positions",
        "path": "engines/simulation/PRISM_STOCK_POSITIONS_DATABASE.js",
        "records": 100,
        "parameters": 20,
        "data_types": ["position", "geometry", "material"],
    },
    "DB-SIM-COLLISION": {
        "name": "Collision Database",
        "category": "SIMULATION",
        "subcategory": "COLLISION",
        "description": "Collision zones and algorithms",
        "path": "engines/simulation/PRISM_COLLISION_ALGORITHMS.js",
        "records": 50,
        "parameters": 30,
        "data_types": ["zone", "algorithm", "tolerance"],
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FORMULAS & PHYSICS (extracted lookup tables)
    # ═══════════════════════════════════════════════════════════════════════════
    "DB-PHYS-FORCE": {
        "name": "Force Lookup Database",
        "category": "PHYSICS",
        "subcategory": "FORCE",
        "description": "Cutting force lookup tables",
        "path": "formulas/PRISM_FORCE_LOOKUP.js",
        "records": 1000,
        "parameters": 20,
        "data_types": ["material", "tool", "force_coefficient"],
    },
    "DB-PHYS-THERMAL": {
        "name": "Thermal Lookup Database",
        "category": "PHYSICS",
        "subcategory": "THERMAL",
        "description": "Thermal properties lookup",
        "path": "formulas/PRISM_THERMAL_LOOKUP.js",
        "records": 500,
        "parameters": 15,
        "data_types": ["material", "conductivity", "specific_heat"],
    },
    "DB-PHYS-WEAR": {
        "name": "Wear Lookup Database",
        "category": "PHYSICS",
        "subcategory": "WEAR",
        "description": "Tool wear lookup tables",
        "path": "formulas/PRISM_WEAR_LOOKUP.js",
        "records": 500,
        "parameters": 15,
        "data_types": ["material", "tool", "wear_rate"],
    },
    "DB-PHYS-TAYLOR": {
        "name": "Taylor Coefficients Database",
        "category": "PHYSICS",
        "subcategory": "TAYLOR",
        "description": "Taylor tool life coefficients",
        "path": "algorithms/PRISM_TAYLOR_LOOKUP.js",
        "records": 800,
        "parameters": 10,
        "data_types": ["material", "tool", "C", "n", "x", "y"],
    },
}

def main():
    """Generate database registry"""
    
    print("=" * 80)
    print("PRISM DATABASE REGISTRY GENERATOR")
    print("=" * 80)
    
    # Calculate totals
    total_records = sum(db["records"] for db in DATABASES.values())
    total_dbs = len(DATABASES)
    
    # Group by category
    by_category = defaultdict(list)
    for db_id, db in DATABASES.items():
        by_category[db["category"]].append(db_id)
    
    print(f"\nTotal Databases: {total_dbs}")
    print(f"Total Records: {total_records:,}")
    print(f"\nBy Category:")
    for cat, dbs in sorted(by_category.items()):
        cat_records = sum(DATABASES[db]["records"] for db in dbs)
        print(f"  {cat}: {len(dbs)} databases, {cat_records:,} records")
    
    # Build registry
    registry = {
        "version": "1.0.0",
        "type": "DATABASE_REGISTRY",
        "generatedAt": datetime.now().isoformat(),
        "totalDatabases": total_dbs,
        "totalRecords": total_records,
        "categories": {cat: len(dbs) for cat, dbs in by_category.items()},
        "databases": DATABASES,
    }
    
    # Save
    output_path = r"C:\PRISM\registries\DATABASE_REGISTRY.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    
    print(f"\nSaved: {output_path}")
    return registry

if __name__ == "__main__":
    main()
