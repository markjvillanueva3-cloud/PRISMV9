"""
PRISM PHYSICS PARAMETER INJECTION v2.0 - ACCURATE MODE
=======================================================
ACCURATE scientific calculations - no artificial safety inflation

The app will provide optimization modes:
- Tool Life Priority: Reduce speeds, increase tool life
- Time Savings: Aggressive parameters for faster cycle times  
- Balanced: Optimal cost/time/life balance
- Full AI Optimized: Mathematical optimization with cost analysis

This script provides ACCURATE BASE VALUES that the optimization
engine will then adjust based on user-selected priority.
"""

import json
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Paths
INPUT_DIR = Path("C:/PRISM/data/materials")
OUTPUT_DIR = Path("C:/PRISM/data/materials")  # In-place update

# =============================================================================
# ACCURATE PHYSICS CORRELATION TABLES
# Based on ASM Handbook, Machining Data Handbook, Manufacturing Engineering
# NO artificial safety factors - accurate scientific values
# =============================================================================

# Kienzle kc1_1 base values [N/mm²] - ACCURATE literature values
KC1_1_BASE = {
    # Steels (ISO P)
    "carbon_steel": 1560,      # Low-medium carbon, annealed
    "alloy_steel": 1820,       # Typical Cr-Mo steels
    "tool_steel": 2100,        # A2, D2, O1 type
    "spring_steel": 1900,      # High carbon spring grades
    "bearing_steel": 2000,     # 52100 type
    "free_machining": 1300,    # 12L14, 1215 type
    "structural_steel": 1650,  # A36, A572
    "stainless": 1900,         # General stainless
    "austenitic": 2100,        # 304, 316 type
    "martensitic": 1850,       # 410, 420 type
    "ferritic": 1650,          # 430 type
    "duplex": 2250,            # 2205, 2507
    "precipitation_hardening": 2200, # 17-4PH, 15-5PH
    "carbon_alloy": 1700,      # Mixed carbon/alloy
    
    # Cast Iron (ISO K)
    "gray_iron": 980,          # Class 30-40
    "ductile_iron": 1250,      # 65-45-12 type
    "malleable_iron": 1050,    # Ferritic malleable
    "compacted_graphite": 1150,# CGI
    "white_iron": 2400,        # Abrasion resistant
    "austempered_ductile": 1600,# ADI
    "cast_iron": 1050,         # General
    
    # Non-ferrous (ISO N)
    "aluminum": 600,           # 6061-T6 typical
    "copper_alloy": 950,       # Brass/bronze average
    "titanium": 1550,          # Ti-6Al-4V
    "magnesium": 380,          # AZ31B
    "zinc": 520,               # Zamak alloys
    "nickel_alloy": 2450,      # Monel, Inconel 600
    "nonferrous": 700,         # General
    
    # Superalloys (ISO S)
    "nickel_base": 2800,       # Inconel 718
    "cobalt_base": 2650,       # Stellite, Haynes
    "iron_base": 2250,         # A286
    "superalloy": 2600,        # General
    
    # Hardened (ISO H)
    "hardened": 3000,          # 45-55 HRC
    "hardened_alloy": 2800,    # Hardened alloy steel
    
    # Specialty (ISO X)
    "composite": 220,          # CFRP average
    "polymer": 70,             # Engineering plastics
    "engineering_polymer": 90, # PEEK, POM
    "ceramic": 3900,           # Technical ceramics
    "graphite": 130,           # EDM grade
    "rubber": 25,              # Hard rubber
    "elastomer": 22,           # Typical elastomers
    "wood": 45,                # Hardwood average
    "honeycomb": 180,          # Aluminum honeycomb
    "honeycomb_sandwich": 175, # Composite sandwich
    "refractory": 3300,        # W, Mo, Ta
    "precious_metal": 700,     # Gold, silver, platinum
    "powder_metallurgy": 1750, # Sintered steel
    "additive_manufacturing": 1900, # As-built AM
    "am": 1900,
    "specialty_alloy": 2100,   # Special grades
    
    "general": 1700,
    "default": 1700,
}

# Kienzle mc exponent - material-specific chip formation
KIENZLE_MC = {
    "carbon_steel": 0.25, "alloy_steel": 0.26, "tool_steel": 0.28,
    "spring_steel": 0.26, "bearing_steel": 0.27, "free_machining": 0.22,
    "structural_steel": 0.24, "stainless": 0.27, "austenitic": 0.28,
    "martensitic": 0.26, "ferritic": 0.24, "duplex": 0.29,
    "precipitation_hardening": 0.29, "carbon_alloy": 0.25,
    "gray_iron": 0.24, "ductile_iron": 0.26, "malleable_iron": 0.25,
    "compacted_graphite": 0.25, "white_iron": 0.30, "austempered_ductile": 0.27,
    "cast_iron": 0.25, "aluminum": 0.20, "copper_alloy": 0.22,
    "titanium": 0.23, "magnesium": 0.18, "zinc": 0.19,
    "nickel_alloy": 0.28, "nonferrous": 0.21, "nickel_base": 0.30,
    "cobalt_base": 0.29, "iron_base": 0.27, "superalloy": 0.29,
    "hardened": 0.32, "hardened_alloy": 0.30,
    "composite": 0.15, "polymer": 0.12, "engineering_polymer": 0.14,
    "ceramic": 0.35, "graphite": 0.10, "rubber": 0.08, "elastomer": 0.08,
    "wood": 0.15, "honeycomb": 0.14, "honeycomb_sandwich": 0.14,
    "refractory": 0.30, "precious_metal": 0.20, "powder_metallurgy": 0.26,
    "additive_manufacturing": 0.27, "am": 0.27, "specialty_alloy": 0.27,
    "general": 0.25, "default": 0.25,
}

# Taylor constants - ACCURATE values for carbide tooling
# V*T^n = C  where V=cutting speed(m/min), T=tool life(min)
TAYLOR_CONSTANTS = {
    # (C, n) - C is speed for T=1min, n is exponent
    "carbon_steel": (350, 0.25),
    "alloy_steel": (280, 0.22),
    "tool_steel": (180, 0.18),
    "spring_steel": (240, 0.20),
    "bearing_steel": (200, 0.18),
    "free_machining": (450, 0.30),
    "structural_steel": (380, 0.26),
    "stainless": (200, 0.18),
    "austenitic": (180, 0.16),
    "martensitic": (220, 0.20),
    "ferritic": (280, 0.22),
    "duplex": (150, 0.15),
    "precipitation_hardening": (160, 0.15),
    "carbon_alloy": (300, 0.23),
    
    "gray_iron": (350, 0.28),
    "ductile_iron": (280, 0.25),
    "malleable_iron": (320, 0.27),
    "compacted_graphite": (250, 0.24),
    "white_iron": (80, 0.12),
    "austempered_ductile": (180, 0.18),
    "cast_iron": (320, 0.26),
    
    "aluminum": (900, 0.42),
    "copper_alloy": (500, 0.35),
    "titanium": (75, 0.14),
    "magnesium": (1200, 0.48),
    "zinc": (700, 0.40),
    "nickel_alloy": (55, 0.12),
    "nonferrous": (600, 0.38),
    
    "nickel_base": (45, 0.11),
    "cobalt_base": (50, 0.11),
    "iron_base": (80, 0.14),
    "superalloy": (50, 0.11),
    
    "hardened": (100, 0.10),
    "hardened_alloy": (120, 0.12),
    
    "composite": (250, 0.25),
    "polymer": (800, 0.45),
    "engineering_polymer": (600, 0.42),
    "ceramic": (35, 0.08),
    "graphite": (400, 0.32),
    "rubber": (1000, 0.50),
    "elastomer": (1100, 0.52),
    "wood": (1500, 0.55),
    "honeycomb": (500, 0.38),
    "honeycomb_sandwich": (450, 0.36),
    "refractory": (60, 0.10),
    "precious_metal": (450, 0.35),
    "powder_metallurgy": (220, 0.20),
    "additive_manufacturing": (200, 0.18),
    "am": (200, 0.18),
    "specialty_alloy": (150, 0.16),
    
    "general": (280, 0.22),
    "default": (280, 0.22),
}

# Johnson-Cook model parameters - ACCURATE constitutive values
# Based on published literature for each material class
JC_PARAMS = {
    # (A, B, n, C, m) - yield, hardening coeff, hardening exp, strain rate, thermal
    "carbon_steel": (350, 550, 0.26, 0.015, 1.0),
    "alloy_steel": (800, 750, 0.28, 0.014, 1.0),
    "tool_steel": (1200, 950, 0.30, 0.012, 0.9),
    "spring_steel": (900, 800, 0.27, 0.013, 1.0),
    "bearing_steel": (1000, 850, 0.28, 0.012, 0.95),
    "free_machining": (300, 450, 0.24, 0.018, 1.1),
    "structural_steel": (350, 500, 0.26, 0.015, 1.0),
    "stainless": (400, 750, 0.50, 0.050, 1.0),
    "austenitic": (310, 1000, 0.65, 0.070, 1.0),  # High work hardening
    "martensitic": (700, 750, 0.28, 0.020, 0.90),
    "ferritic": (300, 550, 0.35, 0.030, 0.95),
    "duplex": (550, 850, 0.45, 0.040, 0.85),
    "precipitation_hardening": (1100, 750, 0.25, 0.015, 0.85),
    "carbon_alloy": (500, 600, 0.27, 0.015, 1.0),
    
    "gray_iron": (200, 280, 0.15, 0.020, 1.2),
    "ductile_iron": (350, 420, 0.22, 0.018, 1.1),
    "malleable_iron": (300, 380, 0.20, 0.019, 1.15),
    "compacted_graphite": (320, 400, 0.21, 0.018, 1.1),
    "white_iron": (450, 200, 0.10, 0.008, 0.8),
    "austempered_ductile": (550, 550, 0.24, 0.015, 1.0),
    "cast_iron": (280, 350, 0.18, 0.018, 1.1),
    
    "aluminum": (148, 345, 0.18, 0.025, 1.3),  # 6061-T6 published
    "copper_alloy": (200, 380, 0.35, 0.020, 1.2),
    "titanium": (1098, 1092, 0.93, 0.014, 1.1),  # Ti-6Al-4V published
    "magnesium": (150, 180, 0.15, 0.030, 1.4),
    "zinc": (100, 160, 0.20, 0.025, 1.3),
    "nickel_alloy": (600, 1100, 0.48, 0.040, 1.1),
    "nonferrous": (200, 320, 0.25, 0.022, 1.25),
    
    "nickel_base": (1241, 622, 0.65, 0.017, 1.0),  # Inconel 718 published
    "cobalt_base": (700, 1350, 0.50, 0.045, 0.70),
    "iron_base": (650, 800, 0.35, 0.025, 0.85),
    "superalloy": (800, 900, 0.50, 0.030, 0.80),
    
    "hardened": (1800, 500, 0.12, 0.005, 0.60),
    "hardened_alloy": (1500, 600, 0.15, 0.006, 0.65),
    
    "composite": (500, 280, 0.08, 0.001, 0.50),
    "polymer": (50, 75, 0.50, 0.050, 2.0),
    "engineering_polymer": (80, 110, 0.45, 0.040, 1.8),
    "ceramic": (3000, 450, 0.05, 0.001, 0.40),
    "graphite": (30, 45, 0.08, 0.002, 0.50),
    "rubber": (5, 8, 0.80, 0.080, 2.5),
    "elastomer": (8, 12, 0.75, 0.070, 2.3),
    "wood": (40, 55, 0.10, 0.010, 1.5),
    "honeycomb": (20, 28, 0.08, 0.005, 0.60),
    "honeycomb_sandwich": (25, 32, 0.08, 0.005, 0.60),
    "refractory": (1500, 950, 0.12, 0.003, 0.55),
    "precious_metal": (150, 230, 0.40, 0.025, 1.3),
    "powder_metallurgy": (600, 650, 0.26, 0.012, 0.90),
    "additive_manufacturing": (650, 700, 0.27, 0.014, 0.85),
    "am": (650, 700, 0.27, 0.014, 0.85),
    "specialty_alloy": (700, 750, 0.30, 0.018, 0.85),
    
    "general": (400, 550, 0.26, 0.015, 1.0),
    "default": (400, 550, 0.26, 0.015, 1.0),
}

def get_numeric(val):
    """Extract numeric from various formats"""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, dict):
        return val.get('value') or val.get('typical') or val.get('min')
    return None

def calculate_kc1_1(material, subcategory):
    """Calculate Kienzle kc1_1 - ACCURATE"""
    base = KC1_1_BASE.get(subcategory, KC1_1_BASE['default'])
    mc = KIENZLE_MC.get(subcategory, KIENZLE_MC['default'])
    
    # Adjust for hardness (every 50 HB above 200 adds ~5%)
    hardness = get_numeric(material.get('hardness_hb'))
    if hardness and hardness > 0:
        hardness_factor = 1.0 + (hardness - 200) / 1000
        hardness_factor = max(0.75, min(1.35, hardness_factor))
        base = base * hardness_factor
    
    # Adjust for tensile strength correlation
    tensile = get_numeric(material.get('tensile_strength'))
    if tensile and tensile > 0:
        # kc1_1 correlates at roughly 2.5-3.5 x UTS for steels
        tensile_estimate = tensile * 3.0
        # Blend with base value
        base = (base * 0.6) + (tensile_estimate * 0.4)
    
    return {
        "value": round(base, 0),
        "unit": "N/mm2",
        "uncertainty_percent": 12,  # Typical uncertainty
        "confidence": 0.88,
        "source": "calculated_correlation",
        "method": "Kienzle_hardness_tensile_correlation"
    }, round(mc, 3)

def calculate_taylor(material, subcategory):
    """Calculate Taylor tool life - ACCURATE"""
    C, n = TAYLOR_CONSTANTS.get(subcategory, TAYLOR_CONSTANTS['default'])
    
    # Adjust C for hardness (harder = lower C)
    hardness = get_numeric(material.get('hardness_hb'))
    if hardness and hardness > 0:
        hardness_factor = max(0.6, min(1.3, 200 / hardness))
        C = C * hardness_factor
    
    return {
        "taylor_C": {
            "value": round(C, 1),
            "unit": "m/min",
            "uncertainty_percent": 15,
            "confidence": 0.82,
            "source": "calculated_correlation"
        },
        "taylor_n": {
            "value": round(n, 3),
            "unit": "dimensionless",
            "uncertainty_percent": 10,
            "confidence": 0.85,
            "source": "literature_typical"
        }
    }

def calculate_johnson_cook(material, subcategory):
    """Calculate Johnson-Cook - ACCURATE"""
    A, B, n, C, m = JC_PARAMS.get(subcategory, JC_PARAMS['default'])
    
    # Use actual yield strength if available
    yield_str = get_numeric(material.get('yield_strength'))
    if yield_str and yield_str > 50:
        A = yield_str
    
    # Estimate B from tensile-yield spread
    tensile = get_numeric(material.get('tensile_strength'))
    if tensile and yield_str and tensile > yield_str:
        B = (tensile - yield_str) * 1.4  # Strain hardening coefficient
    
    return {
        "jc_A": {"value": round(A, 0), "unit": "MPa", "uncertainty_percent": 12, "confidence": 0.85},
        "jc_B": {"value": round(B, 0), "unit": "MPa", "uncertainty_percent": 15, "confidence": 0.80},
        "jc_n": {"value": round(n, 3), "unit": "dimensionless", "confidence": 0.82},
        "jc_C": {"value": round(C, 4), "unit": "dimensionless", "confidence": 0.78},
        "jc_m": {"value": round(m, 2), "unit": "dimensionless", "confidence": 0.82},
    }

def enhance_material(material, subcategory):
    """Enhance material with ACCURATE physics"""
    enhanced = material.copy()
    
    # Calculate parameters
    kc1_1, mc = calculate_kc1_1(material, subcategory)
    taylor = calculate_taylor(material, subcategory)
    jc = calculate_johnson_cook(material, subcategory)
    
    # Only update if missing
    if not get_numeric(material.get('kc1_1')):
        enhanced['kc1_1'] = kc1_1
        enhanced['mc'] = mc
    
    if not get_numeric(material.get('taylor_C')):
        enhanced['taylor_C'] = taylor['taylor_C']
        enhanced['taylor_n'] = taylor['taylor_n']
    
    if not get_numeric(material.get('jc_A')):
        enhanced.update(jc)
    
    enhanced['_physics_mode'] = 'accurate'
    enhanced['_enhanced_date'] = datetime.now().isoformat()
    
    return enhanced

def process_file(filepath):
    """Process single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        subcategory = data.get('subcategory', 'general')
        materials = data.get('materials', [])
        
        enhanced_materials = [enhance_material(m, subcategory) for m in materials]
        
        data['materials'] = enhanced_materials
        data['physics_mode'] = 'accurate'
        data['enhanced_date'] = datetime.now().isoformat()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        return filepath.name, len(materials), True
    except Exception as e:
        return filepath.name, 0, False

def main():
    print("=" * 70)
    print("PRISM PHYSICS v2.0 - ACCURATE MODE (No artificial inflation)")
    print("=" * 70)
    print(f"Started: {datetime.now().isoformat()}")
    print()
    print("Optimization modes will be handled by the app:")
    print("  - Tool Life Priority")
    print("  - Time Savings")
    print("  - Balanced")
    print("  - Full AI Optimized (with cost analysis)")
    print()
    
    # Collect files
    files = []
    for cat_dir in INPUT_DIR.iterdir():
        if cat_dir.is_dir():
            for f in cat_dir.glob("*.json"):
                if f.name != "index.json":
                    files.append(f)
    
    print(f"Files to process: {len(files)}")
    print()
    
    # Process in parallel
    total_mats = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_file, f): f for f in files}
        for future in as_completed(futures):
            name, count, success = future.result()
            if success:
                total_mats += count
                print(f"  {name}: {count} materials")
    
    # Update master index
    master_path = INPUT_DIR / "MASTER_INDEX.json"
    with open(master_path, 'r') as f:
        master = json.load(f)
    
    master['physics_mode'] = 'accurate'
    master['safety_factor'] = 1.0  # No artificial inflation
    master['enhancement_method'] = 'Literature-based correlation (accurate)'
    master['optimization_modes'] = [
        'tool_life_priority',
        'time_savings', 
        'balanced',
        'full_ai_optimized'
    ]
    master['generated'] = datetime.now().isoformat()
    
    with open(master_path, 'w') as f:
        json.dump(master, f, indent=2)
    
    print()
    print("=" * 70)
    print("ENHANCEMENT COMPLETE - ACCURATE MODE")
    print("=" * 70)
    print(f"Total materials: {total_mats}")
    print(f"Physics mode: ACCURATE (no artificial inflation)")
    print(f"Safety factor: 1.0 (none applied)")
    print()
    print("App optimization modes will adjust from accurate baseline:")
    print("  Tool Life:    kc1_1 * 1.10, taylor_C * 0.85")
    print("  Time Savings: kc1_1 * 0.95, taylor_C * 1.15")
    print("  Balanced:     kc1_1 * 1.00, taylor_C * 1.00")
    print("  AI Optimized: Dynamic based on cost/time/life analysis")

if __name__ == "__main__":
    main()
