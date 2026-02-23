#!/usr/bin/env python3
"""
PRISM ARCHITECTURE v16.0 - BUILDER PART 2
=========================================
PRECISE WIRING (5-15 per formula, NOT 245)
"""

import json
import os
from datetime import datetime
from collections import defaultdict

REG_PATH = r"C:\PRISM\registries"

# Load registries
def load_registry(name):
    path = os.path.join(REG_PATH, name)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

formula_reg = load_registry("FORMULA_REGISTRY.json")
engine_reg = load_registry("ENGINE_REGISTRY.json")

formulas = formula_reg.get("formulas", []) if formula_reg else []
engines = engine_reg.get("engines", []) if engine_reg else []

print("\n[4/10] Building PRECISE Formula-Engine Wiring...")
print(f"   Source: {len(formulas)} formulas, {len(engines)} engines")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# PRECISE WIRING RULES
# Each formula connects to 5-15 SPECIFIC engines, not category-bulk
# ═══════════════════════════════════════════════════════════════════════════════════════════════════

# Build engine index by category and subcategory
engine_index = defaultdict(list)
for e in engines:
    eid = e.get("id", "")
    cat = e.get("category", "")
    subcat = e.get("subcategory", "")
    engine_index[cat].append(eid)
    engine_index[f"{cat}/{subcat}"].append(eid)

# Define PRECISE mappings based on formula semantics
PRECISE_FORMULA_ENGINE_RULES = {
    # ─────────────────────────────────────────────────────────────────────────────
    # CUTTING FORCE formulas (F-CUT-*) -> Force-related engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-CUT": {
        "primary_engines": [
            "FORCE_CALCULATION",      # Direct force computation
            "POWER_CALCULATION",      # Derived power
            "CUTTING_MECHANICS",      # Mechanics basis
        ],
        "secondary_engines": [
            "CHIP_FORMATION",         # Chip affects force
            "MATERIAL_PROPERTIES",    # Material inputs
            "SAFETY_CHECK",           # Force safety
        ],
        "optional_engines": [
            "VIBRATION_PREDICTION",   # Force causes vibration
            "TOOL_DEFLECTION",        # Force causes deflection
            "THERMAL_PREDICTION",     # Force generates heat
        ],
        "max_connections": 12,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # THERMAL formulas (F-THERM-*) -> Thermal-related engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-THERM": {
        "primary_engines": [
            "THERMAL_MODELING",       # Heat distribution
            "TEMPERATURE_PREDICTION", # Temperature calculation
            "HEAT_GENERATION",        # Heat sources
        ],
        "secondary_engines": [
            "COOLANT_MODELING",       # Coolant effects
            "MATERIAL_THERMAL",       # Material thermal props
            "TOOL_THERMAL",           # Tool thermal behavior
        ],
        "optional_engines": [
            "FEM_THERMAL",            # FEM for complex geometry
            "WEAR_THERMAL",           # Thermal affects wear
        ],
        "max_connections": 10,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # WEAR/TOOL LIFE formulas (F-WEAR-*, F-TAYLOR-*) -> Wear engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-WEAR": {
        "primary_engines": [
            "TOOL_LIFE_PREDICTION",   # Core prediction
            "WEAR_MODELING",          # Wear mechanisms
            "TAYLOR_TOOL_LIFE",       # Taylor equation
        ],
        "secondary_engines": [
            "COST_OPTIMIZATION",      # Tool cost
            "TOOL_CHANGE_PLANNING",   # When to change
            "THERMAL_WEAR",           # Thermal effects on wear
        ],
        "optional_engines": [
            "COATING_WEAR",           # Coating effects
            "DIFFUSION_WEAR",         # High temp mechanism
        ],
        "max_connections": 10,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # VIBRATION formulas (F-VIB-*, F-CHATTER-*) -> Vibration engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-VIB": {
        "primary_engines": [
            "STABILITY_ANALYSIS",     # Chatter stability
            "MODAL_ANALYSIS",         # FRF
            "STABILITY_LOBE",         # SLD generation
        ],
        "secondary_engines": [
            "MACHINE_DYNAMICS",       # Machine FRF
            "TOOL_DYNAMICS",          # Tool FRF
            "SPINDLE_DYNAMICS",       # Spindle FRF
        ],
        "optional_engines": [
            "DAMPING_PREDICTION",     # Damping effects
            "PROCESS_DAMPING",        # Low speed stability
        ],
        "max_connections": 10,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # SURFACE formulas (F-SURF-*, F-RA-*) -> Surface engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-SURF": {
        "primary_engines": [
            "SURFACE_ROUGHNESS",      # Ra calculation
            "SURFACE_PREDICTION",     # Actual prediction
            "SURFACE_ANALYSIS",       # Analysis
        ],
        "secondary_engines": [
            "TOOL_GEOMETRY",          # Nose radius effect
            "VIBRATION_EFFECT",       # Vibration on surface
            "BUE_PREDICTION",         # Built-up edge
        ],
        "optional_engines": [
            "RESIDUAL_STRESS",        # Surface integrity
        ],
        "max_connections": 8,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # POWER formulas (F-POWER-*, F-MRR-*) -> Power engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-POWER": {
        "primary_engines": [
            "POWER_CALCULATION",      # Cutting power
            "SPINDLE_POWER",          # Spindle analysis
            "ENERGY_CONSUMPTION",     # Energy tracking
        ],
        "secondary_engines": [
            "EFFICIENCY_ANALYSIS",    # Machine efficiency
            "SUSTAINABILITY",         # Energy sustainability
        ],
        "optional_engines": [
            "COST_ANALYSIS",          # Energy cost
        ],
        "max_connections": 8,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # MATERIAL formulas (F-MAT-*, F-JC-*) -> Material engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-MAT": {
        "primary_engines": [
            "MATERIAL_PROPERTIES",    # Property lookup
            "CONSTITUTIVE_MODEL",     # JC, ZA models
            "MACHINABILITY",          # Machinability rating
        ],
        "secondary_engines": [
            "HARDNESS_CONVERSION",    # Hardness scales
            "STRENGTH_ESTIMATION",    # Estimate from hardness
        ],
        "optional_engines": [
            "HEAT_TREATMENT",         # Heat treat effects
        ],
        "max_connections": 8,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # GEOMETRY formulas (F-GEOM-*) -> CAD engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-GEOM": {
        "primary_engines": [
            "GEOMETRY_ANALYSIS",      # Geometric analysis
            "FEATURE_RECOGNITION",    # Feature detection
            "SURFACE_MODELING",       # Surface math
        ],
        "secondary_engines": [
            "TOLERANCE_ANALYSIS",     # Tolerance stack
            "INTERSECTION",           # Geometric intersection
        ],
        "max_connections": 8,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # OPTIMIZATION formulas (F-OPT-*) -> Optimization engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-OPT": {
        "primary_engines": [
            "PSO_OPTIMIZER",          # Swarm optimization
            "GA_OPTIMIZER",           # Genetic algorithm
            "GRADIENT_OPTIMIZER",     # Gradient descent
        ],
        "secondary_engines": [
            "MULTI_OBJECTIVE",        # NSGA-II, MOEA/D
            "CONSTRAINT_HANDLER",     # Constraint handling
        ],
        "max_connections": 8,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # AI/ML formulas (F-AI-*, F-ML-*) -> AI engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-AI": {
        "primary_engines": [
            "NEURAL_NETWORK",         # NN-based prediction
            "RANDOM_FOREST",          # Ensemble
            "GAUSSIAN_PROCESS",       # GP regression
        ],
        "secondary_engines": [
            "FEATURE_ENGINEERING",    # Feature creation
            "MODEL_TRAINING",         # Training engine
            "PREDICTION_ENGINE",      # Inference
        ],
        "max_connections": 10,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # QUALITY formulas (F-QUAL-*, F-OMEGA-*) -> Quality engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-QUAL": {
        "primary_engines": [
            "QUALITY_CALCULATION",    # Quality metrics
            "SPC_ENGINE",             # Statistical process control
            "CAPABILITY_ANALYSIS",    # Cpk, Ppk
        ],
        "secondary_engines": [
            "VALIDATION_ENGINE",      # Validation
            "SAFETY_CHECK",           # Safety validation
        ],
        "max_connections": 8,
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # ECONOMICS formulas (F-COST-*, F-ECON-*) -> Cost engines
    # ─────────────────────────────────────────────────────────────────────────────
    "F-COST": {
        "primary_engines": [
            "COST_CALCULATION",       # Cost per part
            "CYCLE_TIME",             # Time estimation
            "TOOL_COST",              # Tool economics
        ],
        "secondary_engines": [
            "MACHINE_RATE",           # Machine cost
            "LABOR_COST",             # Labor estimation
        ],
        "max_connections": 8,
    },
}

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# BUILD PRECISE WIRING
# ═══════════════════════════════════════════════════════════════════════════════════════════════════

def find_matching_engines(pattern, engine_list):
    """Find engines matching a pattern"""
    matches = []
    pattern_lower = pattern.lower().replace("_", " ")
    keywords = pattern_lower.split()
    
    for e in engine_list:
        eid = e.get("id", "").lower()
        ename = e.get("name", "").lower()
        ecat = e.get("category", "").lower()
        
        # Check if any keyword matches
        text = f"{eid} {ename} {ecat}"
        if any(kw in text for kw in keywords):
            matches.append(e.get("id", ""))
    
    return matches[:5]  # Max 5 per pattern

precise_wiring = {
    "version": "16.0.0",
    "description": "PRECISE formula-engine wiring (5-15 per formula)",
    "methodology": "Semantic matching with max connection limits",
    "connections": {},
    "statistics": {},
}

total_connections = 0
connection_counts = []

for formula in formulas:
    fid = formula.get("id", "")
    fname = formula.get("name", "")
    fcat = formula.get("category", "")
    
    # Find matching rule
    rule = None
    for prefix, r in PRECISE_FORMULA_ENGINE_RULES.items():
        if fid.startswith(prefix) or prefix in fcat.upper():
            rule = r
            break
    
    if not rule:
        # Default rule
        rule = {
            "primary_engines": [],
            "secondary_engines": [],
            "optional_engines": [],
            "max_connections": 8,
        }
    
    # Find matching engines
    connected_engines = set()
    
    # Primary (always connect if found)
    for pattern in rule.get("primary_engines", []):
        matches = find_matching_engines(pattern, engines)
        connected_engines.update(matches)
    
    # Secondary (connect if under limit)
    if len(connected_engines) < rule["max_connections"]:
        for pattern in rule.get("secondary_engines", []):
            matches = find_matching_engines(pattern, engines)
            for m in matches:
                if len(connected_engines) < rule["max_connections"]:
                    connected_engines.add(m)
    
    # Optional (connect if still under limit)
    if len(connected_engines) < rule["max_connections"]:
        for pattern in rule.get("optional_engines", []):
            matches = find_matching_engines(pattern, engines)
            for m in matches:
                if len(connected_engines) < rule["max_connections"]:
                    connected_engines.add(m)
    
    # If no specific matches, use category-based fallback (but limited)
    if len(connected_engines) == 0:
        # Find by category similarity
        for e in engines:
            ecat = e.get("category", "").upper()
            if fcat.upper() in ecat or ecat in fcat.upper():
                connected_engines.add(e.get("id", ""))
                if len(connected_engines) >= 5:
                    break
    
    # Ensure minimum connections
    if len(connected_engines) < 3:
        # Add first few engines from same domain
        domain = fid.split("-")[1] if "-" in fid else ""
        for e in engines:
            eid = e.get("id", "")
            if domain and domain in eid:
                connected_engines.add(eid)
                if len(connected_engines) >= 5:
                    break
    
    connected_list = list(connected_engines)
    precise_wiring["connections"][fid] = {
        "name": fname,
        "category": fcat,
        "engines": connected_list,
        "count": len(connected_list),
    }
    
    total_connections += len(connected_list)
    connection_counts.append(len(connected_list))

# Statistics
avg_connections = total_connections / len(formulas) if formulas else 0
max_conn = max(connection_counts) if connection_counts else 0
min_conn = min(connection_counts) if connection_counts else 0

precise_wiring["statistics"] = {
    "total_formulas": len(formulas),
    "total_engines": len(engines),
    "total_connections": total_connections,
    "avg_connections_per_formula": round(avg_connections, 2),
    "max_connections": max_conn,
    "min_connections": min_conn,
    "target_range": "5-15 per formula",
    "improvement_vs_bulk": f"{120248 / total_connections:.1f}x reduction" if total_connections > 0 else "N/A",
}

print(f"   Total connections: {total_connections}")
print(f"   Avg per formula: {avg_connections:.1f} (target: 5-15)")
print(f"   Range: {min_conn} to {max_conn}")
print(f"   Improvement vs bulk (120,248): {120248 / total_connections:.1f}x reduction" if total_connections > 0 else "")

# Save precise wiring
wiring_path = os.path.join(REG_PATH, "PRECISE_WIRING_F2E.json")
with open(wiring_path, 'w', encoding='utf-8') as f:
    json.dump(precise_wiring, f, indent=2)
print(f"   Saved: {wiring_path}")
