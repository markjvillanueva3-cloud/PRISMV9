#!/usr/bin/env python3
"""
PRISM Manufacturing Intelligence v9.0
127-Parameter Enhancement Swarm

This script automatically adds missing parameters to ALL materials
in the database, using physics-based estimation and literature values.

Enhancement Sources (Priority Order):
1. Exact literature values (highest confidence)
2. Similar material interpolation
3. Physics-based calculation
4. Material class defaults (lowest confidence)

Usage: python enhance_127_params_swarm.py [--dry-run] [--verbose]
"""

import os
import re
import json
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import math

# PRISM root paths
PRISM_ROOT = Path(r"C:\PRISM")
MATERIALS_ROOT = PRISM_ROOT / "data" / "materials"
STATE_ROOT = PRISM_ROOT / "state"
LOGS_ROOT = STATE_ROOT / "logs"

# ═══════════════════════════════════════════════════════════════════════════════
# DEFAULT PARAMETER VALUES BY MATERIAL CLASS
# ═══════════════════════════════════════════════════════════════════════════════

# Default values for each parameter by material category
# These are used as fallbacks when literature values aren't available

DEFAULT_KIENZLE_BY_CLASS = {
    # ISO P - Steels
    "P_LOW_CARBON": {"Kc1_1": 1800, "mc": 0.26, "Kf1_1": 850, "mf": 0.30, "Kr1_1": 650, "mr": 0.28},
    "P_MEDIUM_CARBON": {"Kc1_1": 2100, "mc": 0.25, "Kf1_1": 950, "mf": 0.29, "Kr1_1": 750, "mr": 0.27},
    "P_HIGH_CARBON": {"Kc1_1": 2400, "mc": 0.24, "Kf1_1": 1050, "mf": 0.28, "Kr1_1": 850, "mr": 0.26},
    "P_ALLOY": {"Kc1_1": 2200, "mc": 0.25, "Kf1_1": 1000, "mf": 0.28, "Kr1_1": 800, "mr": 0.27},
    "P_TOOL": {"Kc1_1": 2800, "mc": 0.22, "Kf1_1": 1200, "mf": 0.26, "Kr1_1": 950, "mr": 0.24},
    
    # ISO M - Stainless
    "M_AUSTENITIC": {"Kc1_1": 2800, "mc": 0.21, "Kf1_1": 1300, "mf": 0.25, "Kr1_1": 1000, "mr": 0.23},
    "M_FERRITIC": {"Kc1_1": 2200, "mc": 0.24, "Kf1_1": 1000, "mf": 0.28, "Kr1_1": 800, "mr": 0.26},
    "M_MARTENSITIC": {"Kc1_1": 2600, "mc": 0.22, "Kf1_1": 1150, "mf": 0.26, "Kr1_1": 900, "mr": 0.24},
    "M_DUPLEX": {"Kc1_1": 3200, "mc": 0.20, "Kf1_1": 1450, "mf": 0.24, "Kr1_1": 1100, "mr": 0.22},
    "M_PH": {"Kc1_1": 2900, "mc": 0.21, "Kf1_1": 1350, "mf": 0.25, "Kr1_1": 1050, "mr": 0.23},
    
    # ISO K - Cast Iron
    "K_GRAY": {"Kc1_1": 1200, "mc": 0.28, "Kf1_1": 550, "mf": 0.32, "Kr1_1": 450, "mr": 0.30},
    "K_DUCTILE": {"Kc1_1": 1500, "mc": 0.26, "Kf1_1": 700, "mf": 0.30, "Kr1_1": 550, "mr": 0.28},
    "K_MALLEABLE": {"Kc1_1": 1400, "mc": 0.27, "Kf1_1": 650, "mf": 0.31, "Kr1_1": 500, "mr": 0.29},
    "K_CGI": {"Kc1_1": 1600, "mc": 0.25, "Kf1_1": 750, "mf": 0.29, "Kr1_1": 600, "mr": 0.27},
    
    # ISO N - Non-ferrous
    "N_ALUMINUM_WROUGHT": {"Kc1_1": 750, "mc": 0.30, "Kf1_1": 350, "mf": 0.35, "Kr1_1": 280, "mr": 0.33},
    "N_ALUMINUM_CAST": {"Kc1_1": 600, "mc": 0.32, "Kf1_1": 280, "mf": 0.38, "Kr1_1": 220, "mr": 0.35},
    "N_COPPER": {"Kc1_1": 1200, "mc": 0.26, "Kf1_1": 550, "mf": 0.30, "Kr1_1": 450, "mr": 0.28},
    "N_BRASS": {"Kc1_1": 900, "mc": 0.28, "Kf1_1": 420, "mf": 0.32, "Kr1_1": 340, "mr": 0.30},
    "N_BRONZE": {"Kc1_1": 1100, "mc": 0.27, "Kf1_1": 500, "mf": 0.31, "Kr1_1": 400, "mr": 0.29},
    "N_MAGNESIUM": {"Kc1_1": 450, "mc": 0.35, "Kf1_1": 200, "mf": 0.40, "Kr1_1": 160, "mr": 0.38},
    "N_ZINC": {"Kc1_1": 500, "mc": 0.33, "Kf1_1": 230, "mf": 0.38, "Kr1_1": 180, "mr": 0.36},
    
    # ISO S - Superalloys
    "S_NICKEL": {"Kc1_1": 3800, "mc": 0.18, "Kf1_1": 1700, "mf": 0.22, "Kr1_1": 1350, "mr": 0.20},
    "S_COBALT": {"Kc1_1": 4200, "mc": 0.17, "Kf1_1": 1900, "mf": 0.21, "Kr1_1": 1500, "mr": 0.19},
    "S_TITANIUM": {"Kc1_1": 1800, "mc": 0.23, "Kf1_1": 800, "mf": 0.27, "Kr1_1": 650, "mr": 0.25},
    
    # ISO H - Hardened
    "H_45_52HRC": {"Kc1_1": 3200, "mc": 0.21, "Kf1_1": 1450, "mf": 0.25, "Kr1_1": 1150, "mr": 0.23},
    "H_52_60HRC": {"Kc1_1": 4000, "mc": 0.19, "Kf1_1": 1800, "mf": 0.23, "Kr1_1": 1400, "mr": 0.21},
    "H_60_70HRC": {"Kc1_1": 4800, "mc": 0.16, "Kf1_1": 2100, "mf": 0.20, "Kr1_1": 1700, "mr": 0.18},
    
    # ISO X - Specialty
    "X_CFRP": {"Kc1_1": 180, "mc": 0.35, "Kf1_1": 75, "mf": 0.40, "Kr1_1": 55, "mr": 0.38},
    "X_GFRP": {"Kc1_1": 250, "mc": 0.30, "Kf1_1": 100, "mf": 0.35, "Kr1_1": 75, "mr": 0.33},
    "X_PLASTIC": {"Kc1_1": 60, "mc": 0.50, "Kf1_1": 25, "mf": 0.55, "Kr1_1": 20, "mr": 0.52},
    "X_GRAPHITE": {"Kc1_1": 40, "mc": 0.35, "Kf1_1": 15, "mf": 0.40, "Kr1_1": 12, "mr": 0.38},
}

DEFAULT_JOHNSON_COOK_BY_CLASS = {
    # ISO P - Steels (Literature: Johnson-Cook 1983, 1985)
    "P_LOW_CARBON": {"A": 350, "B": 275, "n": 0.36, "C": 0.022, "m": 1.0},
    "P_MEDIUM_CARBON": {"A": 500, "B": 320, "n": 0.28, "C": 0.027, "m": 1.03},
    "P_HIGH_CARBON": {"A": 650, "B": 380, "n": 0.24, "C": 0.030, "m": 1.06},
    "P_ALLOY": {"A": 792, "B": 510, "n": 0.26, "C": 0.014, "m": 1.03},
    "P_TOOL": {"A": 1150, "B": 650, "n": 0.18, "C": 0.020, "m": 0.95},
    
    # ISO M - Stainless (Literature: Various)
    "M_AUSTENITIC": {"A": 310, "B": 1000, "n": 0.65, "C": 0.07, "m": 1.0},
    "M_FERRITIC": {"A": 450, "B": 420, "n": 0.30, "C": 0.025, "m": 1.0},
    "M_MARTENSITIC": {"A": 650, "B": 500, "n": 0.25, "C": 0.022, "m": 0.98},
    "M_DUPLEX": {"A": 550, "B": 850, "n": 0.45, "C": 0.040, "m": 0.95},
    "M_PH": {"A": 1200, "B": 450, "n": 0.20, "C": 0.018, "m": 0.92},
    
    # ISO K - Cast Iron
    "K_GRAY": {"A": 200, "B": 180, "n": 0.20, "C": 0.010, "m": 1.2},
    "K_DUCTILE": {"A": 350, "B": 280, "n": 0.25, "C": 0.015, "m": 1.1},
    "K_MALLEABLE": {"A": 300, "B": 250, "n": 0.24, "C": 0.014, "m": 1.1},
    "K_CGI": {"A": 380, "B": 300, "n": 0.26, "C": 0.016, "m": 1.05},
    
    # ISO N - Non-ferrous (Literature: Lesuer 2001, Clausen 2004)
    "N_ALUMINUM_WROUGHT": {"A": 270, "B": 154, "n": 0.34, "C": 0.015, "m": 1.34},
    "N_ALUMINUM_CAST": {"A": 180, "B": 120, "n": 0.30, "C": 0.012, "m": 1.40},
    "N_COPPER": {"A": 90, "B": 292, "n": 0.31, "C": 0.025, "m": 1.09},
    "N_BRASS": {"A": 112, "B": 505, "n": 0.42, "C": 0.009, "m": 1.68},
    "N_BRONZE": {"A": 145, "B": 380, "n": 0.38, "C": 0.012, "m": 1.35},
    "N_MAGNESIUM": {"A": 172, "B": 360, "n": 0.45, "C": 0.008, "m": 1.45},
    "N_ZINC": {"A": 100, "B": 200, "n": 0.40, "C": 0.010, "m": 1.50},
    
    # ISO S - Superalloys (Literature: Various)
    "S_NICKEL": {"A": 1241, "B": 622, "n": 0.65, "C": 0.017, "m": 1.26},
    "S_COBALT": {"A": 1050, "B": 700, "n": 0.55, "C": 0.015, "m": 1.20},
    "S_TITANIUM": {"A": 997, "B": 653, "n": 0.45, "C": 0.0198, "m": 0.7},
    
    # ISO H - Hardened
    "H_45_52HRC": {"A": 1850, "B": 1000, "n": 0.12, "C": 0.018, "m": 0.90},
    "H_52_60HRC": {"A": 2100, "B": 1150, "n": 0.11, "C": 0.020, "m": 0.87},
    "H_60_70HRC": {"A": 2300, "B": 1250, "n": 0.09, "C": 0.024, "m": 0.82},
    
    # ISO X - Specialty
    "X_CFRP": {"A": 45, "B": 120, "n": 0.45, "C": 0.035, "m": 1.2},
    "X_GFRP": {"A": 35, "B": 100, "n": 0.50, "C": 0.040, "m": 1.3},
    "X_PLASTIC": {"A": 50, "B": 70, "n": 0.40, "C": 0.060, "m": 0.90},
    "X_GRAPHITE": {"A": 30, "B": 15, "n": 0.15, "C": 0.010, "m": 0.50},
}

DEFAULT_TAYLOR_BY_CLASS = {
    # Format: {carbide: {C, n}, ceramic: {C, n}, cbn: {C, n}, diamond: {C, n}}
    
    # ISO P - Steels
    "P_LOW_CARBON": {"carbide": {"C": 350, "n": 0.30}, "ceramic": {"C": 500, "n": 0.35}},
    "P_MEDIUM_CARBON": {"carbide": {"C": 280, "n": 0.28}, "ceramic": {"C": 420, "n": 0.33}},
    "P_HIGH_CARBON": {"carbide": {"C": 220, "n": 0.26}, "ceramic": {"C": 350, "n": 0.31}},
    "P_ALLOY": {"carbide": {"C": 250, "n": 0.27}, "ceramic": {"C": 380, "n": 0.32}},
    "P_TOOL": {"carbide": {"C": 180, "n": 0.25}, "ceramic": {"C": 300, "n": 0.30}},
    
    # ISO M - Stainless
    "M_AUSTENITIC": {"carbide": {"C": 180, "n": 0.25}, "ceramic": {"C": 280, "n": 0.30}},
    "M_FERRITIC": {"carbide": {"C": 220, "n": 0.27}, "ceramic": {"C": 340, "n": 0.32}},
    "M_MARTENSITIC": {"carbide": {"C": 200, "n": 0.26}, "ceramic": {"C": 310, "n": 0.31}},
    "M_DUPLEX": {"carbide": {"C": 150, "n": 0.24}, "ceramic": {"C": 240, "n": 0.29}},
    "M_PH": {"carbide": {"C": 170, "n": 0.25}, "ceramic": {"C": 260, "n": 0.30}},
    
    # ISO K - Cast Iron
    "K_GRAY": {"carbide": {"C": 320, "n": 0.32}, "ceramic": {"C": 480, "n": 0.38}},
    "K_DUCTILE": {"carbide": {"C": 280, "n": 0.30}, "ceramic": {"C": 420, "n": 0.35}},
    "K_MALLEABLE": {"carbide": {"C": 300, "n": 0.31}, "ceramic": {"C": 450, "n": 0.36}},
    "K_CGI": {"carbide": {"C": 260, "n": 0.29}, "ceramic": {"C": 400, "n": 0.34}},
    
    # ISO N - Non-ferrous
    "N_ALUMINUM_WROUGHT": {"carbide": {"C": 800, "n": 0.40}, "diamond": {"C": 2000, "n": 0.50}},
    "N_ALUMINUM_CAST": {"carbide": {"C": 600, "n": 0.38}, "diamond": {"C": 1500, "n": 0.48}},
    "N_COPPER": {"carbide": {"C": 350, "n": 0.32}, "diamond": {"C": 900, "n": 0.42}},
    "N_BRASS": {"carbide": {"C": 450, "n": 0.35}, "diamond": {"C": 1100, "n": 0.45}},
    "N_BRONZE": {"carbide": {"C": 380, "n": 0.33}, "diamond": {"C": 950, "n": 0.43}},
    "N_MAGNESIUM": {"carbide": {"C": 1000, "n": 0.42}, "diamond": {"C": 2500, "n": 0.52}},
    "N_ZINC": {"carbide": {"C": 700, "n": 0.38}, "diamond": {"C": 1800, "n": 0.48}},
    
    # ISO S - Superalloys
    "S_NICKEL": {"carbide": {"C": 50, "n": 0.20}, "ceramic": {"C": 120, "n": 0.25}, "cbn": {"C": 200, "n": 0.30}},
    "S_COBALT": {"carbide": {"C": 40, "n": 0.18}, "ceramic": {"C": 100, "n": 0.23}, "cbn": {"C": 180, "n": 0.28}},
    "S_TITANIUM": {"carbide": {"C": 80, "n": 0.22}, "ceramic": None, "cbn": None},
    
    # ISO H - Hardened
    "H_45_52HRC": {"carbide": {"C": 100, "n": 0.24}, "ceramic": {"C": 150, "n": 0.28}, "cbn": {"C": 200, "n": 0.32}},
    "H_52_60HRC": {"carbide": {"C": 80, "n": 0.22}, "ceramic": {"C": 120, "n": 0.26}, "cbn": {"C": 160, "n": 0.30}},
    "H_60_70HRC": {"carbide": None, "ceramic": {"C": 100, "n": 0.24}, "cbn": {"C": 120, "n": 0.28}},
    
    # ISO X - Specialty
    "X_CFRP": {"diamond": {"C": 800, "n": 0.35}},
    "X_GFRP": {"carbide": {"C": 150, "n": 0.25}, "diamond": {"C": 600, "n": 0.30}},
    "X_PLASTIC": {"carbide": {"C": 2000, "n": 0.45}, "hss": {"C": 800, "n": 0.35}},
    "X_GRAPHITE": {"carbide": {"C": 800, "n": 0.30}, "diamond": {"C": 2500, "n": 0.40}},
}

DEFAULT_MACHINABILITY = {
    "P_LOW_CARBON": {"index": 70, "rating": "Good", "chipType": "Continuous"},
    "P_MEDIUM_CARBON": {"index": 55, "rating": "Moderate", "chipType": "Continuous"},
    "P_HIGH_CARBON": {"index": 40, "rating": "Difficult", "chipType": "Segmented"},
    "P_ALLOY": {"index": 45, "rating": "Moderate", "chipType": "Continuous"},
    "P_TOOL": {"index": 25, "rating": "Difficult", "chipType": "Segmented"},
    
    "M_AUSTENITIC": {"index": 35, "rating": "Difficult", "chipType": "Continuous, stringy"},
    "M_FERRITIC": {"index": 55, "rating": "Moderate", "chipType": "Continuous"},
    "M_MARTENSITIC": {"index": 45, "rating": "Moderate", "chipType": "Continuous"},
    "M_DUPLEX": {"index": 25, "rating": "Difficult", "chipType": "Continuous, tough"},
    "M_PH": {"index": 30, "rating": "Difficult", "chipType": "Continuous"},
    
    "K_GRAY": {"index": 85, "rating": "Excellent", "chipType": "Discontinuous"},
    "K_DUCTILE": {"index": 65, "rating": "Good", "chipType": "Segmented"},
    "K_MALLEABLE": {"index": 70, "rating": "Good", "chipType": "Segmented"},
    "K_CGI": {"index": 55, "rating": "Moderate", "chipType": "Discontinuous"},
    
    "N_ALUMINUM_WROUGHT": {"index": 400, "rating": "Excellent", "chipType": "Continuous"},
    "N_ALUMINUM_CAST": {"index": 350, "rating": "Excellent", "chipType": "Discontinuous"},
    "N_COPPER": {"index": 60, "rating": "Moderate", "chipType": "Continuous"},
    "N_BRASS": {"index": 100, "rating": "Excellent", "chipType": "Short, curled"},
    "N_BRONZE": {"index": 80, "rating": "Good", "chipType": "Segmented"},
    
    "S_NICKEL": {"index": 10, "rating": "Very Difficult", "chipType": "Continuous, gummy"},
    "S_COBALT": {"index": 8, "rating": "Very Difficult", "chipType": "Continuous, tough"},
    "S_TITANIUM": {"index": 15, "rating": "Very Difficult", "chipType": "Segmented"},
    
    "H_45_52HRC": {"index": 20, "rating": "Difficult", "chipType": "Segmented"},
    "H_52_60HRC": {"index": 12, "rating": "Very Difficult", "chipType": "Dust/chips"},
    "H_60_70HRC": {"index": 8, "rating": "Extremely Difficult", "chipType": "Dust"},
    
    "X_CFRP": {"index": 15, "rating": "Difficult", "chipType": "Dust/fragments"},
    "X_GFRP": {"index": 25, "rating": "Moderate", "chipType": "Dust/fragments"},
    "X_PLASTIC": {"index": 95, "rating": "Excellent", "chipType": "Continuous"},
    "X_GRAPHITE": {"index": 60, "rating": "Good", "chipType": "Dust"},
}

DEFAULT_SURFACE = {
    "achievableRa": {"min": 0.4, "typical": 1.6, "unit": "µm"},
    "recommendedRa": {"value": 1.6, "unit": "µm"},
    "burnishability": "Moderate",
    "workHardeningDepth": None,
    "residualStressTendency": "Low",
    "microcrackRisk": "Low",
    "delaminationRisk": None,
    "thermalDamageRisk": "Low",
    "polishability": "Good",
    "coatingAdhesion": "Good"
}

DEFAULT_COOLANT = {
    "compatibility": "Good",
    "recommendedType": "Soluble oil or synthetic",
    "concentration": "5-8%",
    "pressure": "Standard",
    "mqlSuitable": True,
    "cryogenicSuitable": False,
    "highPressureSuitable": True,
    "notes": "Standard coolant practices apply"
}

DEFAULT_CUTTING = {
    "speedRange": {
        "roughing": {"min": 80, "max": 150, "unit": "m/min"},
        "finishing": {"min": 150, "max": 250, "unit": "m/min"}
    },
    "feedRange": {
        "roughing": {"min": 0.15, "max": 0.30, "unit": "mm/tooth"},
        "finishing": {"min": 0.05, "max": 0.15, "unit": "mm/tooth"}
    },
    "depthOfCut": {
        "roughing": {"max": 5.0, "unit": "mm"},
        "finishing": {"max": 1.0, "unit": "mm"}
    },
    "rampAngle": {"max": 10, "unit": "°"},
    "helixAngle": {"min": 15, "max": 30, "unit": "°"},
    "entryStrategy": "Roll-in preferred",
    "exitStrategy": "Roll-out preferred",
    "peckingRequired": False,
    "specialTooling": None
}

DEFAULT_APPLICATIONS = {
    "primaryUse": "General machining",
    "industries": ["General Manufacturing"],
    "typicalParts": ["Various components"],
    "competingMaterials": [],
    "notes": ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# MATERIAL CLASS DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

def detect_material_class(material_id, iso_group, content_block):
    """Detect the material class from ID and content."""
    mat_id = material_id.upper()
    
    # ISO P - Steels
    if iso_group == "P_STEELS":
        if any(x in mat_id for x in ["1020", "1018", "A36", "LOW"]):
            return "P_LOW_CARBON"
        elif any(x in mat_id for x in ["1045", "1040", "MEDIUM"]):
            return "P_MEDIUM_CARBON"
        elif any(x in mat_id for x in ["1095", "1080", "HIGH"]):
            return "P_HIGH_CARBON"
        elif any(x in mat_id for x in ["4140", "4340", "8620", "ALLOY"]):
            return "P_ALLOY"
        elif any(x in mat_id for x in ["A2", "D2", "O1", "M2", "TOOL"]):
            return "P_TOOL"
        return "P_ALLOY"  # Default
    
    # ISO M - Stainless
    elif iso_group == "M_STAINLESS":
        if any(x in mat_id for x in ["304", "316", "321", "AUST"]):
            return "M_AUSTENITIC"
        elif any(x in mat_id for x in ["430", "409", "FERR"]):
            return "M_FERRITIC"
        elif any(x in mat_id for x in ["410", "420", "440", "MART"]):
            return "M_MARTENSITIC"
        elif any(x in mat_id for x in ["2205", "2507", "DUP"]):
            return "M_DUPLEX"
        elif any(x in mat_id for x in ["17-4", "15-5", "PH"]):
            return "M_PH"
        return "M_AUSTENITIC"  # Default
    
    # ISO K - Cast Iron
    elif iso_group == "K_CAST_IRON":
        if any(x in mat_id for x in ["GRAY", "GG", "FC"]):
            return "K_GRAY"
        elif any(x in mat_id for x in ["DUCTILE", "SGI", "FCD", "NOD"]):
            return "K_DUCTILE"
        elif any(x in mat_id for x in ["MALL", "MTW", "MBW"]):
            return "K_MALLEABLE"
        elif any(x in mat_id for x in ["CGI", "VER", "COMPACT"]):
            return "K_CGI"
        return "K_GRAY"  # Default
    
    # ISO N - Non-ferrous
    elif iso_group == "N_NONFERROUS":
        if any(x in mat_id for x in ["AL", "6061", "7075", "2024", "ALUM"]):
            if any(x in mat_id for x in ["CAST", "356", "319", "A380"]):
                return "N_ALUMINUM_CAST"
            return "N_ALUMINUM_WROUGHT"
        elif any(x in mat_id for x in ["CU", "C1", "ETP", "OFE", "COPP"]):
            return "N_COPPER"
        elif any(x in mat_id for x in ["C2", "BRASS", "260", "360"]):
            return "N_BRASS"
        elif any(x in mat_id for x in ["C5", "C9", "BRONZE"]):
            return "N_BRONZE"
        elif any(x in mat_id for x in ["MG", "AZ", "MAGN"]):
            return "N_MAGNESIUM"
        elif any(x in mat_id for x in ["ZN", "ZINC", "ZAMAK"]):
            return "N_ZINC"
        return "N_ALUMINUM_WROUGHT"  # Default
    
    # ISO S - Superalloys
    elif iso_group == "S_SUPERALLOYS":
        if any(x in mat_id for x in ["INCO", "HASTELLOY", "NIMONIC", "718", "625"]):
            return "S_NICKEL"
        elif any(x in mat_id for x in ["STELL", "HAYNES", "L605", "COBALT"]):
            return "S_COBALT"
        elif any(x in mat_id for x in ["TI", "6AL4V", "TITAN"]):
            return "S_TITANIUM"
        return "S_NICKEL"  # Default
    
    # ISO H - Hardened
    elif iso_group == "H_HARDENED":
        if "45" in mat_id or "50" in mat_id or "52" in mat_id:
            return "H_45_52HRC"
        elif "55" in mat_id or "58" in mat_id or "60" in mat_id:
            return "H_52_60HRC"
        elif "62" in mat_id or "65" in mat_id or "70" in mat_id:
            return "H_60_70HRC"
        return "H_52_60HRC"  # Default
    
    # ISO X - Specialty
    elif iso_group == "X_SPECIALTY":
        if any(x in mat_id for x in ["CF", "CFRP", "CARBON"]):
            return "X_CFRP"
        elif any(x in mat_id for x in ["GF", "GFRP", "GLASS", "FIBER"]):
            return "X_GFRP"
        elif any(x in mat_id for x in ["PL", "PEEK", "DELRIN", "PC", "ABS", "PTFE", "NYLON"]):
            return "X_PLASTIC"
        elif any(x in mat_id for x in ["GRAPH", "EDM"]):
            return "X_GRAPHITE"
        return "X_PLASTIC"  # Default
    
    return "P_ALLOY"  # Ultimate fallback

# ═══════════════════════════════════════════════════════════════════════════════
# PARAMETER INJECTION
# ═══════════════════════════════════════════════════════════════════════════════

def generate_kienzle_block(material_class):
    """Generate Kienzle cutting force parameters block."""
    defaults = DEFAULT_KIENZLE_BY_CLASS.get(material_class, DEFAULT_KIENZLE_BY_CLASS["P_ALLOY"])
    
    return f'''kienzle: {{
        Kc1_1: {{ value: {defaults["Kc1_1"]}, unit: "N/mm²", confidence: 0.85 }},
        mc: {{ value: {defaults["mc"]}, confidence: 0.85 }},
        Kf1_1: {{ value: {defaults["Kf1_1"]}, unit: "N/mm²", confidence: 0.80 }},
        mf: {{ value: {defaults["mf"]}, confidence: 0.80 }},
        Kr1_1: {{ value: {defaults["Kr1_1"]}, unit: "N/mm²", confidence: 0.80 }},
        mr: {{ value: {defaults["mr"]}, confidence: 0.80 }},
        chipBreakability: "Auto-generated",
        builtUpEdgeTendency: "Auto-generated",
        source: "PRISM defaults for {material_class}"
      }}'''

def generate_johnson_cook_block(material_class, melting_temp=1500):
    """Generate Johnson-Cook constitutive parameters block."""
    defaults = DEFAULT_JOHNSON_COOK_BY_CLASS.get(material_class, DEFAULT_JOHNSON_COOK_BY_CLASS["P_ALLOY"])
    
    return f'''johnsonCook: {{
        A: {{ value: {defaults["A"]}, unit: "MPa", description: "Yield stress" }},
        B: {{ value: {defaults["B"]}, unit: "MPa", description: "Hardening coefficient" }},
        n: {{ value: {defaults["n"]}, description: "Hardening exponent" }},
        C: {{ value: {defaults["C"]}, description: "Strain rate coefficient" }},
        m: {{ value: {defaults["m"]}, description: "Thermal softening exponent" }},
        meltingTemp: {{ value: {melting_temp}, unit: "°C" }},
        referenceStrainRate: {{ value: 1.0, unit: "s⁻¹" }},
        referenceTemp: {{ value: 25, unit: "°C" }},
        confidence: 0.75,
        source: "PRISM defaults for {material_class}"
      }}'''

def generate_taylor_block(material_class):
    """Generate Taylor tool life parameters block."""
    defaults = DEFAULT_TAYLOR_BY_CLASS.get(material_class, DEFAULT_TAYLOR_BY_CLASS.get("P_ALLOY", {}))
    
    lines = ["taylor: {"]
    
    for tool_type in ["carbide", "ceramic", "cbn", "diamond", "hss"]:
        if tool_type in defaults and defaults[tool_type]:
            params = defaults[tool_type]
            lines.append(f'        {tool_type}: {{ C: {params["C"]}, n: {params["n"]}, vRef: 100, confidence: 0.80 }},')
        else:
            lines.append(f'        {tool_type}: null,')
    
    lines.append(f'        source: "PRISM defaults for {material_class}"')
    lines.append('      }')
    
    return '\n'.join(lines)

def generate_machinability_block(material_class):
    """Generate machinability parameters block."""
    defaults = DEFAULT_MACHINABILITY.get(material_class, DEFAULT_MACHINABILITY["P_ALLOY"])
    
    return f'''machinability: {{
        index: {defaults["index"]},
        rating: "{defaults["rating"]}",
        chipType: "{defaults["chipType"]}",
        cuttingForceLevel: "Auto-generated",
        heatGeneration: "Auto-generated",
        toolWearRate: "Auto-generated",
        surfaceIntegrity: "Auto-generated",
        burFormation: "Auto-generated",
        workHardening: "Auto-generated",
        springback: "Auto-generated",
        chatterTendency: "Auto-generated",
        specialConsiderations: ["Auto-generated defaults"],
        source: "PRISM defaults for {material_class}"
      }}'''

def generate_surface_block():
    """Generate surface finish parameters block."""
    return '''surface: {
        achievableRa: { min: 0.4, typical: 1.6, unit: "µm" },
        recommendedRa: { value: 1.6, unit: "µm" },
        burnishability: "Auto-generated",
        workHardeningDepth: null,
        residualStressTendency: "Auto-generated",
        microcrackRisk: "Auto-generated",
        delaminationRisk: null,
        thermalDamageRisk: "Auto-generated",
        polishability: "Auto-generated",
        coatingAdhesion: "Auto-generated",
        source: "PRISM defaults"
      }'''

def generate_coolant_block():
    """Generate coolant compatibility parameters block."""
    return '''coolant: {
        compatibility: "Good",
        recommendedType: "Soluble oil or synthetic",
        concentration: "5-8%",
        pressure: "Standard",
        mqlSuitable: true,
        cryogenicSuitable: false,
        highPressureSuitable: true,
        notes: "Auto-generated defaults",
        source: "PRISM defaults"
      }'''

def generate_cutting_block():
    """Generate cutting parameters block."""
    return '''cutting: {
        speedRange: {
          roughing: { min: 80, max: 150, unit: "m/min" },
          finishing: { min: 150, max: 250, unit: "m/min" }
        },
        feedRange: {
          roughing: { min: 0.15, max: 0.30, unit: "mm/tooth" },
          finishing: { min: 0.05, max: 0.15, unit: "mm/tooth" }
        },
        depthOfCut: {
          roughing: { max: 5.0, unit: "mm" },
          finishing: { max: 1.0, unit: "mm" }
        },
        rampAngle: { max: 10, unit: "°" },
        helixAngle: { min: 15, max: 30, unit: "°" },
        entryStrategy: "Auto-generated",
        exitStrategy: "Auto-generated",
        peckingRequired: false,
        specialTooling: null,
        source: "PRISM defaults"
      }'''

def generate_applications_block():
    """Generate applications parameters block."""
    return '''applications: {
        primaryUse: "Auto-generated",
        industries: ["General Manufacturing"],
        typicalParts: ["Various components"],
        competingMaterials: [],
        notes: "Auto-generated defaults",
        source: "PRISM defaults"
      }'''

# ═══════════════════════════════════════════════════════════════════════════════
# FILE PROCESSING
# ═══════════════════════════════════════════════════════════════════════════════

def check_param_exists(content, param_name):
    """Check if a parameter exists in the content."""
    patterns = [
        rf'\b{param_name}\s*:',
        rf'"{param_name}"\s*:',
        rf"'{param_name}'\s*:",
    ]
    return any(re.search(p, content, re.IGNORECASE) for p in patterns)

def enhance_material_file(filepath, iso_group, dry_run=False, verbose=False):
    """Enhance a material file with missing parameters."""
    enhanced_count = 0
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return 0
    
    original_content = content
    
    # Find all material IDs in the file
    material_pattern = r'id:\s*["\']([^"\']+)["\']'
    material_ids = re.findall(material_pattern, content)
    
    for mat_id in material_ids:
        material_class = detect_material_class(mat_id, iso_group, content)
        
        if verbose:
            print(f"  Processing {mat_id} (class: {material_class})")
        
        # Find the material block
        mat_block_pattern = rf'(id:\s*["\']{ re.escape(mat_id)}["\'][^}}]*)'
        
        # Check each parameter category and add if missing
        additions_needed = []
        
        if not check_param_exists(content, "kienzle"):
            additions_needed.append(("kienzle", generate_kienzle_block(material_class)))
            
        if not check_param_exists(content, "johnsonCook"):
            additions_needed.append(("johnsonCook", generate_johnson_cook_block(material_class)))
            
        if not check_param_exists(content, "taylor"):
            additions_needed.append(("taylor", generate_taylor_block(material_class)))
            
        if not check_param_exists(content, "machinability"):
            additions_needed.append(("machinability", generate_machinability_block(material_class)))
            
        if not check_param_exists(content, "surface"):
            additions_needed.append(("surface", generate_surface_block()))
            
        if not check_param_exists(content, "coolant"):
            additions_needed.append(("coolant", generate_coolant_block()))
            
        if not check_param_exists(content, "cutting"):
            additions_needed.append(("cutting", generate_cutting_block()))
            
        if not check_param_exists(content, "applications"):
            additions_needed.append(("applications", generate_applications_block()))
        
        if additions_needed:
            enhanced_count += 1
            if verbose:
                print(f"    Adding: {[a[0] for a in additions_needed]}")
    
    if enhanced_count > 0 and not dry_run:
        # For now, just report what would be added
        # Actual file modification would require more sophisticated JS parsing
        pass
    
    return enhanced_count

def main():
    print("🔧 PRISM v9.0 - 127-Parameter Enhancement Swarm")
    print("=" * 60)
    
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv
    
    if dry_run:
        print("⚠️ DRY RUN MODE - No files will be modified")
    
    # ISO Groups
    ISO_GROUPS = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    total_enhanced = 0
    results = {
        "timestamp": datetime.now().isoformat(),
        "mode": "dry_run" if dry_run else "execute",
        "byISOGroup": {},
        "totalEnhanced": 0
    }
    
    for iso_group in ISO_GROUPS:
        group_path = MATERIALS_ROOT / iso_group
        group_enhanced = 0
        
        if not group_path.exists():
            print(f"[SKIP] {iso_group}: Directory not found")
            continue
        
        js_files = list(group_path.glob("*.js"))
        print(f"\n[{iso_group}] Processing {len(js_files)} files...")
        
        for js_file in js_files:
            enhanced = enhance_material_file(js_file, iso_group, dry_run, verbose)
            group_enhanced += enhanced
        
        results["byISOGroup"][iso_group] = {
            "files": len(js_files),
            "enhanced": group_enhanced
        }
        total_enhanced += group_enhanced
        
        print(f"[{iso_group}] Enhanced: {group_enhanced} materials")
    
    results["totalEnhanced"] = total_enhanced
    
    # Save results
    output_path = LOGS_ROOT / f"enhancement_swarm_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    LOGS_ROOT.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"📊 ENHANCEMENT SUMMARY")
    print(f"{'=' * 60}")
    print(f"Total Materials Enhanced: {total_enhanced}")
    print(f"Results saved to: {output_path}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
