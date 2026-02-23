#!/usr/bin/env python3
"""
PRISM Stainless Steel Conditions Generator v1.0
================================================
Generates stainless steel materials at ALL realistic conditions.

CRITICAL MANUFACTURING INTELLIGENCE:
- Austenitic (304, 316): Cold worked conditions (1/4 to Full Hard)
- Martensitic (410, 420, 440): Hardened conditions (40-60 HRC)
- PH Stainless (17-4, 15-5): Complete H-condition series

The same stainless at different conditions has DRAMATICALLY different machining:
- 304 Annealed: Vc = 150 m/min, kc1.1 = 2500 N/mm²
- 304 Full Hard: Vc = 80 m/min, kc1.1 = 3800 N/mm²
- 440C Annealed: Vc = 70 m/min, kc1.1 = 2800 N/mm²
- 440C @ 58 HRC: Vc = 15 m/min, kc1.1 = 5200 N/mm², CBN required

Author: PRISM Manufacturing Intelligence
Version: 1.0
Date: 2026-01-25
"""

import json
from datetime import datetime

# =============================================================================
# ASTM E140 HARDNESS CONVERSION
# =============================================================================

HRC_TO_HB = {
    20: 228, 21: 231, 22: 234, 23: 237, 24: 240,
    25: 243, 26: 247, 27: 251, 28: 255, 29: 259,
    30: 266, 31: 271, 32: 277, 33: 283, 34: 289,
    35: 295, 36: 302, 37: 309, 38: 316, 39: 324,
    40: 332, 41: 340, 42: 349, 43: 358, 44: 367,
    45: 377, 46: 387, 47: 397, 48: 409, 49: 421,
    50: 433, 51: 445, 52: 458, 53: 471, 54: 485,
    55: 500, 56: 515, 57: 531, 58: 547, 59: 564,
    60: 582, 61: 600, 62: 619, 63: 639, 64: 659,
}

def hrc_to_hb(hrc):
    if hrc in HRC_TO_HB:
        return HRC_TO_HB[hrc]
    lower = max(k for k in HRC_TO_HB.keys() if k <= hrc)
    upper = min(k for k in HRC_TO_HB.keys() if k >= hrc)
    if lower == upper:
        return HRC_TO_HB[lower]
    ratio = (hrc - lower) / (upper - lower)
    return int(HRC_TO_HB[lower] + ratio * (HRC_TO_HB[upper] - HRC_TO_HB[lower]))

def hrc_to_tensile(hrc):
    return int(hrc_to_hb(hrc) * 3.45)

# =============================================================================
# AUSTENITIC STAINLESS - COLD WORKED CONDITIONS
# =============================================================================

AUSTENITIC_GRADES = {
    "304": {
        "name": "304", "uns": "S30400", "din": "1.4301", "en": "X5CrNi18-10",
        "annealed_tensile": 515, "annealed_yield": 205, "annealed_hb": 149,
        "base_kc11": 2500, "base_mc": 0.21, "base_speed": 150,
        "base_taylor_C": 200, "base_taylor_n": 0.20,
        "base_jc": {"A": 310, "B": 1000, "n": 0.65, "C": 0.07, "m": 1.0},
        "density": 8000, "thermal_cond": 16.2,
        "composition": {"C": 0.08, "Cr": 18.5, "Ni": 9.0, "Mn": 2.0},
    },
    "304L": {
        "name": "304L", "uns": "S30403", "din": "1.4307", "en": "X2CrNi18-9",
        "annealed_tensile": 485, "annealed_yield": 170, "annealed_hb": 143,
        "base_kc11": 2450, "base_mc": 0.21, "base_speed": 155,
        "base_taylor_C": 205, "base_taylor_n": 0.20,
        "base_jc": {"A": 290, "B": 980, "n": 0.65, "C": 0.07, "m": 1.0},
        "density": 8000, "thermal_cond": 16.2,
        "composition": {"C": 0.03, "Cr": 18.5, "Ni": 9.0, "Mn": 2.0},
    },
    "316": {
        "name": "316", "uns": "S31600", "din": "1.4401", "en": "X5CrNiMo17-12-2",
        "annealed_tensile": 515, "annealed_yield": 205, "annealed_hb": 149,
        "base_kc11": 2600, "base_mc": 0.21, "base_speed": 140,
        "base_taylor_C": 190, "base_taylor_n": 0.19,
        "base_jc": {"A": 305, "B": 1050, "n": 0.65, "C": 0.07, "m": 1.0},
        "density": 8000, "thermal_cond": 16.3,
        "composition": {"C": 0.08, "Cr": 17.0, "Ni": 12.0, "Mo": 2.5, "Mn": 2.0},
    },
    "316L": {
        "name": "316L", "uns": "S31603", "din": "1.4404", "en": "X2CrNiMo17-12-2",
        "annealed_tensile": 485, "annealed_yield": 170, "annealed_hb": 143,
        "base_kc11": 2550, "base_mc": 0.21, "base_speed": 145,
        "base_taylor_C": 195, "base_taylor_n": 0.19,
        "base_jc": {"A": 285, "B": 1030, "n": 0.65, "C": 0.07, "m": 1.0},
        "density": 8000, "thermal_cond": 16.3,
        "composition": {"C": 0.03, "Cr": 17.0, "Ni": 12.0, "Mo": 2.5, "Mn": 2.0},
    },
    "321": {
        "name": "321", "uns": "S32100", "din": "1.4541", "en": "X6CrNiTi18-10",
        "annealed_tensile": 515, "annealed_yield": 205, "annealed_hb": 149,
        "base_kc11": 2550, "base_mc": 0.21, "base_speed": 145,
        "base_taylor_C": 195, "base_taylor_n": 0.19,
        "base_jc": {"A": 310, "B": 1020, "n": 0.64, "C": 0.07, "m": 1.0},
        "density": 8000, "thermal_cond": 16.1,
        "composition": {"C": 0.08, "Cr": 18.0, "Ni": 10.5, "Ti": 0.4, "Mn": 2.0},
    },
    "347": {
        "name": "347", "uns": "S34700", "din": "1.4550", "en": "X6CrNiNb18-10",
        "annealed_tensile": 515, "annealed_yield": 205, "annealed_hb": 149,
        "base_kc11": 2580, "base_mc": 0.21, "base_speed": 140,
        "base_taylor_C": 190, "base_taylor_n": 0.19,
        "base_jc": {"A": 315, "B": 1040, "n": 0.64, "C": 0.07, "m": 1.0},
        "density": 8000, "thermal_cond": 16.1,
        "composition": {"C": 0.08, "Cr": 18.0, "Ni": 11.0, "Nb": 0.8, "Mn": 2.0},
    },
}

# Cold worked condition multipliers (based on ASTM A666)
AUSTENITIC_CONDITIONS = {
    "Annealed": {
        "tensile_mult": 1.0, "yield_mult": 1.0, "hb_mult": 1.0,
        "kc11_mult": 1.0, "speed_mult": 1.0, "taylor_C_mult": 1.0,
        "elongation": 40
    },
    "1/4 Hard": {
        "tensile_mult": 1.50, "yield_mult": 3.75, "hb_mult": 1.20,  # 515→770 MPa, 205→770 MPa yield
        "kc11_mult": 1.20, "speed_mult": 0.80, "taylor_C_mult": 0.75,
        "elongation": 25
    },
    "1/2 Hard": {
        "tensile_mult": 1.70, "yield_mult": 4.88, "hb_mult": 1.40,  # 515→860 MPa
        "kc11_mult": 1.35, "speed_mult": 0.65, "taylor_C_mult": 0.60,
        "elongation": 15
    },
    "3/4 Hard": {
        "tensile_mult": 1.90, "yield_mult": 5.50, "hb_mult": 1.55,  # 515→965 MPa
        "kc11_mult": 1.45, "speed_mult": 0.55, "taylor_C_mult": 0.50,
        "elongation": 10
    },
    "Full Hard": {
        "tensile_mult": 2.05, "yield_mult": 6.10, "hb_mult": 1.70,  # 515→1035 MPa
        "kc11_mult": 1.55, "speed_mult": 0.45, "taylor_C_mult": 0.40,
        "elongation": 5
    },
}

# =============================================================================
# MARTENSITIC STAINLESS - HARDENED CONDITIONS
# =============================================================================

MARTENSITIC_GRADES = {
    "410": {
        "name": "410", "uns": "S41000", "din": "1.4006", "en": "X12Cr13",
        "annealed_hb": 155, "max_hrc": 45,
        "base_kc11": 2400, "base_mc": 0.23, "base_speed": 90,
        "base_taylor_C": 170, "base_taylor_n": 0.17,
        "base_jc": {"A": 350, "B": 850, "n": 0.45, "C": 0.04, "m": 0.95},
        "density": 7800, "thermal_cond": 24.9,
        "composition": {"C": 0.15, "Cr": 12.5, "Mn": 1.0},
        "conditions": [None, 35, 40, 43],
    },
    "416": {
        "name": "416", "uns": "S41600", "din": "1.4005", "en": "X12CrS13",
        "annealed_hb": 155, "max_hrc": 42,
        "base_kc11": 2200, "base_mc": 0.24, "base_speed": 110,
        "base_taylor_C": 200, "base_taylor_n": 0.18,
        "base_jc": {"A": 340, "B": 820, "n": 0.45, "C": 0.045, "m": 0.96},
        "density": 7800, "thermal_cond": 24.9,
        "composition": {"C": 0.15, "Cr": 13.0, "S": 0.15, "Mn": 1.25},
        "conditions": [None, 35, 38, 40],
        "notes": "Free machining grade"
    },
    "420": {
        "name": "420", "uns": "S42000", "din": "1.4021", "en": "X20Cr13",
        "annealed_hb": 195, "max_hrc": 55,
        "base_kc11": 2600, "base_mc": 0.22, "base_speed": 70,
        "base_taylor_C": 150, "base_taylor_n": 0.16,
        "base_jc": {"A": 420, "B": 920, "n": 0.40, "C": 0.035, "m": 0.92},
        "density": 7800, "thermal_cond": 24.9,
        "composition": {"C": 0.35, "Cr": 13.0, "Mn": 1.0},
        "conditions": [None, 40, 45, 50, 52],
    },
    "440A": {
        "name": "440A", "uns": "S44002", "din": "1.4109", "en": "X70CrMo15",
        "annealed_hb": 230, "max_hrc": 56,
        "base_kc11": 2800, "base_mc": 0.22, "base_speed": 55,
        "base_taylor_C": 130, "base_taylor_n": 0.15,
        "base_jc": {"A": 500, "B": 980, "n": 0.35, "C": 0.03, "m": 0.90},
        "density": 7800, "thermal_cond": 24.2,
        "composition": {"C": 0.70, "Cr": 17.0, "Mo": 0.75, "Mn": 1.0},
        "conditions": [None, 45, 50, 54, 56],
    },
    "440B": {
        "name": "440B", "uns": "S44003", "din": "1.4112", "en": "X90CrMoV18",
        "annealed_hb": 240, "max_hrc": 58,
        "base_kc11": 2900, "base_mc": 0.21, "base_speed": 50,
        "base_taylor_C": 120, "base_taylor_n": 0.15,
        "base_jc": {"A": 530, "B": 1000, "n": 0.33, "C": 0.028, "m": 0.88},
        "density": 7800, "thermal_cond": 24.2,
        "composition": {"C": 0.85, "Cr": 17.0, "Mo": 0.75, "Mn": 1.0},
        "conditions": [None, 48, 52, 55, 58],
    },
    "440C": {
        "name": "440C", "uns": "S44004", "din": "1.4125", "en": "X105CrMo17",
        "annealed_hb": 250, "max_hrc": 60,
        "base_kc11": 3000, "base_mc": 0.21, "base_speed": 45,
        "base_taylor_C": 110, "base_taylor_n": 0.14,
        "base_jc": {"A": 560, "B": 1050, "n": 0.30, "C": 0.025, "m": 0.85},
        "density": 7800, "thermal_cond": 24.2,
        "composition": {"C": 1.10, "Cr": 17.0, "Mo": 0.75, "Mn": 1.0},
        "conditions": [None, 50, 54, 56, 58, 60],
    },
}

# =============================================================================
# PH STAINLESS - COMPLETE H-SERIES CONDITIONS
# =============================================================================

PH_GRADES = {
    "17-4PH": {
        "name": "17-4 PH", "uns": "S17400", "din": "1.4542", "en": "X5CrNiCuNb16-4",
        "condition_A_hb": 277,  # Solution annealed
        "base_kc11": 2700, "base_mc": 0.22, "base_speed": 80,
        "base_taylor_C": 160, "base_taylor_n": 0.16,
        "base_jc": {"A": 450, "B": 950, "n": 0.40, "C": 0.04, "m": 0.93},
        "density": 7800, "thermal_cond": 18.4,
        "composition": {"C": 0.07, "Cr": 16.0, "Ni": 4.0, "Cu": 4.0, "Nb": 0.30},
        "h_conditions": {
            "Condition A": {"hrc": None, "tensile": 1070, "yield": 795},
            "H900": {"hrc": 44, "tensile": 1310, "yield": 1170},
            "H925": {"hrc": 42, "tensile": 1170, "yield": 1070},
            "H1025": {"hrc": 38, "tensile": 1070, "yield": 1000},
            "H1075": {"hrc": 36, "tensile": 1000, "yield": 860},
            "H1100": {"hrc": 34, "tensile": 965, "yield": 795},
            "H1150": {"hrc": 31, "tensile": 930, "yield": 725},
        }
    },
    "15-5PH": {
        "name": "15-5 PH", "uns": "S15500", "din": "1.4540", "en": "X5CrNiCu15-5",
        "condition_A_hb": 277,
        "base_kc11": 2750, "base_mc": 0.22, "base_speed": 75,
        "base_taylor_C": 155, "base_taylor_n": 0.16,
        "base_jc": {"A": 460, "B": 970, "n": 0.40, "C": 0.038, "m": 0.92},
        "density": 7800, "thermal_cond": 18.4,
        "composition": {"C": 0.07, "Cr": 15.0, "Ni": 5.0, "Cu": 3.5, "Nb": 0.30},
        "h_conditions": {
            "Condition A": {"hrc": None, "tensile": 1070, "yield": 795},
            "H900": {"hrc": 44, "tensile": 1310, "yield": 1170},
            "H925": {"hrc": 42, "tensile": 1240, "yield": 1105},
            "H1025": {"hrc": 38, "tensile": 1070, "yield": 1000},
            "H1075": {"hrc": 36, "tensile": 1000, "yield": 860},
            "H1100": {"hrc": 34, "tensile": 965, "yield": 795},
            "H1150": {"hrc": 31, "tensile": 860, "yield": 620},
        }
    },
    "17-7PH": {
        "name": "17-7 PH", "uns": "S17700", "din": "1.4568", "en": "X7CrNiAl17-7",
        "condition_A_hb": 229,
        "base_kc11": 2650, "base_mc": 0.22, "base_speed": 85,
        "base_taylor_C": 165, "base_taylor_n": 0.17,
        "base_jc": {"A": 430, "B": 920, "n": 0.42, "C": 0.042, "m": 0.94},
        "density": 7800, "thermal_cond": 16.4,
        "composition": {"C": 0.09, "Cr": 17.0, "Ni": 7.0, "Al": 1.0},
        "h_conditions": {
            "Condition A": {"hrc": None, "tensile": 860, "yield": 275},
            "TH1050": {"hrc": 40, "tensile": 1170, "yield": 1030},
            "RH950": {"hrc": 46, "tensile": 1450, "yield": 1310},
            "CH900": {"hrc": 48, "tensile": 1650, "yield": 1520},
        }
    },
    "PH13-8Mo": {
        "name": "PH 13-8 Mo", "uns": "S13800", "din": "1.4534", "en": "X3CrNiMoAl13-8-2",
        "condition_A_hb": 302,
        "base_kc11": 2850, "base_mc": 0.21, "base_speed": 70,
        "base_taylor_C": 145, "base_taylor_n": 0.15,
        "base_jc": {"A": 500, "B": 1000, "n": 0.38, "C": 0.035, "m": 0.90},
        "density": 7800, "thermal_cond": 13.0,
        "composition": {"C": 0.05, "Cr": 12.75, "Ni": 8.0, "Mo": 2.25, "Al": 1.1},
        "h_conditions": {
            "Condition A": {"hrc": None, "tensile": 1000, "yield": 585},
            "H950": {"hrc": 48, "tensile": 1520, "yield": 1410},
            "H1000": {"hrc": 46, "tensile": 1410, "yield": 1275},
            "H1025": {"hrc": 44, "tensile": 1310, "yield": 1170},
            "H1050": {"hrc": 42, "tensile": 1240, "yield": 1105},
            "H1100": {"hrc": 38, "tensile": 1105, "yield": 965},
            "H1150": {"hrc": 34, "tensile": 965, "yield": 795},
        }
    },
    "Custom465": {
        "name": "Custom 465", "uns": "S46500", "din": "", "en": "",
        "condition_A_hb": 321,
        "base_kc11": 2950, "base_mc": 0.21, "base_speed": 65,
        "base_taylor_C": 140, "base_taylor_n": 0.15,
        "base_jc": {"A": 520, "B": 1030, "n": 0.36, "C": 0.032, "m": 0.88},
        "density": 7830, "thermal_cond": 14.7,
        "composition": {"C": 0.02, "Cr": 11.5, "Ni": 11.0, "Mo": 1.0, "Ti": 1.6},
        "h_conditions": {
            "Condition A": {"hrc": None, "tensile": 895, "yield": 550},
            "H900": {"hrc": 51, "tensile": 1760, "yield": 1655},
            "H950": {"hrc": 49, "tensile": 1655, "yield": 1550},
            "H1000": {"hrc": 47, "tensile": 1520, "yield": 1410},
            "H1025": {"hrc": 45, "tensile": 1410, "yield": 1310},
            "H1100": {"hrc": 40, "tensile": 1170, "yield": 1070},
            "H1150": {"hrc": 36, "tensile": 1000, "yield": 860},
        }
    },
}

# =============================================================================
# PHYSICS ADJUSTMENT FUNCTIONS
# =============================================================================

def adjust_for_hardness(base_kc11, base_mc, base_taylor_C, base_taylor_n, base_speed, hrc, annealed_hb):
    """Adjust cutting parameters for hardened martensitic/PH stainless"""
    if hrc is None:
        return base_kc11, base_mc, base_taylor_C, base_taylor_n, base_speed
    
    hb = hrc_to_hb(hrc)
    ratio = hb / annealed_hb
    
    # Handle cases where hardened HB is less than or equal to annealed
    if ratio <= 1:
        return base_kc11, base_mc, base_taylor_C, base_taylor_n, base_speed
    
    kc11 = int(base_kc11 * (1 + 0.5 * (ratio - 1) ** 1.1))
    kc11 = min(int(base_kc11 * 2.5), kc11)
    
    mc = round(base_mc * (1 - 0.002 * (hrc - 35)) if hrc > 35 else base_mc, 2)
    mc = max(0.15, min(0.25, mc))
    
    taylor_C = int(base_taylor_C / (ratio ** 1.2))
    taylor_C = max(15, taylor_C)
    
    taylor_n = round(base_taylor_n * (1 - 0.004 * (hrc - 35)) if hrc > 35 else base_taylor_n, 2)
    taylor_n = max(0.08, min(0.18, taylor_n))
    
    speed = int(base_speed / (ratio ** 1.1))
    speed = max(12, speed)
    
    return kc11, mc, taylor_C, taylor_n, speed

def get_tooling_for_stainless(condition_type, hrc=None):
    """Get appropriate tooling recommendation"""
    if condition_type == "austenitic":
        return {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": ["TiAlN", "AlCrN", "TiCN"],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
        }
    elif hrc is None:  # Annealed martensitic/PH
        return {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": ["TiAlN", "TiCN"],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
        }
    elif hrc < 42:
        return {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": ["TiAlN", "AlCrN"],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
        }
    elif hrc < 50:
        return {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": ["None"],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
        }
    else:
        return {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": ["None"],
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
        }

# =============================================================================
# MATERIAL GENERATION
# =============================================================================

def generate_austenitic_materials(start_id):
    """Generate austenitic cold-worked conditions"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in AUSTENITIC_GRADES.items():
        for cond_name, cond in AUSTENITIC_CONDITIONS.items():
            mat_id_str = f"M-SS-{mat_id:03d}"
            
            tensile = int(grade["annealed_tensile"] * cond["tensile_mult"])
            yield_str = int(grade["annealed_yield"] * cond["yield_mult"])
            hb = int(grade["annealed_hb"] * cond["hb_mult"])
            kc11 = int(grade["base_kc11"] * cond["kc11_mult"])
            speed = int(grade["base_speed"] * cond["speed_mult"])
            taylor_C = int(grade["base_taylor_C"] * cond["taylor_C_mult"])
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {cond_name}",
                "designation": {
                    "aisi": grade["name"],
                    "uns": grade["uns"],
                    "din": grade["din"],
                    "en": grade["en"]
                },
                "iso_group": "M",
                "material_class": "Stainless Steel - Austenitic",
                "condition": cond_name,
                "composition": grade["composition"],
                "physical": {
                    "density": grade["density"],
                    "thermal_conductivity": grade["thermal_cond"],
                    "elastic_modulus": 193000,
                    "poissons_ratio": 0.29
                },
                "mechanical": {
                    "hardness": {"brinell": hb, "rockwell_b": min(100, int(hb * 0.52))},
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": cond["elongation"]}
                },
                "kienzle": {"kc1_1": kc11, "mc": grade["base_mc"]},
                "taylor": {"C": taylor_C, "n": grade["base_taylor_n"]},
                "johnson_cook": grade["base_jc"].copy(),
                "recommended_cutting": {
                    "turning": {
                        "carbide": {
                            "speed": {"min": int(speed * 0.7), "opt": speed, "max": int(speed * 1.3)}
                        }
                    }
                },
                "tooling": get_tooling_for_stainless("austenitic"),
                "applications": ["chemical_processing", "food_equipment", "medical", "aerospace"]
            }
            mat_id += 1
    
    return materials, mat_id

def generate_martensitic_materials(start_id):
    """Generate martensitic hardened conditions"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in MARTENSITIC_GRADES.items():
        for hrc in grade["conditions"]:
            mat_id_str = f"M-SS-{mat_id:03d}"
            
            if hrc is None:
                condition = "Annealed"
                hb = grade["annealed_hb"]
                kc11 = grade["base_kc11"]
                mc = grade["base_mc"]
                taylor_C = grade["base_taylor_C"]
                taylor_n = grade["base_taylor_n"]
                speed = grade["base_speed"]
                tensile = int(hb * 3.45)
                yield_str = int(tensile * 0.65)
            else:
                condition = f"Hardened {hrc} HRC"
                hb = hrc_to_hb(hrc)
                kc11, mc, taylor_C, taylor_n, speed = adjust_for_hardness(
                    grade["base_kc11"], grade["base_mc"],
                    grade["base_taylor_C"], grade["base_taylor_n"],
                    grade["base_speed"], hrc, grade["annealed_hb"]
                )
                tensile = hrc_to_tensile(hrc)
                yield_str = int(tensile * 0.85)
            
            hardness = {"brinell": hb}
            if hrc:
                hardness["rockwell_c"] = hrc
            else:
                hardness["rockwell_b"] = min(100, int(hb * 0.52))
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {
                    "aisi": grade["name"],
                    "uns": grade["uns"],
                    "din": grade["din"],
                    "en": grade["en"]
                },
                "iso_group": "M" if hrc is None or hrc < 50 else "H",
                "material_class": "Stainless Steel - Martensitic",
                "condition": condition,
                "composition": grade["composition"],
                "physical": {
                    "density": grade["density"],
                    "thermal_conductivity": grade["thermal_cond"],
                    "elastic_modulus": 200000,
                    "poissons_ratio": 0.29
                },
                "mechanical": {
                    "hardness": hardness,
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": max(2, 25 - (hrc - 30) // 2) if hrc else 25}
                },
                "kienzle": {"kc1_1": kc11, "mc": mc},
                "taylor": {"C": taylor_C, "n": taylor_n},
                "johnson_cook": grade["base_jc"].copy(),
                "recommended_cutting": {
                    "turning": {
                        "carbide": {
                            "speed": {"min": int(speed * 0.7), "opt": speed, "max": int(speed * 1.35)}
                        }
                    }
                },
                "tooling": get_tooling_for_stainless("martensitic", hrc),
                "applications": ["cutlery", "bearings", "valve_components", "surgical_instruments"]
            }
            mat_id += 1
    
    return materials, mat_id

def generate_ph_materials(start_id):
    """Generate PH stainless with complete H-series conditions"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in PH_GRADES.items():
        for cond_name, cond_data in grade["h_conditions"].items():
            mat_id_str = f"M-SS-{mat_id:03d}"
            
            hrc = cond_data["hrc"]
            tensile = cond_data["tensile"]
            yield_str = cond_data["yield"]
            
            if hrc is None:
                hb = grade["condition_A_hb"]
                kc11 = grade["base_kc11"]
                mc = grade["base_mc"]
                taylor_C = grade["base_taylor_C"]
                taylor_n = grade["base_taylor_n"]
                speed = grade["base_speed"]
            else:
                hb = hrc_to_hb(hrc)
                kc11, mc, taylor_C, taylor_n, speed = adjust_for_hardness(
                    grade["base_kc11"], grade["base_mc"],
                    grade["base_taylor_C"], grade["base_taylor_n"],
                    grade["base_speed"], hrc, grade["condition_A_hb"]
                )
            
            hardness = {"brinell": hb}
            if hrc:
                hardness["rockwell_c"] = hrc
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {cond_name}",
                "designation": {
                    "aisi": grade["name"].replace(" ", ""),
                    "uns": grade["uns"],
                    "din": grade["din"],
                    "en": grade["en"]
                },
                "iso_group": "M" if hrc is None or hrc < 45 else "H",
                "material_class": "Stainless Steel - Precipitation Hardening",
                "condition": cond_name,
                "composition": grade["composition"],
                "physical": {
                    "density": grade["density"],
                    "thermal_conductivity": grade["thermal_cond"],
                    "elastic_modulus": 197000,
                    "poissons_ratio": 0.29
                },
                "mechanical": {
                    "hardness": hardness,
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": max(4, 16 - (hrc - 30) // 3) if hrc else 16}
                },
                "kienzle": {"kc1_1": kc11, "mc": mc},
                "taylor": {"C": taylor_C, "n": taylor_n},
                "johnson_cook": grade["base_jc"].copy(),
                "recommended_cutting": {
                    "turning": {
                        "carbide": {
                            "speed": {"min": int(speed * 0.7), "opt": speed, "max": int(speed * 1.35)}
                        }
                    }
                },
                "tooling": get_tooling_for_stainless("ph", hrc),
                "applications": ["aerospace", "medical_devices", "nuclear", "high_strength_fasteners"]
            }
            mat_id += 1
    
    return materials, mat_id

# =============================================================================
# MAIN
# =============================================================================

def main():
    print("PRISM Stainless Steel Conditions Generator v1.0")
    print("=" * 60)
    
    all_materials = {}
    next_id = 201  # Start after existing stainless (M-SS-001 to M-SS-100)
    
    # Generate austenitic cold-worked
    aus_mats, next_id = generate_austenitic_materials(next_id)
    all_materials.update(aus_mats)
    print(f"Generated {len(aus_mats)} austenitic cold-worked conditions")
    
    # Generate martensitic hardened
    mart_mats, next_id = generate_martensitic_materials(next_id)
    all_materials.update(mart_mats)
    print(f"Generated {len(mart_mats)} martensitic hardened conditions")
    
    # Generate PH H-series
    ph_mats, next_id = generate_ph_materials(next_id)
    all_materials.update(ph_mats)
    print(f"Generated {len(ph_mats)} PH stainless H-conditions")
    
    print(f"\nTOTAL: {len(all_materials)} new stainless steel materials")
    
    # Generate JavaScript output
    output = f'''/**
 * PRISM MATERIALS DATABASE - Stainless Steel Conditions
 * File: stainless_conditions_generated.js
 * 
 * COMPREHENSIVE COVERAGE:
 * - Austenitic (304, 316, etc.): Annealed + Cold Worked (1/4 to Full Hard)
 * - Martensitic (410, 420, 440): Annealed + Hardened (35-60 HRC)
 * - PH Stainless (17-4, 15-5, etc.): Complete H-series conditions
 * 
 * Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 */

const STAINLESS_CONDITIONS = {{
  metadata: {{
    file: "stainless_conditions_generated.js",
    category: "M_STAINLESS",
    materialCount: {len(all_materials)},
    idRange: {{ start: "M-SS-201", end: "M-SS-{200 + len(all_materials):03d}" }},
    coverage: {{
      austenitic: {len(aus_mats)},
      martensitic: {len(mart_mats)},
      ph_stainless: {len(ph_mats)}
    }}
  }},

  materials: {{
'''
    
    mat_items = list(all_materials.items())
    for i, (mat_id, mat_data) in enumerate(mat_items):
        output += f'    "{mat_id}": {json.dumps(mat_data, indent=6)}'
        if i < len(mat_items) - 1:
            output += ","
        output += "\n"
    
    output += '''  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = STAINLESS_CONDITIONS;
}
'''
    
    output_path = r"C:\\PRISM\EXTRACTED\materials\M_STAINLESS\stainless_conditions_generated.js"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"\nOutput: {output_path}")
    print(f"File size: {len(output) / 1024:.1f} KB")

if __name__ == "__main__":
    main()
