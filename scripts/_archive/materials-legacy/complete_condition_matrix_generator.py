#!/usr/bin/env python3
"""
PRISM - Complete Condition Matrix Generator v3.0
Ensures FULL comprehensive heat treatment coverage for ALL materials

STRATEGY:
1. Extract all existing materials
2. Identify unique BASE alloys (strip condition from name)
3. Group existing variants by base alloy
4. Define COMPLETE condition matrix per steel type
5. Identify MISSING conditions
6. Generate missing variants with physics-based interpolation

CONDITION MATRICES BY STEEL TYPE:
- Carbon Steels (10xx): 8 conditions (Ann, Norm, CD, HR, Q&T 22-55 HRC)
- Alloy Steels (41xx, 43xx, 86xx): 10 conditions (Ann, Norm, Q&T 22-54 HRC)
- Tool Steels Cold Work: 5 conditions (Ann, H54, H58, H62, H64)
- Tool Steels Hot Work: 7 conditions (Ann, PH38, H44, H48, H52, H54, Nitrided)
- Tool Steels HSS: 4 conditions (Ann, H62, H64, H66)
- Stainless Austenitic: 5 conditions (Ann, 1/4H, 1/2H, 3/4H, FH)
- Stainless Martensitic: 5 conditions (Ann, H35, H40, H50, H55)
- Stainless PH: 6 conditions (CondA, H1150, H1075, H1025, H925, H900)
- Stainless Duplex: 3 conditions (SA, CW25, CW33)
- Bearing Steels: 5 conditions (SphAnn, H58, H60, H62, H64)
- Case Hardening: 5 conditions (Ann, Norm, Carb55, Carb58, Carb62)
"""

import json
import re
import os
from pathlib import Path
from datetime import datetime
from copy import deepcopy
from collections import defaultdict

# Configuration
INPUT_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials")
OUTPUT_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials_complete")
LOG_FILE = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\condition_matrix_log.txt")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


# =============================================================================
# COMPLETE CONDITION MATRICES BY STEEL TYPE
# =============================================================================

CONDITION_MATRICES = {
    "low_carbon_steel": [
        # 10xx series with C < 0.25%
        {"key": "ANN", "name": "Annealed", "hb": 111, "hrc": None},
        {"key": "NORM", "name": "Normalized", "hb": 126, "hrc": None},
        {"key": "HR", "name": "Hot Rolled", "hb": 130, "hrc": None},
        {"key": "CD", "name": "Cold Drawn", "hb": 156, "hrc": None},
        {"key": "SR", "name": "Stress Relieved", "hb": 140, "hrc": None},
    ],
    "medium_carbon_steel": [
        # 10xx series with 0.25% <= C < 0.55%
        {"key": "ANN", "name": "Annealed", "hb": 156, "hrc": None},
        {"key": "NORM", "name": "Normalized", "hb": 179, "hrc": None},
        {"key": "HR", "name": "Hot Rolled", "hb": 183, "hrc": None},
        {"key": "CD", "name": "Cold Drawn", "hb": 212, "hrc": None},
        {"key": "QT22", "name": "Q&T 22 HRC", "hb": 235, "hrc": 22},
        {"key": "QT28", "name": "Q&T 28 HRC", "hb": 277, "hrc": 28},
        {"key": "QT32", "name": "Q&T 32 HRC", "hb": 302, "hrc": 32},
        {"key": "QT38", "name": "Q&T 38 HRC", "hb": 352, "hrc": 38},
        {"key": "QT45", "name": "Q&T 45 HRC", "hb": 430, "hrc": 45},
    ],
    "high_carbon_steel": [
        # 10xx series with C >= 0.55%
        {"key": "ANN", "name": "Annealed", "hb": 183, "hrc": None},
        {"key": "NORM", "name": "Normalized", "hb": 217, "hrc": None},
        {"key": "SPHANN", "name": "Spheroidize Annealed", "hb": 170, "hrc": None},
        {"key": "QT32", "name": "Q&T 32 HRC", "hb": 302, "hrc": 32},
        {"key": "QT38", "name": "Q&T 38 HRC", "hb": 352, "hrc": 38},
        {"key": "QT45", "name": "Q&T 45 HRC", "hb": 430, "hrc": 45},
        {"key": "QT50", "name": "Q&T 50 HRC", "hb": 480, "hrc": 50},
        {"key": "QT55", "name": "Q&T 55 HRC", "hb": 550, "hrc": 55},
    ],
    "free_machining_steel": [
        # 11xx, 12xx series
        {"key": "ANN", "name": "Annealed", "hb": 121, "hrc": None},
        {"key": "HR", "name": "Hot Rolled", "hb": 137, "hrc": None},
        {"key": "CD", "name": "Cold Drawn", "hb": 167, "hrc": None},
        {"key": "SR", "name": "Stress Relieved", "hb": 149, "hrc": None},
    ],
    "alloy_steel_low": [
        # 41xx, 43xx, 46xx, 86xx with lower C
        {"key": "ANN", "name": "Annealed", "hb": 187, "hrc": None},
        {"key": "NORM", "name": "Normalized", "hb": 217, "hrc": None},
        {"key": "QT22", "name": "Q&T 22 HRC", "hb": 235, "hrc": 22},
        {"key": "QT28", "name": "Q&T 28 HRC", "hb": 277, "hrc": 28},
        {"key": "QT32", "name": "Q&T 32 HRC", "hb": 302, "hrc": 32},
        {"key": "QT38", "name": "Q&T 38 HRC", "hb": 352, "hrc": 38},
        {"key": "CD", "name": "Cold Drawn", "hb": 235, "hrc": 22},
    ],
    "alloy_steel_high": [
        # 41xx, 43xx with higher C (4140, 4340)
        {"key": "ANN", "name": "Annealed", "hb": 197, "hrc": None},
        {"key": "NORM", "name": "Normalized", "hb": 229, "hrc": 20},
        {"key": "QT22", "name": "Q&T 22 HRC", "hb": 235, "hrc": 22},
        {"key": "QT28", "name": "Q&T 28 HRC", "hb": 277, "hrc": 28},
        {"key": "QT32", "name": "Q&T 32 HRC", "hb": 302, "hrc": 32},
        {"key": "QT38", "name": "Q&T 38 HRC", "hb": 352, "hrc": 38},
        {"key": "QT45", "name": "Q&T 45 HRC", "hb": 430, "hrc": 45},
        {"key": "QT50", "name": "Q&T 50 HRC", "hb": 480, "hrc": 50},
        {"key": "QT54", "name": "Q&T 54 HRC", "hb": 540, "hrc": 54},
        {"key": "SR", "name": "Stress Relieved 28 HRC", "hb": 277, "hrc": 28},
    ],
    "tool_steel_cold": [
        # D2, A2, O1, S7, W1
        {"key": "ANN", "name": "Annealed", "hb": 217, "hrc": None},
        {"key": "H54", "name": "Hardened 54 HRC", "hb": 540, "hrc": 54},
        {"key": "H58", "name": "Hardened 58 HRC", "hb": 600, "hrc": 58},
        {"key": "H62", "name": "Hardened 62 HRC", "hb": 650, "hrc": 62},
        {"key": "H64", "name": "Hardened 64 HRC", "hb": 700, "hrc": 64},
    ],
    "tool_steel_hot": [
        # H11, H13, H19, H21
        {"key": "ANN", "name": "Annealed", "hb": 192, "hrc": None},
        {"key": "PH38", "name": "Prehardened 38 HRC", "hb": 352, "hrc": 38},
        {"key": "H44", "name": "Hardened 44 HRC", "hb": 420, "hrc": 44},
        {"key": "H48", "name": "Hardened 48 HRC", "hb": 460, "hrc": 48},
        {"key": "H52", "name": "Hardened 52 HRC", "hb": 510, "hrc": 52},
        {"key": "H54", "name": "Hardened 54 HRC", "hb": 540, "hrc": 54},
        {"key": "NIT", "name": "Nitrided 65 HRC Surface", "hb": 540, "hrc": 65, "surface": True},
    ],
    "tool_steel_hss": [
        # M2, M42, T1, T15
        {"key": "ANN", "name": "Annealed", "hb": 235, "hrc": None},
        {"key": "H62", "name": "Hardened 62 HRC", "hb": 650, "hrc": 62},
        {"key": "H64", "name": "Hardened 64 HRC", "hb": 700, "hrc": 64},
        {"key": "H66", "name": "Hardened 66 HRC", "hb": 750, "hrc": 66},
    ],
    "tool_steel_mold": [
        # P20, 420 mold
        {"key": "ANN", "name": "Annealed", "hb": 150, "hrc": None},
        {"key": "PH30", "name": "Prehardened 30 HRC", "hb": 285, "hrc": 30},
        {"key": "PH36", "name": "Prehardened 36 HRC", "hb": 340, "hrc": 36},
        {"key": "H40", "name": "Hardened 40 HRC", "hb": 375, "hrc": 40},
        {"key": "H50", "name": "Hardened 50 HRC", "hb": 480, "hrc": 50},
    ],
    "stainless_austenitic": [
        # 301, 302, 303, 304, 316, 321, 347
        {"key": "ANN", "name": "Annealed", "hb": 150, "hrc": None},
        {"key": "CW14", "name": "Cold Worked 1/4 Hard", "hb": 200, "hrc": None},
        {"key": "CW12", "name": "Cold Worked 1/2 Hard", "hb": 250, "hrc": 24},
        {"key": "CW34", "name": "Cold Worked 3/4 Hard", "hb": 290, "hrc": 30},
        {"key": "CWFH", "name": "Cold Worked Full Hard", "hb": 320, "hrc": 33},
    ],
    "stainless_ferritic": [
        # 409, 430, 434, 436, 439, 446
        {"key": "ANN", "name": "Annealed", "hb": 150, "hrc": None},
        {"key": "CW", "name": "Cold Worked", "hb": 185, "hrc": None},
    ],
    "stainless_martensitic": [
        # 410, 416, 420, 440A, 440B, 440C
        {"key": "ANN", "name": "Annealed", "hb": 195, "hrc": None},
        {"key": "H35", "name": "Hardened 35 HRC", "hb": 330, "hrc": 35},
        {"key": "H40", "name": "Hardened 40 HRC", "hb": 375, "hrc": 40},
        {"key": "H50", "name": "Hardened 50 HRC", "hb": 480, "hrc": 50},
        {"key": "H55", "name": "Hardened 55 HRC", "hb": 550, "hrc": 55},
        {"key": "H58", "name": "Hardened 58 HRC", "hb": 600, "hrc": 58},
    ],
    "stainless_ph": [
        # 17-4 PH, 15-5 PH, 17-7 PH, PH13-8Mo
        {"key": "CONDA", "name": "Condition A (Solution Annealed)", "hb": 300, "hrc": 32},
        {"key": "H1150", "name": "Condition H1150 (Overaged)", "hb": 260, "hrc": 26},
        {"key": "H1075", "name": "Condition H1075", "hb": 310, "hrc": 33},
        {"key": "H1025", "name": "Condition H1025", "hb": 330, "hrc": 35},
        {"key": "H925", "name": "Condition H925", "hb": 400, "hrc": 42},
        {"key": "H900", "name": "Condition H900 (Peak Aged)", "hb": 460, "hrc": 48},
    ],
    "stainless_duplex": [
        # 2205, 2507, LDX 2101
        {"key": "SA", "name": "Solution Annealed", "hb": 260, "hrc": 26},
        {"key": "CW25", "name": "Cold Worked 25%", "hb": 300, "hrc": 31},
        {"key": "CW33", "name": "Cold Worked 33%", "hb": 320, "hrc": 33},
    ],
    "bearing_steel": [
        # 52100
        {"key": "SPHANN", "name": "Spheroidize Annealed", "hb": 187, "hrc": None},
        {"key": "H58", "name": "Hardened 58 HRC", "hb": 600, "hrc": 58},
        {"key": "H60", "name": "Hardened 60 HRC", "hb": 625, "hrc": 60},
        {"key": "H62", "name": "Hardened 62 HRC", "hb": 650, "hrc": 62},
        {"key": "H64", "name": "Hardened 64 HRC", "hb": 700, "hrc": 64},
    ],
    "case_hardening": [
        # 8620, 9310, 4118, 4320
        {"key": "ANN", "name": "Annealed", "hb": 149, "hrc": None},
        {"key": "NORM", "name": "Normalized", "hb": 175, "hrc": None},
        {"key": "CARB55", "name": "Carburized 55 HRC Case", "hb": 550, "hrc": 55},
        {"key": "CARB58", "name": "Carburized 58 HRC Case", "hb": 600, "hrc": 58},
        {"key": "CARB62", "name": "Carburized 62 HRC Case", "hb": 650, "hrc": 62},
    ],
    "spring_steel": [
        # 5160, 6150, 9260
        {"key": "ANN", "name": "Annealed", "hb": 197, "hrc": None},
        {"key": "NORM", "name": "Normalized", "hb": 229, "hrc": 20},
        {"key": "QT45", "name": "Q&T 45 HRC", "hb": 430, "hrc": 45},
        {"key": "QT48", "name": "Q&T 48 HRC", "hb": 460, "hrc": 48},
        {"key": "QT50", "name": "Q&T 50 HRC", "hb": 480, "hrc": 50},
        {"key": "SPRING", "name": "Spring Tempered 52 HRC", "hb": 510, "hrc": 52},
    ],
    "maraging": [
        # Maraging 250, 300, 350
        {"key": "SA", "name": "Solution Annealed", "hb": 285, "hrc": 28},
        {"key": "AGED", "name": "Aged (Peak)", "hb": 520, "hrc": 52},
        {"key": "OVERAGED", "name": "Overaged", "hb": 460, "hrc": 46},
    ],
    "aluminum_wrought_ht": [
        # 2xxx, 6xxx, 7xxx heat treatable
        {"key": "O", "name": "O Temper (Annealed)", "hb": 45, "hrc": None},
        {"key": "T4", "name": "T4 (Solution + Natural Age)", "hb": 95, "hrc": None},
        {"key": "T6", "name": "T6 (Solution + Artificial Age)", "hb": 120, "hrc": None},
        {"key": "T651", "name": "T651 (T6 + Stress Relieved)", "hb": 120, "hrc": None},
        {"key": "T7", "name": "T7 (Overaged)", "hb": 105, "hrc": None},
    ],
    "aluminum_wrought_nonht": [
        # 1xxx, 3xxx, 5xxx non-heat-treatable
        {"key": "O", "name": "O Temper (Annealed)", "hb": 28, "hrc": None},
        {"key": "H12", "name": "H12 (Strain Hardened 1/4)", "hb": 35, "hrc": None},
        {"key": "H14", "name": "H14 (Strain Hardened 1/2)", "hb": 40, "hrc": None},
        {"key": "H16", "name": "H16 (Strain Hardened 3/4)", "hb": 47, "hrc": None},
        {"key": "H18", "name": "H18 (Strain Hardened Full)", "hb": 55, "hrc": None},
    ],
    "aluminum_cast": [
        # A356, 319, 380
        {"key": "F", "name": "As-Cast", "hb": 60, "hrc": None},
        {"key": "T5", "name": "T5 (Artificially Aged)", "hb": 75, "hrc": None},
        {"key": "T6", "name": "T6 (Solution + Age)", "hb": 100, "hrc": None},
    ],
}


# =============================================================================
# CONDITION NAME PATTERNS FOR DETECTION
# =============================================================================

CONDITION_PATTERNS = {
    # Annealed variants
    r'\banneal': 'ANN',
    r'\bspheroidi': 'SPHANN',
    
    # Normalized
    r'\bnormal': 'NORM',
    
    # Cold/Hot worked
    r'cold\s*draw': 'CD',
    r'cold\s*roll': 'CR',
    r'hot\s*roll': 'HR',
    r'cold\s*work.*1/4|1/4\s*hard': 'CW14',
    r'cold\s*work.*1/2|1/2\s*hard': 'CW12',
    r'cold\s*work.*3/4|3/4\s*hard': 'CW34',
    r'cold\s*work.*full|full\s*hard': 'CWFH',
    r'cold\s*work': 'CW',
    
    # Q&T with HRC
    r'q&?t.*?(\d+)\s*hrc': lambda m: f"QT{m.group(1)}",
    r'quench.*?temp.*?(\d+)': lambda m: f"QT{m.group(1)}",
    
    # Hardened with HRC
    r'harden.*?(\d+)\s*hrc': lambda m: f"H{m.group(1)}",
    r'(\d+)\s*hrc': lambda m: f"H{m.group(1)}",
    
    # PH stainless conditions
    r'condition\s*a|solution\s*anneal': 'CONDA',
    r'h1150|h-1150': 'H1150',
    r'h1075|h-1075': 'H1075',
    r'h1025|h-1025': 'H1025',
    r'h925|h-925': 'H925',
    r'h900|h-900': 'H900',
    
    # Carburized
    r'carburiz.*?(\d+)': lambda m: f"CARB{m.group(1)}",
    r'carburiz': 'CARB58',
    
    # Nitrided
    r'nitrid': 'NIT',
    
    # Stress relieved
    r'stress\s*reliev': 'SR',
    
    # Prehardened
    r'prehard.*?(\d+)': lambda m: f"PH{m.group(1)}",
    
    # Spring tempered
    r'spring\s*temper': 'SPRING',
    
    # Aluminum tempers
    r'\bO\s*temper|\btemper\s*O\b': 'O',
    r'\bT4\b': 'T4',
    r'\bT6\b': 'T6',
    r'\bT651\b': 'T651',
    r'\bT7\b': 'T7',
    r'\bH1[248]\b': lambda m: m.group(0),
    
    # Aged
    r'\baged\b': 'AGED',
    r'overaged': 'OVERAGED',
}


def extract_condition_key(name, condition_field):
    """Extract standardized condition key from material name or condition field"""
    text = f"{name} {condition_field}".lower()
    
    for pattern, key_or_func in CONDITION_PATTERNS.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if callable(key_or_func):
                return key_or_func(match)
            return key_or_func
    
    return None


def extract_base_alloy_name(name):
    """Extract base alloy name by removing condition suffixes"""
    # Patterns to remove
    remove_patterns = [
        r'\s+anneal.*$',
        r'\s+normal.*$',
        r'\s+q&?t.*$',
        r'\s+quench.*$',
        r'\s+cold\s*(draw|roll|work).*$',
        r'\s+hot\s*roll.*$',
        r'\s+harden.*$',
        r'\s+\d+\s*hrc.*$',
        r'\s+condition\s*[ah].*$',
        r'\s+h\d{3,4}.*$',
        r'\s+carburiz.*$',
        r'\s+nitrid.*$',
        r'\s+stress\s*reliev.*$',
        r'\s+prehard.*$',
        r'\s+spring\s*temper.*$',
        r'\s+spheroid.*$',
        r'\s+solution.*$',
        r'\s+aged.*$',
        r'\s+1/[234]\s*hard.*$',
        r'\s+full\s*hard.*$',
        r'\s+[OTH]\d*\s*temper.*$',
        r'\s+temper\s+[OTH]\d*.*$',
    ]
    
    result = name
    for pattern in remove_patterns:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE)
    
    return result.strip()


# =============================================================================
# PHYSICS-BASED INTERPOLATION
# =============================================================================

def interpolate_properties(base_props, base_hb, target_hb):
    """Interpolate all properties based on hardness change"""
    if base_hb is None or base_hb == 0:
        base_hb = 180
    if target_hb is None or target_hb == 0:
        target_hb = base_hb
    
    hb_ratio = target_hb / base_hb
    
    # Tensile ~ proportional to hardness
    new_tensile = int(base_props.get("tensile", 550) * hb_ratio ** 0.95)
    
    # Yield ratio increases with hardness
    base_yield = base_props.get("yield", 350)
    yield_ratio = min(0.98, 0.65 + (target_hb - 150) * 0.0008)
    new_yield = int(new_tensile * yield_ratio)
    
    # Elongation drops with hardness
    new_elong = max(1, int(base_props.get("elongation", 20) * (1/hb_ratio) ** 1.8))
    
    # Cutting force increases with hardness
    new_kc11 = int(base_props.get("kc11", 1800) * hb_ratio ** 1.15)
    
    # Machinability drops with hardness
    new_mach = max(2, int(base_props.get("machinability", 50) * (1/hb_ratio) ** 1.2))
    
    # Taylor C drops with hardness
    new_taylor_C = max(15, int(base_props.get("taylor_C", 150) * (1/hb_ratio) ** 1.1))
    new_taylor_n = max(0.05, round(base_props.get("taylor_n", 0.20) * (1/hb_ratio) ** 0.15, 2))
    
    # Johnson-Cook
    base_jc = base_props.get("johnson_cook", {"A": 500, "B": 700, "n": 0.4, "C": 0.02, "m": 1.0})
    new_jc = {
        "A": int(base_jc.get("A", 500) * hb_ratio ** 0.9),
        "B": int(base_jc.get("B", 700) * hb_ratio ** 0.3),
        "n": round(base_jc.get("n", 0.4) * (1/hb_ratio) ** 0.3, 2),
        "C": round(base_jc.get("C", 0.02) * (1/hb_ratio) ** 0.1, 3),
        "m": round(base_jc.get("m", 1.0) * hb_ratio ** 0.15, 2),
        "T_melt": base_jc.get("T_melt", 1520),
        "T_ref": base_jc.get("T_ref", 20),
        "epsilon_ref": base_jc.get("epsilon_ref", 1.0)
    }
    
    return {
        "tensile": new_tensile,
        "yield": new_yield,
        "elongation": new_elong,
        "kc11": new_kc11,
        "machinability": new_mach,
        "taylor_C": new_taylor_C,
        "taylor_n": new_taylor_n,
        "johnson_cook": new_jc
    }


def get_base_properties(material):
    """Extract base properties from a material for interpolation"""
    mech = material.get("mechanical", {})
    hardness = mech.get("hardness", {})
    
    tensile_data = mech.get("tensile_strength", {})
    yield_data = mech.get("yield_strength", {})
    elong_data = mech.get("elongation", {})
    
    kienzle = material.get("kienzle", {})
    taylor = material.get("taylor", {})
    mach = material.get("machinability", {})
    jc = material.get("johnson_cook", {})
    
    def safe_get(data, *keys, default=None):
        if isinstance(data, dict):
            for key in keys:
                if key in data:
                    return data[key]
        return default if default is not None else data
    
    return {
        "hb": safe_get(hardness, "brinell", default=180),
        "tensile": safe_get(tensile_data, "typical", "min", default=550),
        "yield": safe_get(yield_data, "typical", "min", default=350),
        "elongation": safe_get(elong_data, "typical", default=20),
        "kc11": safe_get(kienzle, "kc1_1", default=1800),
        "mc": safe_get(kienzle, "mc", default=0.24),
        "taylor_C": safe_get(taylor, "C", default=150),
        "taylor_n": safe_get(taylor, "n", default=0.20),
        "machinability": safe_get(mach, "aisi_rating", default=50),
        "johnson_cook": jc if jc else {"A": 500, "B": 700, "n": 0.4, "C": 0.02, "m": 1.0}
    }


# =============================================================================
# STEEL TYPE CLASSIFICATION
# =============================================================================

def classify_steel_type(material):
    """Determine steel type for condition matrix selection"""
    name = str(material.get("name", "")).upper()
    mat_class = str(material.get("material_class", "")).upper()
    
    designation = material.get("designation", {})
    if isinstance(designation, dict):
        aisi = str(designation.get("aisi_sae", "")).upper()
    else:
        aisi = ""
    
    composition = material.get("composition", {})
    carbon = 0.2
    if isinstance(composition, dict):
        c_data = composition.get("carbon", {})
        if isinstance(c_data, dict):
            carbon = c_data.get("typical", 0.2)
        elif c_data:
            carbon = float(c_data)
    
    # Tool steels
    if any(x in name for x in ["HSS", "HIGH SPEED"]) or re.search(r'\bM[1-9]\d?\b|\bT[1-9]\d?\b', aisi):
        return "tool_steel_hss"
    if re.search(r'\b[DASO][1-9]\b', aisi) or any(x in name for x in [" D2", " A2", " O1", " S7", " W1"]):
        return "tool_steel_cold"
    if re.search(r'\bH1[1-9]\b', aisi) or "H13" in name or "H11" in name:
        return "tool_steel_hot"
    if "P20" in aisi or "MOLD" in name:
        return "tool_steel_mold"
    if "TOOL" in mat_class:
        return "tool_steel_cold"
    
    # Stainless steels
    if "STAINLESS" in mat_class or "STAINLESS" in name:
        if any(x in name for x in ["17-4", "15-5", "17-7", "PH13-8", "PRECIPITATION"]):
            return "stainless_ph"
        if any(x in name for x in ["2205", "2507", "DUPLEX", "SUPER DUPLEX"]):
            return "stainless_duplex"
        if re.search(r'\b4[01][0469]\b', aisi) or "MARTENSITIC" in mat_class:
            return "stainless_martensitic"
        if re.search(r'\b4[0-4][0-9]\b', aisi) and "FERRITIC" in mat_class:
            return "stainless_ferritic"
        return "stainless_austenitic"
    
    # Bearing steels
    if "52100" in aisi or "BEARING" in name:
        return "bearing_steel"
    
    # Case hardening
    if any(x in aisi for x in ["8620", "8615", "9310", "4320", "4118", "4820"]):
        return "case_hardening"
    
    # Spring steels
    if any(x in aisi for x in ["5160", "6150", "9260", "1095"]) or "SPRING" in name:
        return "spring_steel"
    
    # Maraging
    if "MARAGING" in name:
        return "maraging"
    
    # Free machining
    if re.match(r"^1[12]\d{2}", aisi):
        return "free_machining_steel"
    
    # Alloy steels
    if re.match(r"^[4-9]\d{3}", aisi):
        if carbon >= 0.35:
            return "alloy_steel_high"
        return "alloy_steel_low"
    
    # Carbon steels by carbon content
    if re.match(r"^10\d{2}", aisi):
        if carbon >= 0.55:
            return "high_carbon_steel"
        elif carbon >= 0.25:
            return "medium_carbon_steel"
        return "low_carbon_steel"
    
    # Aluminum
    if "ALUMINUM" in mat_class or "ALUMINIUM" in mat_class:
        if any(x in aisi for x in ["2", "6", "7"]):  # 2xxx, 6xxx, 7xxx
            return "aluminum_wrought_ht"
        if any(x in aisi for x in ["3", "5"]):  # 3xxx, 5xxx
            return "aluminum_wrought_nonht"
        if "CAST" in name or re.search(r'[ABC]\d{3}', aisi):
            return "aluminum_cast"
        return "aluminum_wrought_ht"
    
    return "alloy_steel_low"


# =============================================================================
# JS FILE PARSING
# =============================================================================

def js_to_json(js_string):
    """Convert JavaScript object notation to JSON"""
    result = re.sub(r'//.*$', '', js_string, flags=re.MULTILINE)
    result = re.sub(r'/\*[\s\S]*?\*/', '', result)
    result = re.sub(r'(\s)(\w+)(\s*:)', r'\1"\2"\3', result)
    result = re.sub(r',(\s*[}\]])', r'\1', result)
    return result


def extract_all_materials(content):
    """Extract all materials from JS file content"""
    materials = {}
    id_pattern = r'"?([A-Z]-[A-Z]{2,3}-\d{3,4})"?\s*:\s*\{'
    
    for match in re.finditer(id_pattern, content):
        mat_id = match.group(1)
        start = match.end() - 1
        
        # Find matching closing brace
        depth = 0
        end = start
        for i, char in enumerate(content[start:], start):
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        
        material_js = content[start:end]
        
        try:
            json_str = js_to_json(material_js)
            mat_data = json.loads(json_str)
            mat_data['id'] = mat_id
            materials[mat_id] = mat_data
        except json.JSONDecodeError:
            continue
    
    return materials


# =============================================================================
# MAIN PROCESSING
# =============================================================================

def generate_variant(base_material, condition, new_id):
    """Generate a condition variant from base material"""
    variant = deepcopy(base_material)
    
    # Update identification
    variant["id"] = new_id
    base_name = extract_base_alloy_name(base_material.get("name", "Steel"))
    variant["name"] = f"{base_name} {condition['name']}"
    variant["condition"] = condition["name"]
    
    # Get base properties and interpolate
    base_props = get_base_properties(base_material)
    target_hb = condition["hb"]
    target_hrc = condition.get("hrc")
    
    new_props = interpolate_properties(base_props, base_props["hb"], target_hb)
    
    # Update mechanical properties
    if "mechanical" not in variant:
        variant["mechanical"] = {}
    
    variant["mechanical"]["hardness"] = {
        "brinell": target_hb,
        "rockwell_c": target_hrc,
        "vickers": int(target_hb * 1.05) if target_hb else None
    }
    variant["mechanical"]["tensile_strength"] = {"typical": new_props["tensile"]}
    variant["mechanical"]["yield_strength"] = {"typical": new_props["yield"]}
    variant["mechanical"]["elongation"] = {"typical": new_props["elongation"]}
    
    # Update cutting parameters
    variant["kienzle"] = {
        "kc1_1": new_props["kc11"],
        "mc": base_props["mc"]
    }
    
    variant["taylor"] = {
        "C": new_props["taylor_C"],
        "n": new_props["taylor_n"]
    }
    
    variant["machinability"] = {
        "aisi_rating": new_props["machinability"],
        "relative_to_1212": round(new_props["machinability"] / 100, 2)
    }
    
    variant["johnson_cook"] = new_props["johnson_cook"]
    
    # Update ISO group for hard materials
    if target_hrc and target_hrc >= 45:
        variant["iso_group"] = "H"
    
    # Add generation note
    variant["_generated"] = {
        "from_base": base_material.get("id"),
        "condition_key": condition["key"],
        "timestamp": datetime.now().isoformat()
    }
    
    return variant


def process_category(category_path, category_name):
    """Process all files in a category"""
    print(f"\n{'='*70}")
    print(f"Processing: {category_name}")
    print("=" * 70)
    
    # Collect ALL materials from category
    all_materials = {}
    
    for filepath in sorted(category_path.glob("*.js")):
        if "_enhanced" in filepath.name or "_complete" in filepath.name:
            continue
        
        print(f"\n  Reading: {filepath.name}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        materials = extract_all_materials(content)
        print(f"    Found {len(materials)} materials")
        
        all_materials.update(materials)
    
    print(f"\n  Total materials in {category_name}: {len(all_materials)}")
    
    # Group by base alloy
    base_alloy_groups = defaultdict(list)
    
    for mat_id, material in all_materials.items():
        name = material.get("name", "")
        base_name = extract_base_alloy_name(name)
        base_alloy_groups[base_name].append(material)
    
    print(f"  Unique base alloys: {len(base_alloy_groups)}")
    
    # Determine missing conditions and generate variants
    complete_materials = {}
    new_variant_count = 0
    
    for base_name, variants in base_alloy_groups.items():
        # Find best base material (prefer annealed or most complete)
        base_material = variants[0]
        for v in variants:
            cond_key = extract_condition_key(v.get("name", ""), v.get("condition", ""))
            if cond_key == "ANN":
                base_material = v
                break
        
        # Classify steel type
        steel_type = classify_steel_type(base_material)
        required_conditions = CONDITION_MATRICES.get(steel_type, CONDITION_MATRICES["alloy_steel_low"])
        
        # Find existing conditions
        existing_keys = set()
        for v in variants:
            key = extract_condition_key(v.get("name", ""), v.get("condition", ""))
            if key:
                existing_keys.add(key)
            complete_materials[v["id"]] = v
        
        # Generate missing conditions
        required_keys = {c["key"] for c in required_conditions}
        missing_keys = required_keys - existing_keys
        
        if missing_keys:
            # Get next ID number
            existing_ids = [int(re.search(r'\d+', v["id"]).group()) for v in variants if re.search(r'\d+', v["id"])]
            next_id = max(existing_ids) + 1 if existing_ids else 5001
            
            for condition in required_conditions:
                if condition["key"] in missing_keys:
                    # Generate ID
                    id_prefix = base_material["id"].rsplit("-", 1)[0]
                    new_id = f"{id_prefix}-{next_id:04d}"
                    next_id += 1
                    
                    variant = generate_variant(base_material, condition, new_id)
                    complete_materials[new_id] = variant
                    new_variant_count += 1
    
    print(f"  Generated {new_variant_count} new condition variants")
    print(f"  Total complete: {len(complete_materials)}")
    
    return complete_materials, new_variant_count


def write_category_output(category_name, materials):
    """Write all materials to output file"""
    output_path = OUTPUT_DIR / category_name / f"{category_name}_complete.js"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    header = f'''/**
 * PRISM MATERIALS DATABASE - COMPLETE CONDITION MATRIX
 * Category: {category_name}
 * Generated: {timestamp}
 * Total materials: {len(materials)}
 * 
 * This file contains ALL base alloys with COMPLETE heat treatment
 * condition variants. Every base alloy has its full condition matrix.
 */
const {category_name}_COMPLETE = {{
  metadata: {{
    category: "{category_name}",
    materialCount: {len(materials)},
    generated: "{timestamp}",
    note: "Complete condition matrix coverage"
  }},
  materials: {{
'''
    
    # Sort materials by ID
    sorted_materials = sorted(materials.values(), key=lambda m: m.get("id", ""))
    
    mat_strs = []
    for mat in sorted_materials:
        mat_id = mat.get("id", "UNKNOWN")
        mat_str = f'    "{mat_id}": ' + json.dumps(mat, indent=6).replace('\n', '\n    ')
        mat_strs.append(mat_str)
    
    footer = '''
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ''' + category_name + '''_COMPLETE;
}
'''
    
    content = header + ',\n\n'.join(mat_strs) + footer
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    file_size = output_path.stat().st_size
    print(f"\n  Wrote: {output_path}")
    print(f"  Size: {file_size / 1024 / 1024:.2f} MB")
    
    return output_path, file_size


def main():
    print("=" * 70)
    print("PRISM Complete Condition Matrix Generator v3.0")
    print("=" * 70)
    print(f"Input:  {INPUT_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    
    categories = ["P_STEELS", "M_STAINLESS", "N_NONFERROUS"]
    
    total_materials = 0
    total_new = 0
    results = []
    
    for category in categories:
        cat_path = INPUT_DIR / category
        if not cat_path.exists():
            print(f"\nSkipping {category} - not found")
            continue
        
        materials, new_count = process_category(cat_path, category)
        
        if materials:
            output_path, file_size = write_category_output(category, materials)
            total_materials += len(materials)
            total_new += new_count
            results.append((category, len(materials), new_count, file_size))
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"{'Category':<20} {'Materials':>12} {'New Variants':>15} {'Size (MB)':>12}")
    print("-" * 70)
    
    for cat, count, new, size in results:
        print(f"{cat:<20} {count:>12,} {new:>15,} {size/1024/1024:>12.2f}")
    
    print("-" * 70)
    total_size = sum(r[3] for r in results)
    print(f"{'TOTAL':<20} {total_materials:>12,} {total_new:>15,} {total_size/1024/1024:>12.2f}")
    print("=" * 70)
    
    # Write log
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        f.write(f"PRISM Complete Condition Matrix Generator\n")
        f.write(f"Generated: {datetime.now()}\n")
        f.write(f"="*70 + "\n\n")
        for cat, count, new, size in results:
            f.write(f"{cat}: {count} materials ({new} new), {size/1024:.1f} KB\n")
        f.write(f"\nTotal: {total_materials} materials ({total_new} new)\n")
    
    print(f"\nLog: {LOG_FILE}")


if __name__ == "__main__":
    main()
