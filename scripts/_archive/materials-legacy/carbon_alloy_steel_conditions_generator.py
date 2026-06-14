#!/usr/bin/env python3
"""
PRISM Carbon & Alloy Steel Conditions Generator v1.0
=====================================================
Generates carbon and alloy steels at ALL realistic heat treatment conditions.

CRITICAL MANUFACTURING INTELLIGENCE:
- Low carbon (1008-1025): Not Q&T hardenable, only Hot Rolled/Cold Drawn/Annealed
- Medium carbon (1030-1055): Q&T to 22-40 HRC common
- High carbon (1060-1095): Q&T to 35-58 HRC, spring/tool applications
- Alloy steels (4140, 4340): Q&T to 22-54 HRC, aerospace/defense

The same steel at different Q&T levels has DRAMATICALLY different machining:
- 4140 Annealed: Vc = 120 m/min, kc1.1 = 1800 N/mm²
- 4140 Q&T 28 HRC: Vc = 90 m/min, kc1.1 = 2200 N/mm²
- 4140 Q&T 40 HRC: Vc = 55 m/min, kc1.1 = 2900 N/mm²
- 4140 Q&T 50 HRC: Vc = 25 m/min, kc1.1 = 3800 N/mm², Ceramic/CBN

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
    """Approximate tensile from HRC (MPa)"""
    return int(hrc_to_hb(hrc) * 3.45)

# =============================================================================
# LOW CARBON STEELS (1008-1025) - Not Q&T hardenable
# =============================================================================

LOW_CARBON_GRADES = {
    "1008": {
        "name": "AISI 1008", "uns": "G10080", "din": "1.0330", "en": "DC01",
        "carbon": 0.08, "manganese": 0.35,
        "annealed_hb": 95, "annealed_tensile": 340, "annealed_yield": 190,
        "base_kc11": 1450, "base_mc": 0.26, "base_speed": 200,
        "base_taylor_C": 350, "base_taylor_n": 0.25,
        "base_jc": {"A": 180, "B": 500, "n": 0.40, "C": 0.06, "m": 1.0},
        "conditions": ["Hot Rolled", "Cold Drawn", "Annealed"],
    },
    "1010": {
        "name": "AISI 1010", "uns": "G10100", "din": "1.0301", "en": "C10E",
        "carbon": 0.10, "manganese": 0.40,
        "annealed_hb": 105, "annealed_tensile": 365, "annealed_yield": 205,
        "base_kc11": 1500, "base_mc": 0.26, "base_speed": 195,
        "base_taylor_C": 340, "base_taylor_n": 0.25,
        "base_jc": {"A": 190, "B": 520, "n": 0.40, "C": 0.06, "m": 1.0},
        "conditions": ["Hot Rolled", "Cold Drawn", "Annealed"],
    },
    "1015": {
        "name": "AISI 1015", "uns": "G10150", "din": "1.0401", "en": "C15E",
        "carbon": 0.15, "manganese": 0.45,
        "annealed_hb": 111, "annealed_tensile": 385, "annealed_yield": 230,
        "base_kc11": 1550, "base_mc": 0.25, "base_speed": 190,
        "base_taylor_C": 330, "base_taylor_n": 0.24,
        "base_jc": {"A": 210, "B": 550, "n": 0.38, "C": 0.055, "m": 1.0},
        "conditions": ["Hot Rolled", "Cold Drawn", "Annealed"],
    },
    "1018": {
        "name": "AISI 1018", "uns": "G10180", "din": "1.0453", "en": "C18E",
        "carbon": 0.18, "manganese": 0.75,
        "annealed_hb": 126, "annealed_tensile": 440, "annealed_yield": 260,
        "base_kc11": 1600, "base_mc": 0.25, "base_speed": 180,
        "base_taylor_C": 320, "base_taylor_n": 0.24,
        "base_jc": {"A": 235, "B": 580, "n": 0.36, "C": 0.05, "m": 1.0},
        "conditions": ["Hot Rolled", "Cold Drawn", "Annealed"],
    },
    "1020": {
        "name": "AISI 1020", "uns": "G10200", "din": "1.0402", "en": "C22E",
        "carbon": 0.20, "manganese": 0.45,
        "annealed_hb": 121, "annealed_tensile": 420, "annealed_yield": 250,
        "base_kc11": 1620, "base_mc": 0.25, "base_speed": 175,
        "base_taylor_C": 310, "base_taylor_n": 0.24,
        "base_jc": {"A": 245, "B": 600, "n": 0.35, "C": 0.05, "m": 1.0},
        "conditions": ["Hot Rolled", "Cold Drawn", "Annealed"],
    },
    "1022": {
        "name": "AISI 1022", "uns": "G10220", "din": "", "en": "",
        "carbon": 0.22, "manganese": 0.80,
        "annealed_hb": 137, "annealed_tensile": 475, "annealed_yield": 275,
        "base_kc11": 1680, "base_mc": 0.25, "base_speed": 170,
        "base_taylor_C": 300, "base_taylor_n": 0.23,
        "base_jc": {"A": 260, "B": 620, "n": 0.34, "C": 0.05, "m": 1.0},
        "conditions": ["Hot Rolled", "Cold Drawn", "Annealed"],
    },
    "1025": {
        "name": "AISI 1025", "uns": "G10250", "din": "1.0406", "en": "C25E",
        "carbon": 0.25, "manganese": 0.50,
        "annealed_hb": 131, "annealed_tensile": 455, "annealed_yield": 270,
        "base_kc11": 1700, "base_mc": 0.25, "base_speed": 165,
        "base_taylor_C": 290, "base_taylor_n": 0.23,
        "base_jc": {"A": 275, "B": 640, "n": 0.33, "C": 0.048, "m": 1.0},
        "conditions": ["Hot Rolled", "Cold Drawn", "Annealed"],
    },
}

# =============================================================================
# MEDIUM CARBON STEELS (1030-1055) - Q&T hardenable
# =============================================================================

MEDIUM_CARBON_GRADES = {
    "1030": {
        "name": "AISI 1030", "uns": "G10300", "din": "1.0528", "en": "C30E",
        "carbon": 0.30, "manganese": 0.70,
        "annealed_hb": 137, "annealed_tensile": 480, "annealed_yield": 290,
        "base_kc11": 1750, "base_mc": 0.24, "base_speed": 155,
        "base_taylor_C": 280, "base_taylor_n": 0.22,
        "base_jc": {"A": 295, "B": 680, "n": 0.32, "C": 0.045, "m": 0.98},
        "max_hrc": 35,
        "qt_conditions": [22, 25, 28, 30, 32],
    },
    "1035": {
        "name": "AISI 1035", "uns": "G10350", "din": "1.0501", "en": "C35E",
        "carbon": 0.35, "manganese": 0.70,
        "annealed_hb": 149, "annealed_tensile": 520, "annealed_yield": 315,
        "base_kc11": 1800, "base_mc": 0.24, "base_speed": 145,
        "base_taylor_C": 265, "base_taylor_n": 0.22,
        "base_jc": {"A": 320, "B": 720, "n": 0.30, "C": 0.042, "m": 0.97},
        "max_hrc": 40,
        "qt_conditions": [22, 25, 28, 30, 32, 35, 38],
    },
    "1040": {
        "name": "AISI 1040", "uns": "G10400", "din": "1.0511", "en": "C40E",
        "carbon": 0.40, "manganese": 0.75,
        "annealed_hb": 170, "annealed_tensile": 590, "annealed_yield": 360,
        "base_kc11": 1850, "base_mc": 0.24, "base_speed": 135,
        "base_taylor_C": 250, "base_taylor_n": 0.21,
        "base_jc": {"A": 350, "B": 760, "n": 0.28, "C": 0.04, "m": 0.96},
        "max_hrc": 45,
        "qt_conditions": [22, 25, 28, 30, 32, 35, 38, 40],
    },
    "1045": {
        "name": "AISI 1045", "uns": "G10450", "din": "1.0503", "en": "C45E",
        "carbon": 0.45, "manganese": 0.75,
        "annealed_hb": 179, "annealed_tensile": 625, "annealed_yield": 385,
        "base_kc11": 1900, "base_mc": 0.23, "base_speed": 125,
        "base_taylor_C": 235, "base_taylor_n": 0.21,
        "base_jc": {"A": 380, "B": 800, "n": 0.26, "C": 0.038, "m": 0.95},
        "max_hrc": 50,
        "qt_conditions": [22, 25, 28, 30, 32, 35, 38, 40, 45],
    },
    "1050": {
        "name": "AISI 1050", "uns": "G10500", "din": "1.0540", "en": "C50E",
        "carbon": 0.50, "manganese": 0.75,
        "annealed_hb": 187, "annealed_tensile": 655, "annealed_yield": 400,
        "base_kc11": 1950, "base_mc": 0.23, "base_speed": 115,
        "base_taylor_C": 220, "base_taylor_n": 0.20,
        "base_jc": {"A": 400, "B": 840, "n": 0.25, "C": 0.036, "m": 0.94},
        "max_hrc": 55,
        "qt_conditions": [22, 25, 28, 30, 32, 35, 38, 40, 45, 50],
    },
    "1055": {
        "name": "AISI 1055", "uns": "G10550", "din": "1.0535", "en": "C55E",
        "carbon": 0.55, "manganese": 0.80,
        "annealed_hb": 192, "annealed_tensile": 675, "annealed_yield": 415,
        "base_kc11": 2000, "base_mc": 0.23, "base_speed": 110,
        "base_taylor_C": 210, "base_taylor_n": 0.20,
        "base_jc": {"A": 420, "B": 870, "n": 0.24, "C": 0.035, "m": 0.93},
        "max_hrc": 58,
        "qt_conditions": [25, 28, 30, 32, 35, 38, 40, 45, 50, 55],
    },
}

# =============================================================================
# HIGH CARBON STEELS (1060-1095) - Spring/Tool applications
# =============================================================================

HIGH_CARBON_GRADES = {
    "1060": {
        "name": "AISI 1060", "uns": "G10600", "din": "1.0601", "en": "C60E",
        "carbon": 0.60, "manganese": 0.75,
        "annealed_hb": 201, "annealed_tensile": 700, "annealed_yield": 430,
        "base_kc11": 2050, "base_mc": 0.23, "base_speed": 100,
        "base_taylor_C": 200, "base_taylor_n": 0.19,
        "base_jc": {"A": 440, "B": 900, "n": 0.23, "C": 0.034, "m": 0.92},
        "max_hrc": 60,
        "qt_conditions": [35, 40, 45, 50, 55, 58],
    },
    "1070": {
        "name": "AISI 1070", "uns": "G10700", "din": "1.0615", "en": "C70E",
        "carbon": 0.70, "manganese": 0.70,
        "annealed_hb": 201, "annealed_tensile": 700, "annealed_yield": 430,
        "base_kc11": 2100, "base_mc": 0.22, "base_speed": 90,
        "base_taylor_C": 185, "base_taylor_n": 0.18,
        "base_jc": {"A": 460, "B": 930, "n": 0.22, "C": 0.032, "m": 0.91},
        "max_hrc": 62,
        "qt_conditions": [40, 45, 50, 55, 58, 60],
    },
    "1074": {
        "name": "AISI 1074", "uns": "G10740", "din": "", "en": "",
        "carbon": 0.74, "manganese": 0.55,
        "annealed_hb": 207, "annealed_tensile": 720, "annealed_yield": 440,
        "base_kc11": 2150, "base_mc": 0.22, "base_speed": 85,
        "base_taylor_C": 175, "base_taylor_n": 0.18,
        "base_jc": {"A": 475, "B": 950, "n": 0.21, "C": 0.031, "m": 0.90},
        "max_hrc": 63,
        "qt_conditions": [42, 45, 50, 55, 58, 60],
    },
    "1080": {
        "name": "AISI 1080", "uns": "G10800", "din": "1.1248", "en": "C80E",
        "carbon": 0.80, "manganese": 0.70,
        "annealed_hb": 207, "annealed_tensile": 720, "annealed_yield": 440,
        "base_kc11": 2200, "base_mc": 0.22, "base_speed": 80,
        "base_taylor_C": 165, "base_taylor_n": 0.17,
        "base_jc": {"A": 490, "B": 970, "n": 0.20, "C": 0.03, "m": 0.89},
        "max_hrc": 64,
        "qt_conditions": [45, 50, 55, 58, 60, 62],
    },
    "1084": {
        "name": "AISI 1084", "uns": "G10840", "din": "", "en": "",
        "carbon": 0.84, "manganese": 0.75,
        "annealed_hb": 212, "annealed_tensile": 740, "annealed_yield": 450,
        "base_kc11": 2250, "base_mc": 0.22, "base_speed": 75,
        "base_taylor_C": 155, "base_taylor_n": 0.17,
        "base_jc": {"A": 500, "B": 985, "n": 0.19, "C": 0.029, "m": 0.88},
        "max_hrc": 65,
        "qt_conditions": [45, 50, 55, 58, 60, 62],
    },
    "1090": {
        "name": "AISI 1090", "uns": "G10900", "din": "1.1273", "en": "C90E",
        "carbon": 0.90, "manganese": 0.70,
        "annealed_hb": 217, "annealed_tensile": 760, "annealed_yield": 460,
        "base_kc11": 2300, "base_mc": 0.21, "base_speed": 70,
        "base_taylor_C": 145, "base_taylor_n": 0.16,
        "base_jc": {"A": 515, "B": 1000, "n": 0.18, "C": 0.028, "m": 0.87},
        "max_hrc": 65,
        "qt_conditions": [48, 52, 55, 58, 60, 62],
    },
    "1095": {
        "name": "AISI 1095", "uns": "G10950", "din": "1.1274", "en": "C100E",
        "carbon": 0.95, "manganese": 0.40,
        "annealed_hb": 217, "annealed_tensile": 760, "annealed_yield": 460,
        "base_kc11": 2350, "base_mc": 0.21, "base_speed": 65,
        "base_taylor_C": 140, "base_taylor_n": 0.16,
        "base_jc": {"A": 530, "B": 1020, "n": 0.17, "C": 0.027, "m": 0.86},
        "max_hrc": 66,
        "qt_conditions": [50, 55, 58, 60, 62, 64],
    },
}

# =============================================================================
# CHROMOLY ALLOY STEELS (4130-4150)
# =============================================================================

CHROMOLY_GRADES = {
    "4130": {
        "name": "AISI 4130", "uns": "G41300", "din": "1.7218", "en": "25CrMo4",
        "carbon": 0.30, "manganese": 0.50, "chromium": 1.0, "molybdenum": 0.20,
        "annealed_hb": 156, "annealed_tensile": 560, "annealed_yield": 360,
        "base_kc11": 1850, "base_mc": 0.24, "base_speed": 130,
        "base_taylor_C": 240, "base_taylor_n": 0.21,
        "base_jc": {"A": 340, "B": 750, "n": 0.30, "C": 0.04, "m": 0.95},
        "max_hrc": 45,
        "qt_conditions": [22, 25, 28, 30, 32, 35, 38, 40, 42],
    },
    "4140": {
        "name": "AISI 4140", "uns": "G41400", "din": "1.7225", "en": "42CrMo4",
        "carbon": 0.40, "manganese": 0.85, "chromium": 1.0, "molybdenum": 0.20,
        "annealed_hb": 197, "annealed_tensile": 690, "annealed_yield": 460,
        "base_kc11": 1950, "base_mc": 0.23, "base_speed": 115,
        "base_taylor_C": 220, "base_taylor_n": 0.20,
        "base_jc": {"A": 400, "B": 840, "n": 0.26, "C": 0.036, "m": 0.93},
        "max_hrc": 55,
        "qt_conditions": [22, 25, 28, 30, 32, 35, 38, 40, 45, 50],
    },
    "4145": {
        "name": "AISI 4145", "uns": "G41450", "din": "1.7228", "en": "45CrMo4",
        "carbon": 0.45, "manganese": 0.85, "chromium": 1.0, "molybdenum": 0.20,
        "annealed_hb": 207, "annealed_tensile": 725, "annealed_yield": 485,
        "base_kc11": 2000, "base_mc": 0.23, "base_speed": 110,
        "base_taylor_C": 210, "base_taylor_n": 0.19,
        "base_jc": {"A": 420, "B": 870, "n": 0.25, "C": 0.034, "m": 0.92},
        "max_hrc": 57,
        "qt_conditions": [25, 28, 30, 32, 35, 38, 40, 45, 50, 52],
    },
    "4150": {
        "name": "AISI 4150", "uns": "G41500", "din": "1.7220", "en": "50CrMo4",
        "carbon": 0.50, "manganese": 0.85, "chromium": 1.0, "molybdenum": 0.20,
        "annealed_hb": 217, "annealed_tensile": 760, "annealed_yield": 510,
        "base_kc11": 2050, "base_mc": 0.22, "base_speed": 100,
        "base_taylor_C": 195, "base_taylor_n": 0.19,
        "base_jc": {"A": 445, "B": 900, "n": 0.24, "C": 0.032, "m": 0.91},
        "max_hrc": 60,
        "qt_conditions": [28, 30, 32, 35, 38, 40, 45, 50, 52, 55],
    },
}

# =============================================================================
# HIGH-STRENGTH ALLOY STEELS (4340, 300M, 4330V)
# =============================================================================

HIGH_STRENGTH_GRADES = {
    "4340": {
        "name": "AISI 4340", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
        "carbon": 0.40, "manganese": 0.70, "chromium": 0.80, "molybdenum": 0.25, "nickel": 1.80,
        "annealed_hb": 217, "annealed_tensile": 760, "annealed_yield": 510,
        "base_kc11": 2000, "base_mc": 0.23, "base_speed": 100,
        "base_taylor_C": 200, "base_taylor_n": 0.19,
        "base_jc": {"A": 430, "B": 880, "n": 0.26, "C": 0.035, "m": 0.92},
        "max_hrc": 57,
        "qt_conditions": [28, 30, 32, 35, 38, 40, 45, 50, 52, 54],
    },
    "300M": {
        "name": "300M", "uns": "K44220", "din": "", "en": "",
        "carbon": 0.42, "manganese": 0.75, "chromium": 0.80, "molybdenum": 0.40, "nickel": 1.80, "vanadium": 0.08, "silicon": 1.60,
        "annealed_hb": 277, "annealed_tensile": 965, "annealed_yield": 690,
        "base_kc11": 2250, "base_mc": 0.22, "base_speed": 75,
        "base_taylor_C": 160, "base_taylor_n": 0.17,
        "base_jc": {"A": 520, "B": 980, "n": 0.22, "C": 0.028, "m": 0.88},
        "max_hrc": 58,
        "qt_conditions": [45, 48, 50, 52, 54, 56],
    },
    "4330V": {
        "name": "4330V (Hy-Tuf)", "uns": "K23080", "din": "", "en": "",
        "carbon": 0.30, "manganese": 0.90, "chromium": 0.90, "molybdenum": 0.45, "nickel": 1.80, "vanadium": 0.08,
        "annealed_hb": 241, "annealed_tensile": 840, "annealed_yield": 585,
        "base_kc11": 2100, "base_mc": 0.23, "base_speed": 85,
        "base_taylor_C": 180, "base_taylor_n": 0.18,
        "base_jc": {"A": 470, "B": 920, "n": 0.24, "C": 0.032, "m": 0.90},
        "max_hrc": 52,
        "qt_conditions": [35, 38, 40, 42, 45, 48, 50],
    },
}

# =============================================================================
# CARBURIZING GRADES (4320, 8620, 8622, 9310)
# =============================================================================

CARBURIZING_GRADES = {
    "4320": {
        "name": "AISI 4320", "uns": "G43200", "din": "1.6587", "en": "18CrNiMo7-6",
        "carbon": 0.20, "manganese": 0.55, "chromium": 0.50, "molybdenum": 0.25, "nickel": 1.80,
        "annealed_hb": 163, "annealed_tensile": 570, "annealed_yield": 370,
        "base_kc11": 1750, "base_mc": 0.24, "base_speed": 140,
        "base_taylor_C": 260, "base_taylor_n": 0.22,
        "base_jc": {"A": 330, "B": 720, "n": 0.32, "C": 0.042, "m": 0.95},
        "case_conditions": [58, 60, 62],
    },
    "8620": {
        "name": "AISI 8620", "uns": "G86200", "din": "1.6523", "en": "21NiCrMo2",
        "carbon": 0.20, "manganese": 0.80, "chromium": 0.50, "molybdenum": 0.20, "nickel": 0.55,
        "annealed_hb": 149, "annealed_tensile": 530, "annealed_yield": 340,
        "base_kc11": 1700, "base_mc": 0.24, "base_speed": 145,
        "base_taylor_C": 270, "base_taylor_n": 0.23,
        "base_jc": {"A": 310, "B": 690, "n": 0.34, "C": 0.045, "m": 0.96},
        "case_conditions": [58, 60, 62],
    },
    "8622": {
        "name": "AISI 8622", "uns": "G86220", "din": "1.6541", "en": "23MnNiCrMo5-2",
        "carbon": 0.22, "manganese": 0.85, "chromium": 0.50, "molybdenum": 0.20, "nickel": 0.55,
        "annealed_hb": 156, "annealed_tensile": 550, "annealed_yield": 355,
        "base_kc11": 1720, "base_mc": 0.24, "base_speed": 142,
        "base_taylor_C": 265, "base_taylor_n": 0.22,
        "base_jc": {"A": 320, "B": 705, "n": 0.33, "C": 0.044, "m": 0.96},
        "case_conditions": [58, 60, 62],
    },
    "9310": {
        "name": "AISI 9310", "uns": "G93106", "din": "1.6657", "en": "14NiCrMo13-4",
        "carbon": 0.10, "manganese": 0.55, "chromium": 1.20, "molybdenum": 0.10, "nickel": 3.25,
        "annealed_hb": 170, "annealed_tensile": 600, "annealed_yield": 400,
        "base_kc11": 1800, "base_mc": 0.24, "base_speed": 135,
        "base_taylor_C": 250, "base_taylor_n": 0.21,
        "base_jc": {"A": 350, "B": 750, "n": 0.30, "C": 0.04, "m": 0.94},
        "case_conditions": [58, 60, 62],
    },
}

# =============================================================================
# BEARING/SPRING STEELS (52100, 5160, 6150, 9260)
# =============================================================================

BEARING_SPRING_GRADES = {
    "52100": {
        "name": "AISI 52100", "uns": "G52986", "din": "1.3505", "en": "100Cr6",
        "carbon": 1.00, "manganese": 0.35, "chromium": 1.45,
        "annealed_hb": 207, "annealed_tensile": 720, "annealed_yield": 440,
        "base_kc11": 2300, "base_mc": 0.22, "base_speed": 70,
        "base_taylor_C": 150, "base_taylor_n": 0.16,
        "base_jc": {"A": 500, "B": 980, "n": 0.20, "C": 0.028, "m": 0.88},
        "conditions": ["Spheroidize Annealed", 58, 60, 62, 64],
    },
    "5160": {
        "name": "AISI 5160", "uns": "G51600", "din": "1.7176", "en": "55Cr3",
        "carbon": 0.60, "manganese": 0.85, "chromium": 0.80,
        "annealed_hb": 197, "annealed_tensile": 690, "annealed_yield": 415,
        "base_kc11": 2100, "base_mc": 0.23, "base_speed": 90,
        "base_taylor_C": 180, "base_taylor_n": 0.18,
        "base_jc": {"A": 440, "B": 890, "n": 0.24, "C": 0.033, "m": 0.91},
        "conditions": ["Annealed", 42, 45, 48, 50],
    },
    "6150": {
        "name": "AISI 6150", "uns": "G61500", "din": "1.8159", "en": "50CrV4",
        "carbon": 0.50, "manganese": 0.80, "chromium": 0.95, "vanadium": 0.15,
        "annealed_hb": 197, "annealed_tensile": 690, "annealed_yield": 415,
        "base_kc11": 2100, "base_mc": 0.23, "base_speed": 90,
        "base_taylor_C": 180, "base_taylor_n": 0.18,
        "base_jc": {"A": 445, "B": 895, "n": 0.23, "C": 0.032, "m": 0.90},
        "conditions": ["Annealed", 42, 45, 48, 50],
    },
    "9260": {
        "name": "AISI 9260", "uns": "G92600", "din": "1.0904", "en": "61SiCr7",
        "carbon": 0.60, "manganese": 0.85, "silicon": 2.00,
        "annealed_hb": 201, "annealed_tensile": 700, "annealed_yield": 420,
        "base_kc11": 2150, "base_mc": 0.22, "base_speed": 85,
        "base_taylor_C": 170, "base_taylor_n": 0.17,
        "base_jc": {"A": 455, "B": 910, "n": 0.22, "C": 0.031, "m": 0.89},
        "conditions": ["Annealed", 45, 48, 50, 52],
    },
}

# =============================================================================
# PHYSICS ADJUSTMENT FUNCTIONS
# =============================================================================

def adjust_for_qt(base_kc11, base_mc, base_taylor_C, base_taylor_n, base_speed, hrc, annealed_hb):
    """Adjust cutting parameters for Q&T hardened steel"""
    hb = hrc_to_hb(hrc)
    ratio = hb / annealed_hb
    
    if ratio <= 1:
        return base_kc11, base_mc, base_taylor_C, base_taylor_n, base_speed
    
    # kc1.1 increases with hardness (less ductile, higher forces)
    kc11 = int(base_kc11 * (1 + 0.45 * (ratio - 1) ** 1.1))
    kc11 = min(int(base_kc11 * 2.2), kc11)
    
    # mc decreases slightly at higher hardness
    mc = round(base_mc * (1 - 0.003 * (hrc - 22)) if hrc > 22 else base_mc, 2)
    mc = max(0.16, min(0.26, mc))
    
    # Taylor C drops significantly with hardness
    taylor_C = int(base_taylor_C / (ratio ** 1.15))
    taylor_C = max(20, taylor_C)
    
    # Taylor n drops slightly
    taylor_n = round(base_taylor_n * (1 - 0.005 * (hrc - 22)) if hrc > 22 else base_taylor_n, 2)
    taylor_n = max(0.10, min(0.22, taylor_n))
    
    # Speed drops with hardness
    speed = int(base_speed / (ratio ** 1.05))
    speed = max(15, speed)
    
    return kc11, mc, taylor_C, taylor_n, speed

def get_tooling_for_steel(condition_type, hrc=None):
    """Get appropriate tooling recommendation"""
    if condition_type in ["Hot Rolled", "Cold Drawn", "Annealed", "Normalized"]:
        return {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": ["TiCN", "TiAlN", "Al2O3 MT-CVD"],
            "geometry": "Positive rake 6-12°",
            "coolant": "Flood recommended"
        }
    elif hrc is None:
        return {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": ["TiCN", "TiAlN"],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
        }
    elif hrc < 35:
        return {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": ["TiAlN", "TiCN"],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
        }
    elif hrc < 45:
        return {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": ["TiAlN", "AlCrN"],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
        }
    elif hrc < 52:
        return {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": ["None"],
            "geometry": "Negative rake 5-7°, T-land",
            "coolant": "Dry preferred"
        }
    else:
        return {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": ["None"],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
        }

def get_condition_properties(grade, condition):
    """Get mechanical properties for a specific condition"""
    if condition == "Hot Rolled":
        return {
            "hb": int(grade["annealed_hb"] * 1.05),
            "tensile": int(grade["annealed_tensile"] * 1.05),
            "yield": int(grade["annealed_yield"] * 0.95),
            "elongation": 25,
            "speed_mult": 1.0,
            "kc11_mult": 1.02,
        }
    elif condition == "Cold Drawn":
        return {
            "hb": int(grade["annealed_hb"] * 1.20),
            "tensile": int(grade["annealed_tensile"] * 1.20),
            "yield": int(grade["annealed_yield"] * 1.40),
            "elongation": 15,
            "speed_mult": 0.90,
            "kc11_mult": 1.15,
        }
    elif condition == "Annealed":
        return {
            "hb": grade["annealed_hb"],
            "tensile": grade["annealed_tensile"],
            "yield": grade["annealed_yield"],
            "elongation": 30,
            "speed_mult": 1.0,
            "kc11_mult": 1.0,
        }
    elif condition == "Normalized":
        return {
            "hb": int(grade["annealed_hb"] * 1.08),
            "tensile": int(grade["annealed_tensile"] * 1.08),
            "yield": int(grade["annealed_yield"] * 1.05),
            "elongation": 22,
            "speed_mult": 0.95,
            "kc11_mult": 1.05,
        }
    elif condition == "Spheroidize Annealed":
        return {
            "hb": int(grade["annealed_hb"] * 0.90),
            "tensile": int(grade["annealed_tensile"] * 0.85),
            "yield": int(grade["annealed_yield"] * 0.80),
            "elongation": 35,
            "speed_mult": 1.10,
            "kc11_mult": 0.90,
        }
    else:
        return None

# =============================================================================
# MATERIAL GENERATION
# =============================================================================

def generate_low_carbon_materials(start_id):
    """Generate low carbon steel materials"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in LOW_CARBON_GRADES.items():
        for condition in grade["conditions"]:
            mat_id_str = f"P-CS-{mat_id:03d}"
            props = get_condition_properties(grade, condition)
            
            composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {
                    "aisi": grade_key,
                    "uns": grade["uns"],
                    "din": grade["din"],
                    "en": grade["en"]
                },
                "iso_group": "P",
                "material_class": "Carbon Steel - Low Carbon",
                "condition": condition,
                "composition": composition,
                "physical": {
                    "density": 7850,
                    "thermal_conductivity": 51.9,
                    "elastic_modulus": 200000,
                    "poissons_ratio": 0.29
                },
                "mechanical": {
                    "hardness": {"brinell": props["hb"]},
                    "tensile_strength": {"typical": props["tensile"]},
                    "yield_strength": {"typical": props["yield"]},
                    "elongation": {"typical": props["elongation"]}
                },
                "kienzle": {
                    "kc1_1": int(grade["base_kc11"] * props["kc11_mult"]),
                    "mc": grade["base_mc"]
                },
                "taylor": {
                    "C": int(grade["base_taylor_C"] * props["speed_mult"]),
                    "n": grade["base_taylor_n"]
                },
                "johnson_cook": grade["base_jc"].copy(),
                "recommended_cutting": {
                    "turning": {
                        "carbide": {
                            "speed": {
                                "min": int(grade["base_speed"] * props["speed_mult"] * 0.75),
                                "opt": int(grade["base_speed"] * props["speed_mult"]),
                                "max": int(grade["base_speed"] * props["speed_mult"] * 1.25)
                            }
                        }
                    }
                },
                "tooling": get_tooling_for_steel(condition),
                "applications": ["general_fabrication", "welding", "forming", "fasteners"]
            }
            mat_id += 1
    
    return materials, mat_id

def generate_medium_carbon_materials(start_id):
    """Generate medium carbon steel materials with Q&T conditions"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in MEDIUM_CARBON_GRADES.items():
        # Base conditions
        for condition in ["Hot Rolled", "Cold Drawn", "Annealed", "Normalized"]:
            mat_id_str = f"P-CS-{mat_id:03d}"
            props = get_condition_properties(grade, condition)
            
            composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade["din"], "en": grade["en"]},
                "iso_group": "P",
                "material_class": "Carbon Steel - Medium Carbon",
                "condition": condition,
                "composition": composition,
                "physical": {"density": 7850, "thermal_conductivity": 50.7, "elastic_modulus": 205000, "poissons_ratio": 0.29},
                "mechanical": {
                    "hardness": {"brinell": props["hb"]},
                    "tensile_strength": {"typical": props["tensile"]},
                    "yield_strength": {"typical": props["yield"]},
                    "elongation": {"typical": props["elongation"]}
                },
                "kienzle": {"kc1_1": int(grade["base_kc11"] * props["kc11_mult"]), "mc": grade["base_mc"]},
                "taylor": {"C": int(grade["base_taylor_C"] * props["speed_mult"]), "n": grade["base_taylor_n"]},
                "johnson_cook": grade["base_jc"].copy(),
                "recommended_cutting": {
                    "turning": {"carbide": {"speed": {
                        "min": int(grade["base_speed"] * props["speed_mult"] * 0.75),
                        "opt": int(grade["base_speed"] * props["speed_mult"]),
                        "max": int(grade["base_speed"] * props["speed_mult"] * 1.25)
                    }}}
                },
                "tooling": get_tooling_for_steel(condition),
                "applications": ["shafts", "gears", "axles", "machine_parts"]
            }
            mat_id += 1
        
        # Q&T conditions
        for hrc in grade["qt_conditions"]:
            mat_id_str = f"P-CS-{mat_id:03d}"
            condition = f"Q&T {hrc} HRC"
            
            hb = hrc_to_hb(hrc)
            kc11, mc, taylor_C, taylor_n, speed = adjust_for_qt(
                grade["base_kc11"], grade["base_mc"],
                grade["base_taylor_C"], grade["base_taylor_n"],
                grade["base_speed"], hrc, grade["annealed_hb"]
            )
            
            tensile = hrc_to_tensile(hrc)
            yield_str = int(tensile * 0.90)
            
            composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade["din"], "en": grade["en"]},
                "iso_group": "P" if hrc < 48 else "H",
                "material_class": "Carbon Steel - Medium Carbon",
                "condition": condition,
                "composition": composition,
                "physical": {"density": 7850, "thermal_conductivity": 50.7, "elastic_modulus": 205000, "poissons_ratio": 0.29},
                "mechanical": {
                    "hardness": {"brinell": hb, "rockwell_c": hrc},
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": max(5, 25 - hrc // 3)}
                },
                "kienzle": {"kc1_1": kc11, "mc": mc},
                "taylor": {"C": taylor_C, "n": taylor_n},
                "johnson_cook": grade["base_jc"].copy(),
                "recommended_cutting": {
                    "turning": {"carbide": {"speed": {
                        "min": int(speed * 0.75),
                        "opt": speed,
                        "max": int(speed * 1.25)
                    }}}
                },
                "tooling": get_tooling_for_steel("Q&T", hrc),
                "applications": ["shafts", "gears", "axles", "machine_parts", "high_strength_components"]
            }
            mat_id += 1
    
    return materials, mat_id

def generate_high_carbon_materials(start_id):
    """Generate high carbon steel materials with Q&T conditions"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in HIGH_CARBON_GRADES.items():
        # Annealed and Spheroidize Annealed
        for condition in ["Annealed", "Spheroidize Annealed"]:
            mat_id_str = f"P-CS-{mat_id:03d}"
            props = get_condition_properties(grade, condition)
            
            composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade["din"], "en": grade["en"]},
                "iso_group": "P",
                "material_class": "Carbon Steel - High Carbon",
                "condition": condition,
                "composition": composition,
                "physical": {"density": 7850, "thermal_conductivity": 48.0, "elastic_modulus": 210000, "poissons_ratio": 0.29},
                "mechanical": {
                    "hardness": {"brinell": props["hb"]},
                    "tensile_strength": {"typical": props["tensile"]},
                    "yield_strength": {"typical": props["yield"]},
                    "elongation": {"typical": props["elongation"]}
                },
                "kienzle": {"kc1_1": int(grade["base_kc11"] * props["kc11_mult"]), "mc": grade["base_mc"]},
                "taylor": {"C": int(grade["base_taylor_C"] * props["speed_mult"]), "n": grade["base_taylor_n"]},
                "johnson_cook": grade["base_jc"].copy(),
                "tooling": get_tooling_for_steel(condition),
                "applications": ["springs", "blades", "tools", "wear_parts"]
            }
            mat_id += 1
        
        # Q&T conditions
        for hrc in grade["qt_conditions"]:
            mat_id_str = f"P-CS-{mat_id:03d}"
            condition = f"Q&T {hrc} HRC"
            
            hb = hrc_to_hb(hrc)
            kc11, mc, taylor_C, taylor_n, speed = adjust_for_qt(
                grade["base_kc11"], grade["base_mc"],
                grade["base_taylor_C"], grade["base_taylor_n"],
                grade["base_speed"], hrc, grade["annealed_hb"]
            )
            
            tensile = hrc_to_tensile(hrc)
            yield_str = int(tensile * 0.88)
            
            composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade["din"], "en": grade["en"]},
                "iso_group": "P" if hrc < 48 else "H",
                "material_class": "Carbon Steel - High Carbon",
                "condition": condition,
                "composition": composition,
                "physical": {"density": 7850, "thermal_conductivity": 48.0, "elastic_modulus": 210000, "poissons_ratio": 0.29},
                "mechanical": {
                    "hardness": {"brinell": hb, "rockwell_c": hrc},
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": max(3, 20 - hrc // 4)}
                },
                "kienzle": {"kc1_1": kc11, "mc": mc},
                "taylor": {"C": taylor_C, "n": taylor_n},
                "johnson_cook": grade["base_jc"].copy(),
                "tooling": get_tooling_for_steel("Q&T", hrc),
                "applications": ["springs", "blades", "tools", "wear_parts", "high_hardness_components"]
            }
            mat_id += 1
    
    return materials, mat_id

def generate_alloy_steel_materials(start_id, grades_dict, material_class, applications):
    """Generate alloy steel materials with Q&T conditions"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in grades_dict.items():
        # Annealed and Normalized
        for condition in ["Annealed", "Normalized"]:
            mat_id_str = f"P-AS-{mat_id:03d}"
            props = get_condition_properties(grade, condition)
            
            composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
            if "chromium" in grade: composition["Cr"] = grade["chromium"]
            if "molybdenum" in grade: composition["Mo"] = grade["molybdenum"]
            if "nickel" in grade: composition["Ni"] = grade["nickel"]
            if "vanadium" in grade: composition["V"] = grade["vanadium"]
            if "silicon" in grade: composition["Si"] = grade["silicon"]
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade.get("din", ""), "en": grade.get("en", "")},
                "iso_group": "P",
                "material_class": material_class,
                "condition": condition,
                "composition": composition,
                "physical": {"density": 7850, "thermal_conductivity": 42.0, "elastic_modulus": 205000, "poissons_ratio": 0.29},
                "mechanical": {
                    "hardness": {"brinell": props["hb"]},
                    "tensile_strength": {"typical": props["tensile"]},
                    "yield_strength": {"typical": props["yield"]},
                    "elongation": {"typical": props["elongation"]}
                },
                "kienzle": {"kc1_1": int(grade["base_kc11"] * props["kc11_mult"]), "mc": grade["base_mc"]},
                "taylor": {"C": int(grade["base_taylor_C"] * props["speed_mult"]), "n": grade["base_taylor_n"]},
                "johnson_cook": grade["base_jc"].copy(),
                "tooling": get_tooling_for_steel(condition),
                "applications": applications
            }
            mat_id += 1
        
        # Q&T conditions
        for hrc in grade["qt_conditions"]:
            mat_id_str = f"P-AS-{mat_id:03d}"
            condition = f"Q&T {hrc} HRC"
            
            hb = hrc_to_hb(hrc)
            kc11, mc, taylor_C, taylor_n, speed = adjust_for_qt(
                grade["base_kc11"], grade["base_mc"],
                grade["base_taylor_C"], grade["base_taylor_n"],
                grade["base_speed"], hrc, grade["annealed_hb"]
            )
            
            tensile = hrc_to_tensile(hrc)
            yield_str = int(tensile * 0.92)
            
            composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
            if "chromium" in grade: composition["Cr"] = grade["chromium"]
            if "molybdenum" in grade: composition["Mo"] = grade["molybdenum"]
            if "nickel" in grade: composition["Ni"] = grade["nickel"]
            if "vanadium" in grade: composition["V"] = grade["vanadium"]
            if "silicon" in grade: composition["Si"] = grade["silicon"]
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade.get("din", ""), "en": grade.get("en", "")},
                "iso_group": "P" if hrc < 48 else "H",
                "material_class": material_class,
                "condition": condition,
                "composition": composition,
                "physical": {"density": 7850, "thermal_conductivity": 42.0, "elastic_modulus": 205000, "poissons_ratio": 0.29},
                "mechanical": {
                    "hardness": {"brinell": hb, "rockwell_c": hrc},
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": max(4, 22 - hrc // 3)}
                },
                "kienzle": {"kc1_1": kc11, "mc": mc},
                "taylor": {"C": taylor_C, "n": taylor_n},
                "johnson_cook": grade["base_jc"].copy(),
                "tooling": get_tooling_for_steel("Q&T", hrc),
                "applications": applications
            }
            mat_id += 1
    
    return materials, mat_id

def generate_carburizing_materials(start_id):
    """Generate carburizing steel materials"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in CARBURIZING_GRADES.items():
        # Annealed (before carburizing)
        mat_id_str = f"P-AS-{mat_id:03d}"
        props = get_condition_properties(grade, "Annealed")
        
        composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
        if "chromium" in grade: composition["Cr"] = grade["chromium"]
        if "molybdenum" in grade: composition["Mo"] = grade["molybdenum"]
        if "nickel" in grade: composition["Ni"] = grade["nickel"]
        
        materials[mat_id_str] = {
            "id": mat_id_str,
            "name": f"{grade['name']} Annealed",
            "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade.get("din", ""), "en": grade.get("en", "")},
            "iso_group": "P",
            "material_class": "Alloy Steel - Carburizing Grade",
            "condition": "Annealed",
            "composition": composition,
            "physical": {"density": 7850, "thermal_conductivity": 44.0, "elastic_modulus": 205000, "poissons_ratio": 0.29},
            "mechanical": {
                "hardness": {"brinell": props["hb"]},
                "tensile_strength": {"typical": props["tensile"]},
                "yield_strength": {"typical": props["yield"]},
                "elongation": {"typical": props["elongation"]}
            },
            "kienzle": {"kc1_1": grade["base_kc11"], "mc": grade["base_mc"]},
            "taylor": {"C": grade["base_taylor_C"], "n": grade["base_taylor_n"]},
            "johnson_cook": grade["base_jc"].copy(),
            "tooling": get_tooling_for_steel("Annealed"),
            "applications": ["gears", "shafts", "pinions", "case_hardened_parts"],
            "notes": "Machine in annealed condition before carburizing"
        }
        mat_id += 1
        
        # Case hardened conditions
        for case_hrc in grade["case_conditions"]:
            mat_id_str = f"P-AS-{mat_id:03d}"
            condition = f"Carburized {case_hrc} HRC Case"
            
            # Case hardness for machining, core is softer
            core_hrc = 35  # Typical core hardness after carburizing
            hb_case = hrc_to_hb(case_hrc)
            
            kc11, mc, taylor_C, taylor_n, speed = adjust_for_qt(
                grade["base_kc11"], grade["base_mc"],
                grade["base_taylor_C"], grade["base_taylor_n"],
                grade["base_speed"], case_hrc, grade["annealed_hb"]
            )
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {condition}",
                "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade.get("din", ""), "en": grade.get("en", "")},
                "iso_group": "H",
                "material_class": "Alloy Steel - Carburizing Grade",
                "condition": condition,
                "composition": composition,
                "physical": {"density": 7850, "thermal_conductivity": 44.0, "elastic_modulus": 205000, "poissons_ratio": 0.29},
                "mechanical": {
                    "hardness": {
                        "brinell": hb_case,
                        "rockwell_c": case_hrc,
                        "case_depth_mm": 0.8,
                        "core_hrc": core_hrc
                    },
                    "tensile_strength": {"typical": hrc_to_tensile(case_hrc)},
                    "yield_strength": {"typical": int(hrc_to_tensile(case_hrc) * 0.85)},
                    "elongation": {"typical": 8}
                },
                "kienzle": {"kc1_1": kc11, "mc": mc},
                "taylor": {"C": taylor_C, "n": taylor_n},
                "johnson_cook": grade["base_jc"].copy(),
                "tooling": get_tooling_for_steel("Q&T", case_hrc),
                "applications": ["gears", "shafts", "pinions", "bearings"],
                "notes": f"Hard grinding typically required. Case {case_hrc} HRC, Core ~{core_hrc} HRC"
            }
            mat_id += 1
    
    return materials, mat_id

def generate_bearing_spring_materials(start_id):
    """Generate bearing and spring steel materials"""
    materials = {}
    mat_id = start_id
    
    for grade_key, grade in BEARING_SPRING_GRADES.items():
        for condition in grade["conditions"]:
            mat_id_str = f"P-AS-{mat_id:03d}"
            
            composition = {"C": grade["carbon"], "Mn": grade["manganese"]}
            if "chromium" in grade: composition["Cr"] = grade["chromium"]
            if "silicon" in grade: composition["Si"] = grade["silicon"]
            if "vanadium" in grade: composition["V"] = grade["vanadium"]
            
            if isinstance(condition, int):  # HRC value
                hrc = condition
                cond_name = f"Hardened {hrc} HRC"
                hb = hrc_to_hb(hrc)
                kc11, mc, taylor_C, taylor_n, speed = adjust_for_qt(
                    grade["base_kc11"], grade["base_mc"],
                    grade["base_taylor_C"], grade["base_taylor_n"],
                    grade["base_speed"], hrc, grade["annealed_hb"]
                )
                tensile = hrc_to_tensile(hrc)
                yield_str = int(tensile * 0.90)
                elongation = max(2, 15 - hrc // 5)
                iso_group = "H" if hrc >= 48 else "P"
            else:
                cond_name = condition
                props = get_condition_properties(grade, condition)
                hb = props["hb"]
                hrc = None
                kc11 = int(grade["base_kc11"] * props["kc11_mult"])
                mc = grade["base_mc"]
                taylor_C = int(grade["base_taylor_C"] * props["speed_mult"])
                taylor_n = grade["base_taylor_n"]
                speed = int(grade["base_speed"] * props["speed_mult"])
                tensile = props["tensile"]
                yield_str = props["yield"]
                elongation = props["elongation"]
                iso_group = "P"
            
            hardness = {"brinell": hb}
            if hrc:
                hardness["rockwell_c"] = hrc
            
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{grade['name']} {cond_name}",
                "designation": {"aisi": grade_key, "uns": grade["uns"], "din": grade.get("din", ""), "en": grade.get("en", "")},
                "iso_group": iso_group,
                "material_class": "Alloy Steel - Bearing/Spring",
                "condition": cond_name,
                "composition": composition,
                "physical": {"density": 7850, "thermal_conductivity": 46.0, "elastic_modulus": 210000, "poissons_ratio": 0.29},
                "mechanical": {
                    "hardness": hardness,
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": elongation}
                },
                "kienzle": {"kc1_1": kc11, "mc": mc},
                "taylor": {"C": taylor_C, "n": taylor_n},
                "johnson_cook": grade["base_jc"].copy(),
                "tooling": get_tooling_for_steel(cond_name, hrc),
                "applications": ["bearings", "springs", "races", "rollers"]
            }
            mat_id += 1
    
    return materials, mat_id

# =============================================================================
# MAIN
# =============================================================================

def main():
    print("PRISM Carbon & Alloy Steel Conditions Generator v1.0")
    print("=" * 60)
    
    all_materials = {}
    next_id = 501  # Start after existing steels
    
    # Generate low carbon
    low_c, next_id = generate_low_carbon_materials(next_id)
    all_materials.update(low_c)
    print(f"Generated {len(low_c)} low carbon steel conditions")
    
    # Generate medium carbon
    med_c, next_id = generate_medium_carbon_materials(next_id)
    all_materials.update(med_c)
    print(f"Generated {len(med_c)} medium carbon steel conditions")
    
    # Generate high carbon
    high_c, next_id = generate_high_carbon_materials(next_id)
    all_materials.update(high_c)
    print(f"Generated {len(high_c)} high carbon steel conditions")
    
    # Generate chromoly
    next_id = 701
    chromoly, next_id = generate_alloy_steel_materials(
        next_id, CHROMOLY_GRADES, 
        "Alloy Steel - Chromoly",
        ["aerospace", "automotive", "structural", "hydraulic"]
    )
    all_materials.update(chromoly)
    print(f"Generated {len(chromoly)} chromoly steel conditions")
    
    # Generate high-strength
    high_str, next_id = generate_alloy_steel_materials(
        next_id, HIGH_STRENGTH_GRADES,
        "Alloy Steel - High Strength",
        ["aerospace", "defense", "landing_gear", "critical_components"]
    )
    all_materials.update(high_str)
    print(f"Generated {len(high_str)} high-strength steel conditions")
    
    # Generate carburizing
    carb, next_id = generate_carburizing_materials(next_id)
    all_materials.update(carb)
    print(f"Generated {len(carb)} carburizing steel conditions")
    
    # Generate bearing/spring
    bearing, next_id = generate_bearing_spring_materials(next_id)
    all_materials.update(bearing)
    print(f"Generated {len(bearing)} bearing/spring steel conditions")
    
    print(f"\nTOTAL: {len(all_materials)} new carbon & alloy steel materials")
    
    # Generate JavaScript output
    output = f'''/**
 * PRISM MATERIALS DATABASE - Carbon & Alloy Steel Conditions
 * File: carbon_alloy_steel_conditions.js
 * 
 * COMPREHENSIVE COVERAGE:
 * - Low Carbon (1008-1025): Hot Rolled, Cold Drawn, Annealed
 * - Medium Carbon (1030-1055): + Q&T at 22-55 HRC
 * - High Carbon (1060-1095): + Q&T at 35-64 HRC
 * - Chromoly (4130-4150): Annealed + Q&T at 22-55 HRC
 * - High-Strength (4340, 300M): Annealed + Q&T at 28-56 HRC
 * - Carburizing (8620, 9310): Annealed + Case Hardened 58-62 HRC
 * - Bearing/Spring (52100, 5160): Annealed + Hardened 42-64 HRC
 * 
 * Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 */

const CARBON_ALLOY_STEEL_CONDITIONS = {{
  metadata: {{
    file: "carbon_alloy_steel_conditions.js",
    category: "P_STEELS",
    materialCount: {len(all_materials)},
    coverage: {{
      low_carbon: {len(low_c)},
      medium_carbon: {len(med_c)},
      high_carbon: {len(high_c)},
      chromoly: {len(chromoly)},
      high_strength: {len(high_str)},
      carburizing: {len(carb)},
      bearing_spring: {len(bearing)}
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
  module.exports = CARBON_ALLOY_STEEL_CONDITIONS;
}
'''
    
    output_path = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials\P_STEELS\carbon_alloy_steel_conditions.js"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"\nOutput: {output_path}")
    print(f"File size: {len(output) / 1024:.1f} KB")

if __name__ == "__main__":
    main()
