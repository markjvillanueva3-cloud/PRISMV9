#!/usr/bin/env python3
"""
PRISM IMPROVED ARCHITECTURE v16.0
=================================
Implementing the critical fixes:
1. CONSTANTS foundation layer
2. TYPES/SCHEMAS layer
3. PRECISE wiring (5-15 per formula, not 245)
4. Hierarchical categorization
"""

import json
from datetime import datetime
from collections import defaultdict
import math

# ═══════════════════════════════════════════════════════════════════════════════
# PART 1: CONSTANTS FOUNDATION LAYER
# ═══════════════════════════════════════════════════════════════════════════════

CONSTANTS = {
    "version": "1.0.0",
    "description": "Foundational constants - available to ALL layers without explicit wiring",
    
    "physical": {
        "SPEED_OF_LIGHT": {"value": 299792458, "unit": "m/s", "symbol": "c"},
        "PLANCK": {"value": 6.62607015e-34, "unit": "J*s", "symbol": "h"},
        "BOLTZMANN": {"value": 1.380649e-23, "unit": "J/K", "symbol": "k"},
        "AVOGADRO": {"value": 6.02214076e23, "unit": "1/mol", "symbol": "Na"},
        "STEFAN_BOLTZMANN": {"value": 5.670374419e-8, "unit": "W/(m2*K4)", "symbol": "sigma"},
        "GRAVITY_STANDARD": {"value": 9.80665, "unit": "m/s2", "symbol": "g"},
        "ATMOSPHERIC_PRESSURE": {"value": 101325, "unit": "Pa", "symbol": "atm"},
        "ABSOLUTE_ZERO": {"value": -273.15, "unit": "C", "symbol": "T0"},
    },
    
    "mathematical": {
        "PI": {"value": 3.141592653589793, "symbol": "pi"},
        "E": {"value": 2.718281828459045, "symbol": "e"},
        "GOLDEN_RATIO": {"value": 1.618033988749895, "symbol": "phi"},
        "SQRT_2": {"value": 1.4142135623730951, "symbol": "sqrt2"},
        "SQRT_3": {"value": 1.7320508075688772, "symbol": "sqrt3"},
        "LN_2": {"value": 0.6931471805599453, "symbol": "ln2"},
        "LN_10": {"value": 2.302585092994046, "symbol": "ln10"},
    },
    
    "engineering": {
        "STEEL_DENSITY": {"value": 7850, "unit": "kg/m3", "typical_for": "carbon steel"},
        "ALUMINUM_DENSITY": {"value": 2700, "unit": "kg/m3", "typical_for": "6061-T6"},
        "TITANIUM_DENSITY": {"value": 4500, "unit": "kg/m3", "typical_for": "Ti-6Al-4V"},
        "CARBIDE_DENSITY": {"value": 14500, "unit": "kg/m3", "typical_for": "WC-Co"},
        "HSS_HARDNESS_MIN": {"value": 62, "unit": "HRC", "typical_for": "M2 HSS"},
        "CARBIDE_HARDNESS_MIN": {"value": 89, "unit": "HRA", "typical_for": "K10"},
    },
    
    "manufacturing": {
        "KIENZLE_REFERENCE_THICKNESS": {"value": 1.0, "unit": "mm", "description": "h0 for kc1.1"},
        "TAYLOR_REFERENCE_VELOCITY": {"value": 1.0, "unit": "m/min", "description": "V0 for tool life"},
        "DEFAULT_TOOL_LIFE_TARGET": {"value": 15, "unit": "min", "description": "T target"},
        "SPINDLE_WARMUP_TIME": {"value": 5, "unit": "min", "description": "typical warmup"},
        "MINIMUM_CHIP_THICKNESS": {"value": 0.01, "unit": "mm", "description": "hmin for rubbing"},
        "MAXIMUM_RECOMMENDED_DOC_RATIO": {"value": 0.5, "description": "ae/D ratio"},
    },
    
    "iso_standards": {
        "ISO_513_P": {"name": "Steels", "color": "blue"},
        "ISO_513_M": {"name": "Stainless Steels", "color": "yellow"},
        "ISO_513_K": {"name": "Cast Irons", "color": "red"},
        "ISO_513_N": {"name": "Non-Ferrous", "color": "green"},
        "ISO_513_S": {"name": "Superalloys", "color": "orange"},
        "ISO_513_H": {"name": "Hardened Steels", "color": "gray"},
    },
    
    "tolerance_grades": {
        "IT01": {"um": 0.3},
        "IT0": {"um": 0.5},
        "IT1": {"um": 0.8},
        "IT2": {"um": 1.2},
        "IT3": {"um": 2.0},
        "IT4": {"um": 3.0},
        "IT5": {"um": 4.0},
        "IT6": {"um": 6.0},
        "IT7": {"um": 10.0},
        "IT8": {"um": 14.0},
        "IT9": {"um": 25.0},
        "IT10": {"um": 40.0},
        "IT11": {"um": 60.0},
        "IT12": {"um": 100.0},
        "IT13": {"um": 140.0},
        "IT14": {"um": 250.0},
        "IT15": {"um": 400.0},
        "IT16": {"um": 600.0},
    },
    
    "surface_finish_grades": {
        "N1": {"Ra_um": 0.025, "description": "Super finish"},
        "N2": {"Ra_um": 0.05, "description": "Mirror finish"},
        "N3": {"Ra_um": 0.1, "description": "Lapped"},
        "N4": {"Ra_um": 0.2, "description": "Ground fine"},
        "N5": {"Ra_um": 0.4, "description": "Ground"},
        "N6": {"Ra_um": 0.8, "description": "Fine turned"},
        "N7": {"Ra_um": 1.6, "description": "Turned"},
        "N8": {"Ra_um": 3.2, "description": "Rough turned"},
        "N9": {"Ra_um": 6.3, "description": "Milled fine"},
        "N10": {"Ra_um": 12.5, "description": "Milled"},
        "N11": {"Ra_um": 25.0, "description": "Rough milled"},
        "N12": {"Ra_um": 50.0, "description": "Cast/forged"},
    },
    
    "prism_thresholds": {
        "OMEGA_MIN": {"value": 0.70, "description": "Overall quality threshold"},
        "SAFETY_MIN": {"value": 0.70, "description": "HARD BLOCK - safety threshold"},
        "REASONING_MIN": {"value": 0.60, "description": "Reasoning quality threshold"},
        "CODE_MIN": {"value": 0.70, "description": "Code quality threshold"},
        "PROCESS_MIN": {"value": 0.60, "description": "Process quality threshold"},
        "LEARNING_MIN": {"value": 0.50, "description": "Learning quality threshold"},
    },
    
    "prism_weights": {
        "REASONING_WEIGHT": {"value": 0.25, "symbol": "wR"},
        "CODE_WEIGHT": {"value": 0.20, "symbol": "wC"},
        "PROCESS_WEIGHT": {"value": 0.15, "symbol": "wP"},
        "SAFETY_WEIGHT": {"value": 0.30, "symbol": "wS"},
        "LEARNING_WEIGHT": {"value": 0.10, "symbol": "wL"},
    },
    
    "buffer_zones": {
        "GREEN": {"max": 8, "action": "Normal operation"},
        "YELLOW": {"max": 14, "action": "Plan checkpoint"},
        "RED": {"max": 18, "action": "Immediate checkpoint"},
        "BLACK": {"max": 999, "action": "STOP ALL - checkpoint NOW"},
    },
    
    "unit_conversions": {
        "MM_TO_INCH": {"factor": 0.03937007874, "from": "mm", "to": "inch"},
        "INCH_TO_MM": {"factor": 25.4, "from": "inch", "to": "mm"},
        "RPM_TO_RAD_S": {"factor": 0.10471975512, "from": "rpm", "to": "rad/s"},
        "M_MIN_TO_MM_S": {"factor": 16.66666667, "from": "m/min", "to": "mm/s"},
        "MM_S_TO_M_MIN": {"factor": 0.06, "from": "mm/s", "to": "m/min"},
        "KW_TO_HP": {"factor": 1.341022, "from": "kW", "to": "hp"},
        "HP_TO_KW": {"factor": 0.7457, "from": "hp", "to": "kW"},
        "MPA_TO_PSI": {"factor": 145.038, "from": "MPa", "to": "psi"},
        "PSI_TO_MPA": {"factor": 0.00689476, "from": "psi", "to": "MPa"},
        "CELSIUS_TO_KELVIN": {"offset": 273.15, "from": "C", "to": "K"},
        "HB_TO_HV_APPROX": {"factor": 1.05, "from": "HB", "to": "HV", "note": "approximate"},
    },
}

# Save constants
output_path = r"C:\PRISM\registries\CONSTANTS_FOUNDATION.json"
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(CONSTANTS, f, indent=2)

print("=" * 60)
print("CONSTANTS FOUNDATION LAYER")
print("=" * 60)
print(f"\nCategories: {len(CONSTANTS) - 2}")  # minus version and description
for key in CONSTANTS:
    if key not in ["version", "description"]:
        count = len(CONSTANTS[key])
        print(f"  {key}: {count} constants")
print(f"\nSaved: {output_path}")
