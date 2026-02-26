#!/usr/bin/env python3
"""
PRISM Aluminum Materials - Compact Data Definitions
====================================================
All aluminum alloys in compact format for generator.

Format per material:
{
    "id": "N-AL-XXX",           # PRISM ID
    "aa": "XXXX",               # AA designation
    "name": "Description",       # Full name with temper
    "uns": "A9XXXX",            # UNS designation
    "din": "3.XXXX",            # DIN designation
    "temper": "T6",             # Temper designation
    "condition": "...",         # Heat treatment condition
    
    # Mechanical
    "hb": 95,                   # Brinell hardness
    "tensile": 310,             # Tensile strength MPa
    "yield": 276,               # Yield strength MPa  
    "elong": 12,                # Elongation %
    
    # Machinability
    "mach": 100,                # Rating (vs AISI 1212 = 100)
    "kc11": 680,                # Kienzle specific cutting force
    "mc": 0.25,                 # Kienzle mc exponent
    "taylor_C": 850,            # Taylor tool life constant
    "taylor_n": 0.35,           # Taylor exponent
    
    # Composition (min, typical, max)
    "Zn": (5.1, 5.6, 6.1),      
    "Mg": (0.8, 1.0, 1.2),      
    "Cu": (0.15, 0.28, 0.40),   
    # ... more elements
    
    # Physical
    "thermal_k": 167,           # Thermal conductivity W/m·K
    "density": 2700,            # Density kg/m³
    "solidus": 582,             # Solidus temp °C
    
    # Johnson-Cook
    "jc": {"A": 250, "B": 430, "n": 0.34, "C": 0.015, "m": 1.0},
    
    # Other
    "scc": "resistant",         # Stress corrosion susceptibility
    "apps": ["app1", "app2"],   # Applications
    "notes": "..."              # Special notes
}
"""

# =============================================================================
# 1XXX SERIES - Pure Aluminum (99%+ Al)
# =============================================================================

ALUMINUM_1XXX = [
    {"id": "N-AL-001", "aa": "1050", "name": "1050-O Pure Aluminum", "uns": "A91050",
     "temper": "O", "condition": "Annealed",
     "hb": 20, "tensile": 75, "yield": 28, "elong": 40,
     "mach": 40, "kc11": 400, "mc": 0.30, "taylor_C": 1100, "taylor_n": 0.40,
     "Al_min": 99.5, "thermal_k": 229, "density": 2705, "solidus": 645, "scc": "immune",
     "jc": {"A": 30, "B": 200, "n": 0.55, "C": 0.030, "m": 1.30},
     "apps": ["electrical_conductors", "chemical_equipment", "reflectors"],
     "notes": "99.5% pure. VERY soft/gummy. Excellent conductivity (61% IACS)"},
    
    {"id": "N-AL-002", "aa": "1050", "name": "1050-H14 Half-Hard", "uns": "A91050",
     "temper": "H14", "condition": "Strain Hardened - Half Hard",
     "hb": 34, "tensile": 105, "yield": 90, "elong": 10,
     "mach": 55, "kc11": 450, "mc": 0.28, "taylor_C": 1050, "taylor_n": 0.38,
     "Al_min": 99.5, "thermal_k": 229, "density": 2705, "solidus": 645, "scc": "immune",
     "jc": {"A": 80, "B": 220, "n": 0.45, "C": 0.025, "m": 1.20},
     "apps": ["heat_exchangers", "foil", "nameplates"],
     "notes": "Strain hardened. Better machinability than O temper"},

    {"id": "N-AL-003", "aa": "1100", "name": "1100-O Commercial Pure", "uns": "A91100",
     "temper": "O", "condition": "Annealed",
     "hb": 23, "tensile": 90, "yield": 35, "elong": 35,
     "mach": 45, "kc11": 420, "mc": 0.29, "taylor_C": 1080, "taylor_n": 0.39,
     "Al_min": 99.0, "Cu": (0.05, 0.12, 0.20), "thermal_k": 222, "density": 2710, "solidus": 643, "scc": "immune",
     "jc": {"A": 40, "B": 210, "n": 0.52, "C": 0.028, "m": 1.25},
     "apps": ["chemical_tanks", "cooking_utensils", "heat_exchangers"],
     "notes": "Most widely used 1xxx. Small Cu addition improves strength"},

    {"id": "N-AL-004", "aa": "1100", "name": "1100-H14 Half-Hard", "uns": "A91100",
     "temper": "H14", "condition": "Strain Hardened - Half Hard",
     "hb": 32, "tensile": 125, "yield": 115, "elong": 9,
     "mach": 60, "kc11": 470, "mc": 0.27, "taylor_C": 1020, "taylor_n": 0.37,
     "Al_min": 99.0, "Cu": (0.05, 0.12, 0.20), "thermal_k": 222, "density": 2710, "solidus": 643, "scc": "immune",
     "jc": {"A": 100, "B": 240, "n": 0.42, "C": 0.024, "m": 1.15},
     "apps": ["sheet_metal_work", "deep_drawing", "spinning"],
     "notes": "Work hardened for moderate strength. Good formability"},

    {"id": "N-AL-005", "aa": "1350", "name": "1350-O Electrical", "uns": "A91350",
     "temper": "O", "condition": "Annealed",
     "hb": 18, "tensile": 83, "yield": 28, "elong": 23,
     "mach": 35, "kc11": 380, "mc": 0.31, "taylor_C": 1120, "taylor_n": 0.41,
     "Al_min": 99.5, "thermal_k": 234, "density": 2705, "solidus": 646, "scc": "immune",
     "jc": {"A": 28, "B": 195, "n": 0.58, "C": 0.032, "m": 1.35},
     "apps": ["electrical_bus_bars", "power_transmission", "transformer_windings"],
     "notes": "EC Grade (Electrical Conductor). 62% IACS minimum"},
]

# =============================================================================  
# 2XXX SERIES - Al-Cu Aerospace Alloys
# =============================================================================

ALUMINUM_2XXX = [
    {"id": "N-AL-011", "aa": "2011", "name": "2011-T3 Free Machining", "uns": "A92011",
     "temper": "T3", "condition": "Solution + Cold Work + Natural Age",
     "hb": 95, "tensile": 400, "yield": 296, "elong": 15,
     "mach": 300, "kc11": 620, "mc": 0.26, "taylor_C": 1200, "taylor_n": 0.44,
     "Cu": (5.0, 5.5, 6.0), "Bi": (0.20, 0.40, 0.60), "Pb": (0.20, 0.40, 0.60),
     "thermal_k": 151, "density": 2830, "solidus": 535, "scc": "susceptible",
     "jc": {"A": 260, "B": 400, "n": 0.30, "C": 0.015, "m": 0.95},
     "apps": ["screw_machine_products", "fittings", "connectors"],
     "notes": "BEST machining aluminum - Bi/Pb chip breakers. 300% rating!"},

    {"id": "N-AL-012", "aa": "2014", "name": "2014-T6 Peak Aged", "uns": "A92014",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 135, "tensile": 485, "yield": 415, "elong": 9,
     "mach": 120, "kc11": 780, "mc": 0.24, "taylor_C": 800, "taylor_n": 0.34,
     "Cu": (3.9, 4.4, 5.0), "Mg": (0.20, 0.50, 0.80), "Si": (0.50, 0.80, 1.2), "Mn": (0.40, 0.70, 1.2),
     "thermal_k": 154, "density": 2800, "solidus": 507, "scc": "susceptible",
     "jc": {"A": 350, "B": 470, "n": 0.28, "C": 0.012, "m": 0.90},
     "apps": ["aerospace_forgings", "truck_frames", "aircraft_fittings"],
     "notes": "High-strength forging alloy. Good hot workability"},

    {"id": "N-AL-013", "aa": "2017", "name": "2017-T4 Duralumin", "uns": "A92017",
     "temper": "T4", "condition": "Solution + Natural Age",
     "hb": 105, "tensile": 425, "yield": 275, "elong": 22,
     "mach": 95, "kc11": 720, "mc": 0.25, "taylor_C": 840, "taylor_n": 0.35,
     "Cu": (3.5, 4.0, 4.5), "Mg": (0.40, 0.60, 0.80), "Mn": (0.40, 0.70, 1.0),
     "thermal_k": 134, "density": 2790, "solidus": 513, "scc": "susceptible",
     "jc": {"A": 280, "B": 440, "n": 0.32, "C": 0.016, "m": 0.95},
     "apps": ["rivets", "screw_machine_stock", "fittings"],
     "notes": "Original Duralumin rivet alloy. Good natural aging"},

    {"id": "N-AL-014", "aa": "2024", "name": "2024-O Annealed", "uns": "A92024",
     "temper": "O", "condition": "Annealed",
     "hb": 47, "tensile": 185, "yield": 75, "elong": 20,
     "mach": 65, "kc11": 500, "mc": 0.27, "taylor_C": 960, "taylor_n": 0.37,
     "Cu": (3.8, 4.4, 4.9), "Mg": (1.2, 1.5, 1.8), "Mn": (0.30, 0.60, 0.90),
     "thermal_k": 121, "density": 2780, "solidus": 502, "scc": "resistant",
     "jc": {"A": 80, "B": 350, "n": 0.45, "C": 0.025, "m": 1.15},
     "apps": ["forming_stock", "cold_heading", "rivets"],
     "notes": "Soft formable state. Very gummy - high BUE"},

    {"id": "N-AL-015", "aa": "2024", "name": "2024-T3 Solution + Cold Work", "uns": "A92024",
     "temper": "T3", "condition": "Solution + Cold Work + Natural Age",
     "hb": 120, "tensile": 485, "yield": 345, "elong": 18,
     "mach": 110, "kc11": 760, "mc": 0.24, "taylor_C": 820, "taylor_n": 0.34,
     "Cu": (3.8, 4.4, 4.9), "Mg": (1.2, 1.5, 1.8), "Mn": (0.30, 0.60, 0.90),
     "thermal_k": 121, "density": 2780, "solidus": 502, "scc": "susceptible",
     "jc": {"A": 310, "B": 455, "n": 0.30, "C": 0.013, "m": 0.92},
     "apps": ["aircraft_skins", "fuselage_panels", "wing_tension_members"],
     "notes": "PRIMARY aircraft skin alloy. Excellent fatigue"},

    {"id": "N-AL-016", "aa": "2024", "name": "2024-T351 Stress Relieved", "uns": "A92024",
     "temper": "T351", "condition": "Solution + Stretch + Natural Age",
     "hb": 120, "tensile": 470, "yield": 325, "elong": 17,
     "mach": 115, "kc11": 750, "mc": 0.24, "taylor_C": 830, "taylor_n": 0.34,
     "Cu": (3.8, 4.4, 4.9), "Mg": (1.2, 1.5, 1.8), "Mn": (0.30, 0.60, 0.90),
     "thermal_k": 121, "density": 2780, "solidus": 502, "scc": "susceptible",
     "jc": {"A": 300, "B": 450, "n": 0.31, "C": 0.014, "m": 0.93},
     "apps": ["precision_plate", "wing_skins", "machined_parts"],
     "notes": "Stress-relieved plate. Minimal machining distortion"},

    {"id": "N-AL-017", "aa": "2024", "name": "2024-T4 Solution Treated", "uns": "A92024",
     "temper": "T4", "condition": "Solution + Natural Age",
     "hb": 120, "tensile": 469, "yield": 324, "elong": 19,
     "mach": 105, "kc11": 740, "mc": 0.25, "taylor_C": 840, "taylor_n": 0.35,
     "Cu": (3.8, 4.4, 4.9), "Mg": (1.2, 1.5, 1.8), "Mn": (0.30, 0.60, 0.90),
     "thermal_k": 121, "density": 2780, "solidus": 502, "scc": "susceptible",
     "jc": {"A": 295, "B": 445, "n": 0.32, "C": 0.015, "m": 0.95},
     "apps": ["aircraft_structures", "truck_wheels", "screw_products"],
     "notes": "Naturally aged. Good fatigue resistance"},

    {"id": "N-AL-018", "aa": "2219", "name": "2219-T87 Space Applications", "uns": "A92219",
     "temper": "T87", "condition": "Solution + Cold Work + Artificial Age",
     "hb": 130, "tensile": 476, "yield": 393, "elong": 10,
     "mach": 115, "kc11": 780, "mc": 0.24, "taylor_C": 800, "taylor_n": 0.33,
     "Cu": (5.8, 6.3, 6.8), "Mn": (0.20, 0.30, 0.40), "V": (0.05, 0.10, 0.15), "Zr": (0.10, 0.18, 0.25),
     "thermal_k": 120, "density": 2840, "solidus": 543, "scc": "resistant",
     "jc": {"A": 340, "B": 465, "n": 0.28, "C": 0.012, "m": 0.88},
     "apps": ["space_shuttle_external_tank", "cryogenic_tanks", "aerospace_welded"],
     "notes": "WELDABLE 2xxx! Space Shuttle ET alloy. Cryogenic properties"},

    {"id": "N-AL-019", "aa": "2618", "name": "2618-T6 Elevated Temperature", "uns": "A92618",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 115, "tensile": 440, "yield": 370, "elong": 10,
     "mach": 90, "kc11": 750, "mc": 0.25, "taylor_C": 780, "taylor_n": 0.33,
     "Cu": (1.9, 2.3, 2.7), "Mg": (1.3, 1.6, 1.8), "Ni": (0.9, 1.1, 1.2), "Fe": (0.9, 1.1, 1.4),
     "thermal_k": 147, "density": 2760, "solidus": 549, "scc": "resistant",
     "jc": {"A": 320, "B": 450, "n": 0.30, "C": 0.014, "m": 0.92},
     "apps": ["aircraft_pistons", "racing_pistons", "high_temp_parts"],
     "notes": "Fe/Ni for elevated temp strength. Up to 200°C"},

    {"id": "N-AL-020", "aa": "2024", "name": "2024 Alclad-T3", "uns": "A92024",
     "temper": "T3 Alclad", "condition": "Clad + Solution + Cold Work",
     "hb": 115, "tensile": 450, "yield": 315, "elong": 16,
     "mach": 100, "kc11": 730, "mc": 0.25, "taylor_C": 850, "taylor_n": 0.35,
     "Cu": (3.8, 4.4, 4.9), "Mg": (1.2, 1.5, 1.8), "cladding": "1230 (4-5% per side)",
     "thermal_k": 125, "density": 2770, "solidus": 502, "scc": "good",
     "jc": {"A": 290, "B": 440, "n": 0.31, "C": 0.014, "m": 0.94},
     "apps": ["aircraft_skins", "fuselage_panels"],
     "notes": "Pure Al clad for corrosion protection. ~5% reduced strength"},
]

# =============================================================================
# ALUMINUM CAST ALLOYS
# =============================================================================

ALUMINUM_CAST = [
    {"id": "N-AL-071", "aa": "A356", "name": "A356-T6 Premium Casting", "uns": "A13560",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 75, "tensile": 275, "yield": 207, "elong": 6,
     "mach": 75, "kc11": 620, "mc": 0.26, "taylor_C": 880, "taylor_n": 0.36,
     "Si": (6.5, 7.0, 7.5), "Mg": (0.25, 0.35, 0.45), "Fe_max": 0.20,
     "thermal_k": 151, "density": 2680, "solidus": 557, "scc": "resistant",
     "jc": {"A": 180, "B": 380, "n": 0.38, "C": 0.018, "m": 1.05},
     "apps": ["aerospace_castings", "automotive_wheels", "structural_castings"],
     "notes": "PREMIUM casting alloy. Low Fe for best properties"},

    {"id": "N-AL-072", "aa": "356", "name": "356-T6 General Casting", "uns": "A03560",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 70, "tensile": 228, "yield": 165, "elong": 3,
     "mach": 70, "kc11": 600, "mc": 0.26, "taylor_C": 900, "taylor_n": 0.36,
     "Si": (6.5, 7.0, 7.5), "Mg": (0.25, 0.35, 0.45), "Fe_max": 0.60,
     "thermal_k": 151, "density": 2680, "solidus": 557, "scc": "resistant",
     "jc": {"A": 160, "B": 360, "n": 0.40, "C": 0.020, "m": 1.08},
     "apps": ["automotive_parts", "pump_housings", "general_castings"],
     "notes": "Standard grade with higher Fe tolerance than A356"},

    {"id": "N-AL-073", "aa": "A380", "name": "A380 Die Cast", "uns": "A13800",
     "temper": "F", "condition": "As-Cast",
     "hb": 80, "tensile": 324, "yield": 159, "elong": 3.5,
     "mach": 80, "kc11": 650, "mc": 0.25, "taylor_C": 860, "taylor_n": 0.35,
     "Si": (7.5, 8.5, 9.5), "Cu": (3.0, 3.5, 4.0), "Fe_max": 1.3,
     "thermal_k": 96, "density": 2740, "solidus": 538, "scc": "resistant",
     "jc": {"A": 200, "B": 400, "n": 0.35, "C": 0.016, "m": 1.00},
     "apps": ["die_castings", "housings", "brackets", "covers"],
     "notes": "Most widely used die casting alloy"},

    {"id": "N-AL-074", "aa": "319", "name": "319-T6 Sand/Permanent Mold", "uns": "A03190",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 80, "tensile": 250, "yield": 165, "elong": 2,
     "mach": 85, "kc11": 660, "mc": 0.25, "taylor_C": 850, "taylor_n": 0.35,
     "Si": (5.5, 6.0, 6.5), "Cu": (3.0, 3.5, 4.0), "Fe_max": 1.0,
     "thermal_k": 109, "density": 2790, "solidus": 516, "scc": "susceptible",
     "jc": {"A": 175, "B": 370, "n": 0.36, "C": 0.018, "m": 1.02},
     "apps": ["engine_blocks", "cylinder_heads", "transmission_cases"],
     "notes": "Workhorse automotive/truck engine alloy"},

    {"id": "N-AL-075", "aa": "413", "name": "413 Die Cast (ADC12)", "uns": "A04130",
     "temper": "F", "condition": "As-Cast",
     "hb": 85, "tensile": 296, "yield": 145, "elong": 2.5,
     "mach": 60, "kc11": 700, "mc": 0.24, "taylor_C": 820, "taylor_n": 0.33,
     "Si": (11.0, 12.0, 13.0), "Fe_max": 1.3,
     "thermal_k": 121, "density": 2660, "solidus": 577, "scc": "resistant",
     "jc": {"A": 170, "B": 380, "n": 0.35, "C": 0.017, "m": 1.00},
     "apps": ["intricate_die_castings", "thin_wall_parts", "electronic_housings"],
     "notes": "High Si = excellent fluidity/castability. Abrasive to tools"},

    {"id": "N-AL-076", "aa": "518", "name": "518 Marine Casting", "uns": "A05180",
     "temper": "F", "condition": "As-Cast",
     "hb": 75, "tensile": 310, "yield": 193, "elong": 8,
     "mach": 70, "kc11": 640, "mc": 0.26, "taylor_C": 870, "taylor_n": 0.36,
     "Mg": (7.5, 8.0, 8.5), "Fe_max": 1.8,
     "thermal_k": 87, "density": 2530, "solidus": 538, "scc": "resistant",
     "jc": {"A": 200, "B": 410, "n": 0.36, "C": 0.017, "m": 1.02},
     "apps": ["marine_hardware", "architectural_castings", "food_equipment"],
     "notes": "High Mg = excellent corrosion resistance. No heat treatment"},

    {"id": "N-AL-077", "aa": "535", "name": "535 (Almag 35) Sand Cast", "uns": "A05350",
     "temper": "F", "condition": "As-Cast",
     "hb": 60, "tensile": 275, "yield": 124, "elong": 13,
     "mach": 65, "kc11": 580, "mc": 0.27, "taylor_C": 920, "taylor_n": 0.37,
     "Mg": (6.5, 7.0, 7.5), "Mn": (0.10, 0.15, 0.25),
     "thermal_k": 100, "density": 2540, "solidus": 549, "scc": "resistant",
     "jc": {"A": 140, "B": 360, "n": 0.42, "C": 0.022, "m": 1.10},
     "apps": ["dairy_equipment", "pressure_vessels", "marine"],
     "notes": "Excellent corrosion resistance. Anodizes well"},

    {"id": "N-AL-078", "aa": "A201", "name": "A201-T7 High Strength Cast", "uns": "A02010",
     "temper": "T7", "condition": "Solution + Over-age",
     "hb": 115, "tensile": 414, "yield": 345, "elong": 5,
     "mach": 90, "kc11": 720, "mc": 0.25, "taylor_C": 800, "taylor_n": 0.34,
     "Cu": (4.0, 4.6, 5.2), "Mg": (0.15, 0.35, 0.55), "Ag": (0.40, 0.7, 1.0), "Ti": (0.15, 0.25, 0.35),
     "thermal_k": 121, "density": 2800, "solidus": 521, "scc": "resistant",
     "jc": {"A": 300, "B": 440, "n": 0.30, "C": 0.014, "m": 0.92},
     "apps": ["aerospace_castings", "missile_components", "high_strength_structural"],
     "notes": "HIGHEST strength casting alloy. Silver addition. Premium aerospace"},

    {"id": "N-AL-079", "aa": "390", "name": "390 Hypereutectic", "uns": "A03900",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 120, "tensile": 280, "yield": 241, "elong": 1,
     "mach": 40, "kc11": 800, "mc": 0.23, "taylor_C": 700, "taylor_n": 0.30,
     "Si": (16.0, 17.0, 18.0), "Cu": (4.0, 4.5, 5.0), "Mg": (0.45, 0.55, 0.65),
     "thermal_k": 134, "density": 2730, "solidus": 507, "scc": "resistant",
     "jc": {"A": 220, "B": 420, "n": 0.32, "C": 0.014, "m": 0.95},
     "apps": ["engine_blocks_linerless", "compressor_pistons", "brake_components"],
     "notes": "VERY ABRASIVE to tools (high Si). Excellent wear resistance. PCD required"},

    {"id": "N-AL-080", "aa": "A413", "name": "A413 Premium Die Cast", "uns": "A14130",
     "temper": "F", "condition": "As-Cast",
     "hb": 80, "tensile": 296, "yield": 131, "elong": 3.5,
     "mach": 65, "kc11": 680, "mc": 0.25, "taylor_C": 840, "taylor_n": 0.34,
     "Si": (11.0, 12.0, 13.0), "Fe_max": 0.60,  # Lower Fe than 413
     "thermal_k": 121, "density": 2660, "solidus": 577, "scc": "resistant",
     "jc": {"A": 155, "B": 365, "n": 0.37, "C": 0.018, "m": 1.02},
     "apps": ["thin_wall_castings", "electronic_housings", "pressure_tight_parts"],
     "notes": "Premium 413 with controlled Fe. Better ductility"},
]

# Export all categories
ALL_ALUMINUM = {
    "1xxx": ALUMINUM_1XXX,
    "2xxx": ALUMINUM_2XXX,
    "cast": ALUMINUM_CAST,
}
