#!/usr/bin/env python3
"""
PRISM ARCHITECTURE v16.0 - COMPLETE THEORETICAL MAXIMUM
========================================================
NO LIMITS. IF IT CAN BE USED, USE IT.
Parallel processing for exhaustive semantic wiring.
"""

import json
import os
from datetime import datetime
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from itertools import product, combinations
import hashlib

REG_PATH = r"C:\PRISM\registries"

# ═══════════════════════════════════════════════════════════════════════════════
# LAYER -INF: CONSTANTS FOUNDATION (Inherited by ALL, no explicit wiring needed)
# ═══════════════════════════════════════════════════════════════════════════════

CONSTANTS_FOUNDATION = {
    "layer": "L-INF",
    "name": "CONSTANTS_FOUNDATION",
    "description": "Immutable reference values inherited by ALL layers automatically",
    "inheritance": "UNIVERSAL",  # Everything inherits without explicit wiring
    
    "categories": {
        # PHYSICAL CONSTANTS (Fundamental physics)
        "PHYSICAL": {
            "subcategories": {
                "FUNDAMENTAL": {
                    "SPEED_OF_LIGHT": {"value": 299792458, "unit": "m/s", "symbol": "c", "uncertainty": 0},
                    "PLANCK": {"value": 6.62607015e-34, "unit": "J*s", "symbol": "h", "uncertainty": 0},
                    "BOLTZMANN": {"value": 1.380649e-23, "unit": "J/K", "symbol": "k", "uncertainty": 0},
                    "AVOGADRO": {"value": 6.02214076e23, "unit": "1/mol", "symbol": "Na", "uncertainty": 0},
                    "ELEMENTARY_CHARGE": {"value": 1.602176634e-19, "unit": "C", "symbol": "e", "uncertainty": 0},
                    "GRAVITATIONAL": {"value": 6.67430e-11, "unit": "m3/(kg*s2)", "symbol": "G", "uncertainty": 2.2e-5},
                },
                "THERMAL": {
                    "STEFAN_BOLTZMANN": {"value": 5.670374419e-8, "unit": "W/(m2*K4)", "symbol": "sigma"},
                    "ABSOLUTE_ZERO_C": {"value": -273.15, "unit": "C"},
                    "ABSOLUTE_ZERO_K": {"value": 0, "unit": "K"},
                    "TRIPLE_POINT_WATER": {"value": 273.16, "unit": "K"},
                    "ROOM_TEMP_STD": {"value": 293.15, "unit": "K", "note": "20C standard"},
                    "ROOM_TEMP_NIST": {"value": 298.15, "unit": "K", "note": "25C NIST"},
                },
                "MECHANICAL": {
                    "GRAVITY_STANDARD": {"value": 9.80665, "unit": "m/s2", "symbol": "g"},
                    "ATMOSPHERIC_PRESSURE": {"value": 101325, "unit": "Pa", "symbol": "atm"},
                    "WATER_DENSITY_4C": {"value": 1000, "unit": "kg/m3"},
                    "AIR_DENSITY_STP": {"value": 1.225, "unit": "kg/m3"},
                },
            },
            "applies_to": ["ALL_LAYERS"],
        },
        
        # MATHEMATICAL CONSTANTS
        "MATHEMATICAL": {
            "subcategories": {
                "TRANSCENDENTAL": {
                    "PI": {"value": 3.141592653589793238462643383279502884197},
                    "E": {"value": 2.718281828459045235360287471352662497757},
                    "GOLDEN_RATIO": {"value": 1.618033988749894848204586834365638117720, "symbol": "phi"},
                },
                "ROOTS": {
                    "SQRT_2": {"value": 1.4142135623730950488016887242097},
                    "SQRT_3": {"value": 1.7320508075688772935274463415059},
                    "SQRT_5": {"value": 2.2360679774997896964091736687748},
                },
                "LOGARITHMS": {
                    "LN_2": {"value": 0.6931471805599453094172321214582},
                    "LN_10": {"value": 2.3025850929940456840179914546844},
                    "LOG10_2": {"value": 0.3010299956639811952137388947245},
                    "LOG10_E": {"value": 0.4342944819032518276511289189166},
                },
                "TRIGONOMETRIC": {
                    "DEG_TO_RAD": {"value": 0.017453292519943295769236907685},
                    "RAD_TO_DEG": {"value": 57.29577951308232087679815481410},
                },
            },
            "applies_to": ["ALL_LAYERS"],
        },
        
        # ENGINEERING CONSTANTS
        "ENGINEERING": {
            "subcategories": {
                "MATERIAL_DENSITY": {
                    "STEEL_CARBON": {"value": 7850, "unit": "kg/m3", "range": [7800, 7900]},
                    "STEEL_STAINLESS": {"value": 8000, "unit": "kg/m3", "range": [7900, 8100]},
                    "STEEL_TOOL": {"value": 7800, "unit": "kg/m3", "range": [7700, 7900]},
                    "ALUMINUM_PURE": {"value": 2700, "unit": "kg/m3"},
                    "ALUMINUM_ALLOY": {"value": 2800, "unit": "kg/m3", "range": [2700, 2900]},
                    "TITANIUM_PURE": {"value": 4500, "unit": "kg/m3"},
                    "TITANIUM_ALLOY": {"value": 4430, "unit": "kg/m3", "note": "Ti-6Al-4V"},
                    "COPPER_PURE": {"value": 8960, "unit": "kg/m3"},
                    "BRASS": {"value": 8500, "unit": "kg/m3", "range": [8400, 8700]},
                    "BRONZE": {"value": 8800, "unit": "kg/m3", "range": [8700, 8900]},
                    "NICKEL_ALLOY": {"value": 8200, "unit": "kg/m3", "note": "Inconel 718"},
                    "COBALT_ALLOY": {"value": 8300, "unit": "kg/m3"},
                    "TUNGSTEN_CARBIDE": {"value": 15600, "unit": "kg/m3"},
                    "CARBIDE_CEMENTED": {"value": 14500, "unit": "kg/m3", "note": "WC-Co"},
                    "CERAMIC_ALUMINA": {"value": 3900, "unit": "kg/m3"},
                    "CERAMIC_SILICON_NITRIDE": {"value": 3200, "unit": "kg/m3"},
                    "CAST_IRON_GRAY": {"value": 7200, "unit": "kg/m3"},
                    "CAST_IRON_DUCTILE": {"value": 7100, "unit": "kg/m3"},
                    "MAGNESIUM_ALLOY": {"value": 1800, "unit": "kg/m3"},
                    "ZINC_ALLOY": {"value": 6600, "unit": "kg/m3"},
                },
                "THERMAL_PROPERTIES": {
                    "STEEL_THERMAL_CONDUCTIVITY": {"value": 50, "unit": "W/(m*K)", "range": [40, 60]},
                    "ALUMINUM_THERMAL_CONDUCTIVITY": {"value": 205, "unit": "W/(m*K)"},
                    "COPPER_THERMAL_CONDUCTIVITY": {"value": 400, "unit": "W/(m*K)"},
                    "TITANIUM_THERMAL_CONDUCTIVITY": {"value": 7, "unit": "W/(m*K)"},
                    "CARBIDE_THERMAL_CONDUCTIVITY": {"value": 80, "unit": "W/(m*K)"},
                    "STEEL_SPECIFIC_HEAT": {"value": 500, "unit": "J/(kg*K)"},
                    "ALUMINUM_SPECIFIC_HEAT": {"value": 900, "unit": "J/(kg*K)"},
                    "TITANIUM_SPECIFIC_HEAT": {"value": 520, "unit": "J/(kg*K)"},
                },
                "ELASTIC_PROPERTIES": {
                    "STEEL_ELASTIC_MODULUS": {"value": 200, "unit": "GPa", "range": [195, 210]},
                    "ALUMINUM_ELASTIC_MODULUS": {"value": 70, "unit": "GPa"},
                    "TITANIUM_ELASTIC_MODULUS": {"value": 114, "unit": "GPa"},
                    "COPPER_ELASTIC_MODULUS": {"value": 117, "unit": "GPa"},
                    "CARBIDE_ELASTIC_MODULUS": {"value": 600, "unit": "GPa"},
                    "STEEL_POISSON_RATIO": {"value": 0.30},
                    "ALUMINUM_POISSON_RATIO": {"value": 0.33},
                    "TITANIUM_POISSON_RATIO": {"value": 0.34},
                },
                "HARDNESS_REFERENCE": {
                    "HSS_HARDNESS_MIN": {"value": 62, "unit": "HRC"},
                    "CARBIDE_HARDNESS_MIN": {"value": 89, "unit": "HRA"},
                    "CERAMIC_HARDNESS_MIN": {"value": 92, "unit": "HRA"},
                    "CBN_HARDNESS": {"value": 4500, "unit": "HV"},
                    "DIAMOND_HARDNESS": {"value": 8000, "unit": "HV"},
                },
            },
            "applies_to": ["MATERIALS", "MACHINES", "TOOLS", "FORMULAS", "ENGINES"],
        },
        
        # MANUFACTURING CONSTANTS
        "MANUFACTURING": {
            "subcategories": {
                "CUTTING_REFERENCE": {
                    "KIENZLE_REF_THICKNESS": {"value": 1.0, "unit": "mm", "symbol": "h0", "description": "Reference chip thickness for kc1.1"},
                    "TAYLOR_REF_VELOCITY": {"value": 1.0, "unit": "m/min", "description": "Reference velocity for tool life"},
                    "DEFAULT_TOOL_LIFE_TARGET": {"value": 15, "unit": "min", "range": [10, 60]},
                    "MINIMUM_CHIP_THICKNESS_RATIO": {"value": 0.1, "description": "hmin/edge_radius"},
                    "MAXIMUM_CHIP_THICKNESS_RATIO": {"value": 0.5, "description": "hmax/insert_thickness"},
                    "RUBBING_THRESHOLD": {"value": 0.01, "unit": "mm", "description": "Below this, rubbing not cutting"},
                },
                "MACHINE_LIMITS": {
                    "SPINDLE_WARMUP_TIME": {"value": 5, "unit": "min"},
                    "SPINDLE_MAX_ACCELERATION": {"value": 2000, "unit": "rpm/s", "typical": True},
                    "AXIS_MAX_ACCELERATION": {"value": 0.5, "unit": "g", "typical": True},
                    "POSITIONING_ACCURACY_TYPICAL": {"value": 0.005, "unit": "mm"},
                    "REPEATABILITY_TYPICAL": {"value": 0.002, "unit": "mm"},
                },
                "TOOL_GEOMETRY_LIMITS": {
                    "MAX_HELIX_ANGLE": {"value": 60, "unit": "deg"},
                    "MAX_RAKE_ANGLE": {"value": 30, "unit": "deg"},
                    "MIN_CLEARANCE_ANGLE": {"value": 3, "unit": "deg"},
                    "MAX_NOSE_RADIUS": {"value": 3.2, "unit": "mm"},
                    "MIN_NOSE_RADIUS": {"value": 0.2, "unit": "mm"},
                },
                "PROCESS_RATIOS": {
                    "MAX_DOC_DIAMETER_RATIO": {"value": 0.5, "description": "ae/D for roughing"},
                    "MAX_DOC_DIAMETER_RATIO_FINISHING": {"value": 0.1, "description": "ae/D for finishing"},
                    "MAX_STEPOVER_RATIO": {"value": 0.7, "description": "stepover/D"},
                    "CHIP_LOAD_RANGE": {"min": 0.01, "max": 0.5, "unit": "mm/tooth"},
                    "SFM_SAFETY_FACTOR": {"value": 0.8, "description": "Apply to max recommended"},
                },
            },
            "applies_to": ["FORMULAS", "ENGINES", "SKILLS", "PRODUCTS"],
        },
        
        # ISO/STANDARDS CONSTANTS
        "STANDARDS": {
            "subcategories": {
                "ISO_513_MATERIALS": {
                    "P": {"name": "Steels", "color": "blue", "code": "P", "hardness_range": "125-400 HB"},
                    "M": {"name": "Stainless Steels", "color": "yellow", "code": "M", "hardness_range": "135-330 HB"},
                    "K": {"name": "Cast Irons", "color": "red", "code": "K", "hardness_range": "130-330 HB"},
                    "N": {"name": "Non-Ferrous", "color": "green", "code": "N", "hardness_range": "30-150 HB"},
                    "S": {"name": "Superalloys", "color": "orange", "code": "S", "hardness_range": "200-450 HB"},
                    "H": {"name": "Hardened Steels", "color": "gray", "code": "H", "hardness_range": "45-68 HRC"},
                },
                "ISO_TOLERANCE_GRADES": {
                    "IT01": {"um": 0.3, "application": "Gauge blocks"},
                    "IT0": {"um": 0.5, "application": "Gauge blocks"},
                    "IT1": {"um": 0.8, "application": "Gauges"},
                    "IT2": {"um": 1.2, "application": "Gauges"},
                    "IT3": {"um": 2.0, "application": "Precision fits"},
                    "IT4": {"um": 3.0, "application": "Precision fits"},
                    "IT5": {"um": 4.0, "application": "Bearings, precision"},
                    "IT6": {"um": 6.0, "application": "Bearings, fits"},
                    "IT7": {"um": 10.0, "application": "General machining"},
                    "IT8": {"um": 14.0, "application": "General machining"},
                    "IT9": {"um": 25.0, "application": "Loose fits"},
                    "IT10": {"um": 40.0, "application": "Rough machining"},
                    "IT11": {"um": 60.0, "application": "Rough machining"},
                    "IT12": {"um": 100.0, "application": "Stamping"},
                    "IT13": {"um": 140.0, "application": "Casting"},
                    "IT14": {"um": 250.0, "application": "Casting"},
                    "IT15": {"um": 400.0, "application": "Forging"},
                    "IT16": {"um": 600.0, "application": "Forging"},
                    "IT17": {"um": 1000.0, "application": "Raw stock"},
                    "IT18": {"um": 1500.0, "application": "Raw stock"},
                },
                "ISO_SURFACE_FINISH": {
                    "N1": {"Ra_um": 0.025, "process": "Superfinishing, lapping"},
                    "N2": {"Ra_um": 0.05, "process": "Superfinishing"},
                    "N3": {"Ra_um": 0.1, "process": "Lapping, honing"},
                    "N4": {"Ra_um": 0.2, "process": "Grinding, honing"},
                    "N5": {"Ra_um": 0.4, "process": "Grinding"},
                    "N6": {"Ra_um": 0.8, "process": "Fine turning, grinding"},
                    "N7": {"Ra_um": 1.6, "process": "Turning, milling"},
                    "N8": {"Ra_um": 3.2, "process": "Turning, milling"},
                    "N9": {"Ra_um": 6.3, "process": "Rough turning"},
                    "N10": {"Ra_um": 12.5, "process": "Rough milling"},
                    "N11": {"Ra_um": 25.0, "process": "Shaping, sawing"},
                    "N12": {"Ra_um": 50.0, "process": "Casting, forging"},
                },
                "ISO_FIT_TYPES": {
                    "CLEARANCE": {"examples": ["H7/f6", "H7/g6", "H8/f7"], "application": "Running fits"},
                    "TRANSITION": {"examples": ["H7/k6", "H7/m6", "H7/n6"], "application": "Location fits"},
                    "INTERFERENCE": {"examples": ["H7/p6", "H7/r6", "H7/s6"], "application": "Press fits"},
                },
            },
            "applies_to": ["MATERIALS", "QUALITY", "FORMULAS"],
        },
        
        # PRISM SYSTEM CONSTANTS
        "PRISM": {
            "subcategories": {
                "QUALITY_THRESHOLDS": {
                    "OMEGA_MIN": {"value": 0.70, "description": "Overall quality threshold", "enforcement": "WARN"},
                    "SAFETY_MIN": {"value": 0.70, "description": "Safety threshold", "enforcement": "HARD_BLOCK"},
                    "REASONING_MIN": {"value": 0.60, "description": "Reasoning quality", "enforcement": "WARN"},
                    "CODE_MIN": {"value": 0.70, "description": "Code quality", "enforcement": "WARN"},
                    "PROCESS_MIN": {"value": 0.60, "description": "Process quality", "enforcement": "WARN"},
                    "LEARNING_MIN": {"value": 0.50, "description": "Learning quality", "enforcement": "INFO"},
                },
                "QUALITY_WEIGHTS": {
                    "W_REASONING": {"value": 0.25, "symbol": "wR"},
                    "W_CODE": {"value": 0.20, "symbol": "wC"},
                    "W_PROCESS": {"value": 0.15, "symbol": "wP"},
                    "W_SAFETY": {"value": 0.30, "symbol": "wS"},
                    "W_LEARNING": {"value": 0.10, "symbol": "wL"},
                },
                "BUFFER_ZONES": {
                    "GREEN": {"min": 0, "max": 8, "action": "Normal operation", "color": "#00FF00"},
                    "YELLOW": {"min": 9, "max": 14, "action": "Plan checkpoint", "color": "#FFFF00"},
                    "RED": {"min": 15, "max": 18, "action": "Immediate checkpoint", "color": "#FF0000"},
                    "BLACK": {"min": 19, "max": 999, "action": "STOP ALL", "color": "#000000"},
                },
                "EVIDENCE_LEVELS": {
                    "L1": {"name": "Claim", "description": "Assertion without proof", "acceptable": False},
                    "L2": {"name": "Listing", "description": "File listing shown", "acceptable": False},
                    "L3": {"name": "Sample", "description": "Content sample shown", "acceptable": True},
                    "L4": {"name": "Reproducible", "description": "Can be reproduced", "acceptable": True},
                    "L5": {"name": "Verified", "description": "User verified", "acceptable": True},
                },
                "SESSION_LIMITS": {
                    "MICROSESSION_MIN": {"value": 15, "unit": "items"},
                    "MICROSESSION_MAX": {"value": 25, "unit": "items"},
                    "CHECKPOINT_INTERVAL": {"value": 5, "unit": "items"},
                    "MAX_TOOL_CALLS": {"value": 19, "unit": "calls", "note": "Before BLACK zone"},
                },
            },
            "applies_to": ["ALL_LAYERS"],
        },
        
        # UNIT CONVERSIONS
        "CONVERSIONS": {
            "subcategories": {
                "LENGTH": {
                    "MM_TO_INCH": {"factor": 0.03937007874015748, "from": "mm", "to": "inch"},
                    "INCH_TO_MM": {"factor": 25.4, "from": "inch", "to": "mm"},
                    "M_TO_FT": {"factor": 3.280839895013123, "from": "m", "to": "ft"},
                    "FT_TO_M": {"factor": 0.3048, "from": "ft", "to": "m"},
                    "UM_TO_MM": {"factor": 0.001, "from": "um", "to": "mm"},
                    "MM_TO_UM": {"factor": 1000, "from": "mm", "to": "um"},
                },
                "VELOCITY": {
                    "M_MIN_TO_MM_S": {"factor": 16.666666666666668, "from": "m/min", "to": "mm/s"},
                    "MM_S_TO_M_MIN": {"factor": 0.06, "from": "mm/s", "to": "m/min"},
                    "SFM_TO_M_MIN": {"factor": 0.3048, "from": "sfm", "to": "m/min"},
                    "M_MIN_TO_SFM": {"factor": 3.280839895013123, "from": "m/min", "to": "sfm"},
                    "IPM_TO_MM_MIN": {"factor": 25.4, "from": "ipm", "to": "mm/min"},
                    "MM_MIN_TO_IPM": {"factor": 0.03937007874015748, "from": "mm/min", "to": "ipm"},
                },
                "ANGULAR": {
                    "RPM_TO_RAD_S": {"factor": 0.10471975511965977, "from": "rpm", "to": "rad/s"},
                    "RAD_S_TO_RPM": {"factor": 9.549296585513721, "from": "rad/s", "to": "rpm"},
                    "DEG_TO_RAD": {"factor": 0.017453292519943295, "from": "deg", "to": "rad"},
                    "RAD_TO_DEG": {"factor": 57.29577951308232, "from": "rad", "to": "deg"},
                },
                "POWER": {
                    "KW_TO_HP": {"factor": 1.3410220888438133, "from": "kW", "to": "hp"},
                    "HP_TO_KW": {"factor": 0.7456998715822702, "from": "hp", "to": "kW"},
                    "W_TO_KW": {"factor": 0.001, "from": "W", "to": "kW"},
                    "KW_TO_W": {"factor": 1000, "from": "kW", "to": "W"},
                },
                "PRESSURE": {
                    "MPA_TO_PSI": {"factor": 145.03773773020923, "from": "MPa", "to": "psi"},
                    "PSI_TO_MPA": {"factor": 0.00689475729317831, "from": "psi", "to": "MPa"},
                    "GPA_TO_MPA": {"factor": 1000, "from": "GPa", "to": "MPa"},
                    "MPA_TO_GPA": {"factor": 0.001, "from": "MPa", "to": "GPa"},
                    "BAR_TO_MPA": {"factor": 0.1, "from": "bar", "to": "MPa"},
                    "MPA_TO_BAR": {"factor": 10, "from": "MPa", "to": "bar"},
                },
                "TEMPERATURE": {
                    "C_TO_K": {"offset": 273.15, "from": "C", "to": "K"},
                    "K_TO_C": {"offset": -273.15, "from": "K", "to": "C"},
                    "C_TO_F": {"factor": 1.8, "offset": 32, "from": "C", "to": "F"},
                    "F_TO_C": {"factor": 0.5555555555555556, "offset": -17.77777777777778, "from": "F", "to": "C"},
                },
                "HARDNESS": {
                    "HB_TO_HV_APPROX": {"factor": 1.05, "from": "HB", "to": "HV", "accuracy": "approximate"},
                    "HRC_TO_HV_LOOKUP": {"method": "lookup_table", "from": "HRC", "to": "HV"},
                    "HRA_TO_HRC_LOOKUP": {"method": "lookup_table", "from": "HRA", "to": "HRC"},
                },
                "FORCE": {
                    "N_TO_KGF": {"factor": 0.10197162129779283, "from": "N", "to": "kgf"},
                    "KGF_TO_N": {"factor": 9.80665, "from": "kgf", "to": "N"},
                    "N_TO_LBF": {"factor": 0.22480894309971047, "from": "N", "to": "lbf"},
                    "LBF_TO_N": {"factor": 4.4482216152605, "from": "lbf", "to": "N"},
                    "KN_TO_N": {"factor": 1000, "from": "kN", "to": "N"},
                },
            },
            "applies_to": ["ALL_LAYERS"],
        },
    },
}

# Count constants
def count_constants(obj, depth=0):
    count = 0
    if isinstance(obj, dict):
        if "value" in obj or "factor" in obj or "offset" in obj:
            return 1
        for v in obj.values():
            count += count_constants(v, depth + 1)
    return count

total_constants = count_constants(CONSTANTS_FOUNDATION["categories"])
print(f"Total constants in foundation: {total_constants}")

# Save
output_path = os.path.join(REG_PATH, "CONSTANTS_FOUNDATION.json")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(CONSTANTS_FOUNDATION, f, indent=2)
print(f"Saved: {output_path}")
