#!/usr/bin/env python3
"""
PRISM Aluminum Tempers Generator v1.0
=====================================
Generates aluminum alloys at ALL realistic temper conditions.

CRITICAL MANUFACTURING INTELLIGENCE:
- O temper: Annealed (softest, gummy, poor chip control)
- H tempers: Strain hardened (H12→H18 increasing hardness)
- T tempers: Heat treated (T3, T4, T5, T6, T7, T8)

The same alloy at different tempers has DRAMATICALLY different machining:
- 7075-O: Tensile 228 MPa, gummy chips, poor finish
- 7075-T6: Tensile 572 MPa, excellent chips, best finish
- 6061-O: Tensile 124 MPa, built-up edge problems
- 6061-T6: Tensile 310 MPa, ideal machinability

Author: PRISM Manufacturing Intelligence
Version: 1.0
Date: 2026-01-25
"""

import json
from datetime import datetime

# =============================================================================
# TEMPER DESIGNATION SYSTEM
# =============================================================================

# H Tempers (Strain Hardened) - for non-heat-treatable alloys (1xxx, 3xxx, 5xxx)
H_TEMPERS = {
    "H12": {"strain": 0.25, "tensile_mult": 1.10, "yield_mult": 1.20, "elong_mult": 0.85, "desc": "Strain hardened 1/4 hard"},
    "H14": {"strain": 0.50, "tensile_mult": 1.20, "yield_mult": 1.45, "elong_mult": 0.70, "desc": "Strain hardened 1/2 hard"},
    "H16": {"strain": 0.75, "tensile_mult": 1.30, "yield_mult": 1.70, "elong_mult": 0.55, "desc": "Strain hardened 3/4 hard"},
    "H18": {"strain": 1.00, "tensile_mult": 1.40, "yield_mult": 2.00, "elong_mult": 0.40, "desc": "Strain hardened full hard"},
    "H22": {"strain": 0.25, "tensile_mult": 1.08, "yield_mult": 1.15, "elong_mult": 0.90, "desc": "Strain hardened + partially annealed 1/4"},
    "H24": {"strain": 0.50, "tensile_mult": 1.15, "yield_mult": 1.35, "elong_mult": 0.75, "desc": "Strain hardened + partially annealed 1/2"},
    "H26": {"strain": 0.75, "tensile_mult": 1.25, "yield_mult": 1.55, "elong_mult": 0.60, "desc": "Strain hardened + partially annealed 3/4"},
    "H32": {"strain": 0.25, "tensile_mult": 1.05, "yield_mult": 1.10, "elong_mult": 0.92, "desc": "Strain hardened + stabilized 1/4"},
    "H34": {"strain": 0.50, "tensile_mult": 1.12, "yield_mult": 1.30, "elong_mult": 0.78, "desc": "Strain hardened + stabilized 1/2"},
    "H36": {"strain": 0.75, "tensile_mult": 1.22, "yield_mult": 1.50, "elong_mult": 0.62, "desc": "Strain hardened + stabilized 3/4"},
    "H38": {"strain": 1.00, "tensile_mult": 1.35, "yield_mult": 1.85, "elong_mult": 0.45, "desc": "Strain hardened + stabilized full"},
}

# T Tempers (Heat Treated) - for heat-treatable alloys (2xxx, 6xxx, 7xxx)
T_TEMPERS = {
    "T3": {"tensile_mult": 1.65, "yield_mult": 1.90, "elong_mult": 0.65, "desc": "Solution treated + cold worked"},
    "T351": {"tensile_mult": 1.68, "yield_mult": 1.95, "elong_mult": 0.62, "desc": "T3 + stress relieved by stretching"},
    "T4": {"tensile_mult": 1.55, "yield_mult": 1.70, "elong_mult": 0.75, "desc": "Solution treated + naturally aged"},
    "T451": {"tensile_mult": 1.58, "yield_mult": 1.75, "elong_mult": 0.72, "desc": "T4 + stress relieved by stretching"},
    "T5": {"tensile_mult": 1.45, "yield_mult": 1.55, "elong_mult": 0.80, "desc": "Cooled from hot working + artificially aged"},
    "T6": {"tensile_mult": 1.85, "yield_mult": 2.20, "elong_mult": 0.55, "desc": "Solution treated + artificially aged"},
    "T651": {"tensile_mult": 1.88, "yield_mult": 2.25, "elong_mult": 0.52, "desc": "T6 + stress relieved by stretching"},
    "T6511": {"tensile_mult": 1.90, "yield_mult": 2.28, "elong_mult": 0.50, "desc": "T651 + minor straightening"},
    "T7": {"tensile_mult": 1.70, "yield_mult": 1.95, "elong_mult": 0.65, "desc": "Solution treated + overaged/stabilized"},
    "T73": {"tensile_mult": 1.60, "yield_mult": 1.80, "elong_mult": 0.70, "desc": "Solution treated + overaged for SCC resistance"},
    "T7351": {"tensile_mult": 1.62, "yield_mult": 1.82, "elong_mult": 0.68, "desc": "T73 + stress relieved"},
    "T76": {"tensile_mult": 1.75, "yield_mult": 2.05, "elong_mult": 0.60, "desc": "Solution treated + overaged for exfoliation resistance"},
    "T7651": {"tensile_mult": 1.78, "yield_mult": 2.08, "elong_mult": 0.58, "desc": "T76 + stress relieved"},
    "T8": {"tensile_mult": 1.80, "yield_mult": 2.15, "elong_mult": 0.50, "desc": "Solution treated + cold worked + artificially aged"},
    "T851": {"tensile_mult": 1.82, "yield_mult": 2.18, "elong_mult": 0.48, "desc": "T8 + stress relieved"},
    "T87": {"tensile_mult": 1.85, "yield_mult": 2.22, "elong_mult": 0.45, "desc": "Solution treated + cold worked + artificially aged (higher)"},
}

# =============================================================================
# ALUMINUM ALLOY DEFINITIONS
# =============================================================================

# 1xxx Series - Pure Aluminum (non-heat-treatable)
AL_1XXX = {
    "1050": {
        "name": "AA 1050", "uns": "A91050", "din": "3.0255", "en": "EN AW-1050A",
        "al_min": 99.5, "composition": {"Al": 99.5, "Fe": 0.40, "Si": 0.25},
        "O_tensile": 76, "O_yield": 28, "O_elongation": 43,
        "base_kc11": 700, "base_mc": 0.25, "base_speed": 600,
        "base_taylor_C": 800, "base_taylor_n": 0.35,
        "density": 2705, "thermal_cond": 231, "elastic_mod": 69000,
        "tempers": ["O", "H12", "H14", "H16", "H18", "H24"],
        "applications": ["electrical", "chemical_equipment", "reflectors"]
    },
    "1060": {
        "name": "AA 1060", "uns": "A91060", "din": "3.0257", "en": "EN AW-1060",
        "al_min": 99.6, "composition": {"Al": 99.6, "Fe": 0.35, "Si": 0.25},
        "O_tensile": 69, "O_yield": 28, "O_elongation": 45,
        "base_kc11": 680, "base_mc": 0.25, "base_speed": 650,
        "base_taylor_C": 850, "base_taylor_n": 0.36,
        "density": 2705, "thermal_cond": 234, "elastic_mod": 69000,
        "tempers": ["O", "H12", "H14", "H16", "H18"],
        "applications": ["electrical", "bus_bars", "heat_exchangers"]
    },
    "1100": {
        "name": "AA 1100", "uns": "A91100", "din": "3.0205", "en": "EN AW-1100",
        "al_min": 99.0, "composition": {"Al": 99.0, "Cu": 0.12, "Fe": 0.95, "Si": 0.95},
        "O_tensile": 90, "O_yield": 34, "O_elongation": 40,
        "base_kc11": 720, "base_mc": 0.25, "base_speed": 550,
        "base_taylor_C": 750, "base_taylor_n": 0.34,
        "density": 2710, "thermal_cond": 222, "elastic_mod": 69000,
        "tempers": ["O", "H12", "H14", "H16", "H18", "H22", "H24", "H26"],
        "applications": ["sheet_metal", "spun_parts", "cooking_utensils"]
    },
}

# 2xxx Series - Al-Cu (heat-treatable, aerospace)
AL_2XXX = {
    "2011": {
        "name": "AA 2011", "uns": "A92011", "din": "3.1655", "en": "EN AW-2011",
        "composition": {"Al": 93.7, "Cu": 5.5, "Pb": 0.4, "Bi": 0.4},
        "O_tensile": 228, "O_yield": 96, "O_elongation": 18,
        "base_kc11": 850, "base_mc": 0.23, "base_speed": 350,
        "base_taylor_C": 550, "base_taylor_n": 0.28,
        "density": 2830, "thermal_cond": 151, "elastic_mod": 70000,
        "tempers": ["T3", "T6", "T8"],
        "applications": ["screw_machine_products", "fittings", "fasteners"],
        "notes": "Free machining alloy"
    },
    "2014": {
        "name": "AA 2014", "uns": "A92014", "din": "3.1255", "en": "EN AW-2014",
        "composition": {"Al": 93.5, "Cu": 4.4, "Si": 0.8, "Mn": 0.8, "Mg": 0.5},
        "O_tensile": 186, "O_yield": 97, "O_elongation": 18,
        "base_kc11": 880, "base_mc": 0.24, "base_speed": 320,
        "base_taylor_C": 500, "base_taylor_n": 0.27,
        "density": 2800, "thermal_cond": 154, "elastic_mod": 73000,
        "tempers": ["O", "T4", "T451", "T6", "T651"],
        "applications": ["aircraft_structures", "truck_frames", "forgings"]
    },
    "2017": {
        "name": "AA 2017", "uns": "A92017", "din": "3.1325", "en": "EN AW-2017A",
        "composition": {"Al": 93.5, "Cu": 4.0, "Mn": 0.7, "Mg": 0.6, "Si": 0.5},
        "O_tensile": 179, "O_yield": 69, "O_elongation": 22,
        "base_kc11": 860, "base_mc": 0.24, "base_speed": 340,
        "base_taylor_C": 520, "base_taylor_n": 0.28,
        "density": 2790, "thermal_cond": 134, "elastic_mod": 72500,
        "tempers": ["O", "T4", "T451"],
        "applications": ["rivets", "screw_machine_products", "fittings"]
    },
    "2024": {
        "name": "AA 2024", "uns": "A92024", "din": "3.1355", "en": "EN AW-2024",
        "composition": {"Al": 93.5, "Cu": 4.4, "Mg": 1.5, "Mn": 0.6},
        "O_tensile": 186, "O_yield": 76, "O_elongation": 20,
        "base_kc11": 900, "base_mc": 0.23, "base_speed": 300,
        "base_taylor_C": 480, "base_taylor_n": 0.26,
        "density": 2780, "thermal_cond": 121, "elastic_mod": 73000,
        "tempers": ["O", "T3", "T351", "T4", "T6", "T651", "T8", "T851", "T87"],
        "applications": ["aircraft_structures", "wing_skins", "fuselage"],
        "notes": "Primary aerospace alloy"
    },
    "2219": {
        "name": "AA 2219", "uns": "A92219", "din": "", "en": "EN AW-2219",
        "composition": {"Al": 93.0, "Cu": 6.3, "Mn": 0.3, "V": 0.1, "Zr": 0.18},
        "O_tensile": 172, "O_yield": 76, "O_elongation": 18,
        "base_kc11": 920, "base_mc": 0.23, "base_speed": 280,
        "base_taylor_C": 450, "base_taylor_n": 0.25,
        "density": 2840, "thermal_cond": 120, "elastic_mod": 73000,
        "tempers": ["O", "T6", "T651", "T87", "T851"],
        "applications": ["cryogenic_tanks", "space_structures", "weldments"],
        "notes": "Weldable aerospace alloy"
    },
}

# 3xxx Series - Al-Mn (non-heat-treatable)
AL_3XXX = {
    "3003": {
        "name": "AA 3003", "uns": "A93003", "din": "3.0517", "en": "EN AW-3003",
        "composition": {"Al": 98.6, "Mn": 1.2, "Cu": 0.12},
        "O_tensile": 110, "O_yield": 42, "O_elongation": 35,
        "base_kc11": 750, "base_mc": 0.25, "base_speed": 500,
        "base_taylor_C": 700, "base_taylor_n": 0.32,
        "density": 2730, "thermal_cond": 193, "elastic_mod": 69000,
        "tempers": ["O", "H12", "H14", "H16", "H18", "H22", "H24", "H26"],
        "applications": ["cooking_utensils", "pressure_vessels", "fuel_tanks"]
    },
    "3004": {
        "name": "AA 3004", "uns": "A93004", "din": "3.0526", "en": "EN AW-3004",
        "composition": {"Al": 97.8, "Mn": 1.2, "Mg": 1.0},
        "O_tensile": 180, "O_yield": 69, "O_elongation": 25,
        "base_kc11": 800, "base_mc": 0.24, "base_speed": 450,
        "base_taylor_C": 650, "base_taylor_n": 0.30,
        "density": 2720, "thermal_cond": 163, "elastic_mod": 69000,
        "tempers": ["O", "H32", "H34", "H36", "H38"],
        "applications": ["beverage_cans", "roofing", "storage_tanks"]
    },
    "3105": {
        "name": "AA 3105", "uns": "A93105", "din": "3.0505", "en": "EN AW-3105",
        "composition": {"Al": 98.4, "Mn": 0.55, "Mg": 0.5, "Cu": 0.3},
        "O_tensile": 115, "O_yield": 55, "O_elongation": 28,
        "base_kc11": 760, "base_mc": 0.25, "base_speed": 480,
        "base_taylor_C": 680, "base_taylor_n": 0.31,
        "density": 2720, "thermal_cond": 173, "elastic_mod": 69000,
        "tempers": ["O", "H12", "H14", "H16", "H18", "H24", "H26"],
        "applications": ["residential_siding", "mobile_homes", "gutters"]
    },
}

# 5xxx Series - Al-Mg (non-heat-treatable, marine)
AL_5XXX = {
    "5052": {
        "name": "AA 5052", "uns": "A95052", "din": "3.3523", "en": "EN AW-5052",
        "composition": {"Al": 97.2, "Mg": 2.5, "Cr": 0.25},
        "O_tensile": 193, "O_yield": 89, "O_elongation": 27,
        "base_kc11": 820, "base_mc": 0.24, "base_speed": 400,
        "base_taylor_C": 600, "base_taylor_n": 0.29,
        "density": 2680, "thermal_cond": 138, "elastic_mod": 70000,
        "tempers": ["O", "H32", "H34", "H36", "H38"],
        "applications": ["marine", "aircraft_fuel_tanks", "appliances"]
    },
    "5083": {
        "name": "AA 5083", "uns": "A95083", "din": "3.3547", "en": "EN AW-5083",
        "composition": {"Al": 94.8, "Mg": 4.4, "Mn": 0.7, "Cr": 0.15},
        "O_tensile": 290, "O_yield": 145, "O_elongation": 22,
        "base_kc11": 880, "base_mc": 0.23, "base_speed": 350,
        "base_taylor_C": 550, "base_taylor_n": 0.27,
        "density": 2660, "thermal_cond": 117, "elastic_mod": 71000,
        "tempers": ["O", "H32", "H34", "H116", "H321"],
        "applications": ["shipbuilding", "cryogenic", "pressure_vessels"],
        "notes": "Marine grade"
    },
    "5086": {
        "name": "AA 5086", "uns": "A95086", "din": "3.3545", "en": "EN AW-5086",
        "composition": {"Al": 95.4, "Mg": 4.0, "Mn": 0.45, "Cr": 0.15},
        "O_tensile": 262, "O_yield": 117, "O_elongation": 24,
        "base_kc11": 860, "base_mc": 0.24, "base_speed": 370,
        "base_taylor_C": 570, "base_taylor_n": 0.28,
        "density": 2660, "thermal_cond": 125, "elastic_mod": 71000,
        "tempers": ["O", "H32", "H34", "H116"],
        "applications": ["marine", "tanks", "unfired_pressure_vessels"]
    },
    "5754": {
        "name": "AA 5754", "uns": "A95754", "din": "3.3535", "en": "EN AW-5754",
        "composition": {"Al": 96.2, "Mg": 3.1, "Mn": 0.5, "Cr": 0.3},
        "O_tensile": 220, "O_yield": 100, "O_elongation": 26,
        "base_kc11": 840, "base_mc": 0.24, "base_speed": 380,
        "base_taylor_C": 580, "base_taylor_n": 0.28,
        "density": 2670, "thermal_cond": 138, "elastic_mod": 70000,
        "tempers": ["O", "H22", "H24", "H26", "H32", "H34"],
        "applications": ["automotive_body", "welded_structures", "flooring"]
    },
}

# 6xxx Series - Al-Mg-Si (heat-treatable, extrusions)
AL_6XXX = {
    "6005": {
        "name": "AA 6005", "uns": "A96005", "din": "", "en": "EN AW-6005A",
        "composition": {"Al": 98.2, "Mg": 0.5, "Si": 0.7, "Mn": 0.15},
        "O_tensile": 130, "O_yield": 55, "O_elongation": 25,
        "base_kc11": 780, "base_mc": 0.24, "base_speed": 420,
        "base_taylor_C": 620, "base_taylor_n": 0.30,
        "density": 2700, "thermal_cond": 180, "elastic_mod": 69000,
        "tempers": ["O", "T1", "T5", "T6"],
        "applications": ["extrusions", "ladders", "scaffold"]
    },
    "6061": {
        "name": "AA 6061", "uns": "A96061", "din": "3.3211", "en": "EN AW-6061",
        "composition": {"Al": 97.9, "Mg": 1.0, "Si": 0.6, "Cu": 0.28, "Cr": 0.2},
        "O_tensile": 124, "O_yield": 55, "O_elongation": 30,
        "base_kc11": 800, "base_mc": 0.24, "base_speed": 400,
        "base_taylor_C": 600, "base_taylor_n": 0.29,
        "density": 2700, "thermal_cond": 167, "elastic_mod": 69000,
        "tempers": ["O", "T4", "T451", "T6", "T651", "T6511"],
        "applications": ["structural", "marine", "automotive", "general_machining"],
        "notes": "Most versatile aluminum alloy"
    },
    "6063": {
        "name": "AA 6063", "uns": "A96063", "din": "3.3206", "en": "EN AW-6063",
        "composition": {"Al": 98.9, "Mg": 0.7, "Si": 0.4},
        "O_tensile": 90, "O_yield": 48, "O_elongation": 33,
        "base_kc11": 750, "base_mc": 0.25, "base_speed": 450,
        "base_taylor_C": 650, "base_taylor_n": 0.31,
        "density": 2690, "thermal_cond": 201, "elastic_mod": 69000,
        "tempers": ["O", "T1", "T4", "T5", "T6"],
        "applications": ["architectural", "extrusions", "window_frames"],
        "notes": "Architectural alloy"
    },
    "6082": {
        "name": "AA 6082", "uns": "A96082", "din": "3.2315", "en": "EN AW-6082",
        "composition": {"Al": 97.5, "Mg": 0.9, "Si": 1.0, "Mn": 0.5},
        "O_tensile": 130, "O_yield": 60, "O_elongation": 27,
        "base_kc11": 810, "base_mc": 0.24, "base_speed": 390,
        "base_taylor_C": 590, "base_taylor_n": 0.29,
        "density": 2710, "thermal_cond": 172, "elastic_mod": 70000,
        "tempers": ["O", "T4", "T451", "T6", "T651"],
        "applications": ["structural", "bridges", "cranes", "trusses"],
        "notes": "European structural alloy"
    },
}

# 7xxx Series - Al-Zn (heat-treatable, aerospace)
AL_7XXX = {
    "7050": {
        "name": "AA 7050", "uns": "A97050", "din": "", "en": "EN AW-7050",
        "composition": {"Al": 89.0, "Zn": 6.2, "Mg": 2.3, "Cu": 2.3, "Zr": 0.12},
        "O_tensile": 228, "O_yield": 103, "O_elongation": 17,
        "base_kc11": 950, "base_mc": 0.22, "base_speed": 280,
        "base_taylor_C": 450, "base_taylor_n": 0.25,
        "density": 2830, "thermal_cond": 157, "elastic_mod": 72000,
        "tempers": ["O", "T6", "T651", "T7351", "T7451", "T7651", "T76511"],
        "applications": ["aerospace_plate", "wing_structure", "fuselage_bulkheads"],
        "notes": "Superior toughness to 7075"
    },
    "7075": {
        "name": "AA 7075", "uns": "A97075", "din": "3.4365", "en": "EN AW-7075",
        "composition": {"Al": 90.0, "Zn": 5.6, "Mg": 2.5, "Cu": 1.6, "Cr": 0.23},
        "O_tensile": 228, "O_yield": 103, "O_elongation": 17,
        "base_kc11": 980, "base_mc": 0.22, "base_speed": 260,
        "base_taylor_C": 420, "base_taylor_n": 0.24,
        "density": 2810, "thermal_cond": 130, "elastic_mod": 72000,
        "tempers": ["O", "T6", "T651", "T6511", "T73", "T7351", "T76", "T7651"],
        "applications": ["aircraft_structures", "high_stress_parts", "gears"],
        "notes": "Highest strength aluminum"
    },
    "7175": {
        "name": "AA 7175", "uns": "A97175", "din": "", "en": "EN AW-7175",
        "composition": {"Al": 90.0, "Zn": 5.6, "Mg": 2.5, "Cu": 1.6, "Cr": 0.23},
        "O_tensile": 228, "O_yield": 103, "O_elongation": 17,
        "base_kc11": 970, "base_mc": 0.22, "base_speed": 265,
        "base_taylor_C": 430, "base_taylor_n": 0.24,
        "density": 2810, "thermal_cond": 130, "elastic_mod": 72000,
        "tempers": ["O", "T6", "T651", "T7351", "T7651"],
        "applications": ["forgings", "aerospace_fittings"],
        "notes": "Forging version of 7075"
    },
    "7475": {
        "name": "AA 7475", "uns": "A97475", "din": "", "en": "EN AW-7475",
        "composition": {"Al": 90.3, "Zn": 5.7, "Mg": 2.3, "Cu": 1.5, "Cr": 0.22},
        "O_tensile": 220, "O_yield": 97, "O_elongation": 18,
        "base_kc11": 940, "base_mc": 0.22, "base_speed": 285,
        "base_taylor_C": 460, "base_taylor_n": 0.25,
        "density": 2810, "thermal_cond": 138, "elastic_mod": 72000,
        "tempers": ["O", "T6", "T651", "T7351", "T7651"],
        "applications": ["aircraft_wing_skins", "fuselage_skins"],
        "notes": "Improved fracture toughness"
    },
}

# =============================================================================
# PHYSICS ADJUSTMENT FUNCTIONS
# =============================================================================

def get_temper_data(temper):
    """Get temper multipliers"""
    if temper == "O":
        return {"tensile_mult": 1.0, "yield_mult": 1.0, "elong_mult": 1.0, "desc": "Annealed (softest condition)"}
    elif temper in H_TEMPERS:
        return H_TEMPERS[temper]
    elif temper in T_TEMPERS:
        return T_TEMPERS[temper]
    elif temper in ["H116", "H321"]:
        # Special marine tempers
        return {"tensile_mult": 1.15, "yield_mult": 1.35, "elong_mult": 0.80, "desc": "Special marine temper"}
    elif temper == "T1":
        return {"tensile_mult": 1.20, "yield_mult": 1.30, "elong_mult": 0.90, "desc": "Cooled from hot working + naturally aged"}
    else:
        return {"tensile_mult": 1.0, "yield_mult": 1.0, "elong_mult": 1.0, "desc": temper}

def adjust_machining_for_temper(base_kc11, base_speed, base_taylor_C, temper, O_tensile, new_tensile):
    """Adjust machining parameters for aluminum temper"""
    ratio = new_tensile / O_tensile
    
    # Softer = gummier, harder to machine (built-up edge)
    # Harder = better chip control, better finish
    if temper == "O":
        # Annealed - gummy, poor chip control
        kc11 = int(base_kc11 * 0.95)
        speed = int(base_speed * 0.85)  # Slower due to BUE
        taylor_C = int(base_taylor_C * 0.90)
        machinability = "Poor - gummy chips, built-up edge"
    elif temper.startswith("H"):
        # Work hardened - moderate
        kc11 = int(base_kc11 * (1 + 0.08 * (ratio - 1)))
        speed = int(base_speed * (1 + 0.05 * (ratio - 1)))
        taylor_C = int(base_taylor_C * (1 - 0.03 * (ratio - 1)))
        machinability = "Good - improved chip control"
    elif temper.startswith("T"):
        # Heat treated - best machinability
        if "6" in temper or "8" in temper:
            # Peak aged - best
            kc11 = int(base_kc11 * (1 + 0.15 * (ratio - 1)))
            speed = int(base_speed * (1 + 0.12 * (ratio - 1)))
            taylor_C = int(base_taylor_C * (1 - 0.05 * (ratio - 1)))
            machinability = "Excellent - ideal chip formation"
        elif "73" in temper or "76" in temper:
            # Overaged - slightly softer
            kc11 = int(base_kc11 * (1 + 0.12 * (ratio - 1)))
            speed = int(base_speed * (1 + 0.10 * (ratio - 1)))
            taylor_C = int(base_taylor_C * (1 - 0.04 * (ratio - 1)))
            machinability = "Very good - stress corrosion resistant"
        else:
            # Other T tempers
            kc11 = int(base_kc11 * (1 + 0.10 * (ratio - 1)))
            speed = int(base_speed * (1 + 0.08 * (ratio - 1)))
            taylor_C = int(base_taylor_C * (1 - 0.04 * (ratio - 1)))
            machinability = "Good - stable cutting"
    else:
        kc11 = base_kc11
        speed = base_speed
        taylor_C = base_taylor_C
        machinability = "Standard"
    
    return kc11, speed, taylor_C, machinability

def get_tooling_for_aluminum(temper, alloy_series):
    """Get appropriate tooling for aluminum"""
    base_tooling = {
        "primary": "Uncoated Carbide or PCD",
        "insert_grade": "K10 Uncoated or PCD",
        "coating": ["None", "DLC (optional)"],
        "geometry": "Sharp positive rake 12-20°, polished rake face",
        "coolant": "Flood coolant or MQL",
        "notes": "High helix cutters, 2-3 flute for chip evacuation"
    }
    
    if temper == "O":
        base_tooling["notes"] = "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
    elif alloy_series == "2xxx":
        base_tooling["notes"] = "Aerospace 2xxx - use PCD for best finish on T6/T8"
    elif alloy_series == "7xxx":
        base_tooling["notes"] = "High-strength 7xxx - PCD recommended for T6/T651"
    
    return base_tooling

# =============================================================================
# MATERIAL GENERATION
# =============================================================================

def generate_aluminum_materials(alloy_dict, series_name, start_id):
    """Generate aluminum materials for all tempers"""
    materials = {}
    mat_id = start_id
    
    for alloy_key, alloy in alloy_dict.items():
        for temper in alloy["tempers"]:
            mat_id_str = f"N-AL-{mat_id:03d}"
            temper_data = get_temper_data(temper)
            
            # Calculate properties
            tensile = int(alloy["O_tensile"] * temper_data["tensile_mult"])
            yield_str = int(alloy["O_yield"] * temper_data["yield_mult"])
            elongation = int(alloy["O_elongation"] * temper_data["elong_mult"])
            
            # Calculate machining parameters
            kc11, speed, taylor_C, machinability = adjust_machining_for_temper(
                alloy["base_kc11"], alloy["base_speed"], alloy["base_taylor_C"],
                temper, alloy["O_tensile"], tensile
            )
            
            # Build material
            materials[mat_id_str] = {
                "id": mat_id_str,
                "name": f"{alloy['name']}-{temper}",
                "designation": {
                    "aa": alloy_key,
                    "uns": alloy["uns"],
                    "din": alloy.get("din", ""),
                    "en": alloy.get("en", "")
                },
                "iso_group": "N",
                "material_class": f"Aluminum - {series_name}",
                "condition": temper,
                "condition_description": temper_data["desc"],
                "composition": alloy["composition"],
                "physical": {
                    "density": alloy["density"],
                    "thermal_conductivity": alloy["thermal_cond"],
                    "elastic_modulus": alloy["elastic_mod"],
                    "poissons_ratio": 0.33
                },
                "mechanical": {
                    "tensile_strength": {"typical": tensile},
                    "yield_strength": {"typical": yield_str},
                    "elongation": {"typical": elongation}
                },
                "kienzle": {
                    "kc1_1": kc11,
                    "mc": alloy["base_mc"]
                },
                "taylor": {
                    "C": taylor_C,
                    "n": alloy["base_taylor_n"]
                },
                "recommended_cutting": {
                    "turning": {
                        "carbide": {
                            "speed": {
                                "min": int(speed * 0.75),
                                "opt": speed,
                                "max": int(speed * 1.40)
                            }
                        },
                        "pcd": {
                            "speed": {
                                "min": int(speed * 1.5),
                                "opt": int(speed * 2.0),
                                "max": int(speed * 3.0)
                            }
                        }
                    }
                },
                "machinability": machinability,
                "tooling": get_tooling_for_aluminum(temper, series_name),
                "applications": alloy["applications"]
            }
            
            if "notes" in alloy:
                materials[mat_id_str]["notes"] = alloy["notes"]
            
            mat_id += 1
    
    return materials, mat_id

# =============================================================================
# MAIN
# =============================================================================

def main():
    print("PRISM Aluminum Tempers Generator v1.0")
    print("=" * 60)
    
    all_materials = {}
    next_id = 301  # Start after existing aluminum
    
    # Generate 1xxx series
    al_1xxx, next_id = generate_aluminum_materials(AL_1XXX, "1xxx Pure", next_id)
    all_materials.update(al_1xxx)
    print(f"Generated {len(al_1xxx)} 1xxx series materials")
    
    # Generate 2xxx series
    al_2xxx, next_id = generate_aluminum_materials(AL_2XXX, "2xxx Al-Cu", next_id)
    all_materials.update(al_2xxx)
    print(f"Generated {len(al_2xxx)} 2xxx series materials")
    
    # Generate 3xxx series
    al_3xxx, next_id = generate_aluminum_materials(AL_3XXX, "3xxx Al-Mn", next_id)
    all_materials.update(al_3xxx)
    print(f"Generated {len(al_3xxx)} 3xxx series materials")
    
    # Generate 5xxx series
    al_5xxx, next_id = generate_aluminum_materials(AL_5XXX, "5xxx Al-Mg", next_id)
    all_materials.update(al_5xxx)
    print(f"Generated {len(al_5xxx)} 5xxx series materials")
    
    # Generate 6xxx series
    al_6xxx, next_id = generate_aluminum_materials(AL_6XXX, "6xxx Al-Mg-Si", next_id)
    all_materials.update(al_6xxx)
    print(f"Generated {len(al_6xxx)} 6xxx series materials")
    
    # Generate 7xxx series
    al_7xxx, next_id = generate_aluminum_materials(AL_7XXX, "7xxx Al-Zn", next_id)
    all_materials.update(al_7xxx)
    print(f"Generated {len(al_7xxx)} 7xxx series materials")
    
    print(f"\nTOTAL: {len(all_materials)} new aluminum materials")
    
    # Generate JavaScript output
    output = f'''/**
 * PRISM MATERIALS DATABASE - Aluminum Temper Conditions
 * File: aluminum_temper_conditions.js
 * 
 * COMPREHENSIVE COVERAGE:
 * - 1xxx (Pure Al): 1050, 1060, 1100 - O, H tempers
 * - 2xxx (Al-Cu): 2011, 2014, 2017, 2024, 2219 - O, T tempers
 * - 3xxx (Al-Mn): 3003, 3004, 3105 - O, H tempers
 * - 5xxx (Al-Mg): 5052, 5083, 5086, 5754 - O, H tempers
 * - 6xxx (Al-Mg-Si): 6005, 6061, 6063, 6082 - O, T tempers
 * - 7xxx (Al-Zn): 7050, 7075, 7175, 7475 - O, T tempers
 * 
 * CRITICAL: Same alloy at different tempers = different machining!
 * - 7075-O: Tensile 228 MPa, gummy, BUE issues
 * - 7075-T6: Tensile 572 MPa, excellent chip control
 * 
 * Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 */

const ALUMINUM_TEMPER_CONDITIONS = {{
  metadata: {{
    file: "aluminum_temper_conditions.js",
    category: "N_NONFERROUS",
    materialCount: {len(all_materials)},
    coverage: {{
      series_1xxx: {len(al_1xxx)},
      series_2xxx: {len(al_2xxx)},
      series_3xxx: {len(al_3xxx)},
      series_5xxx: {len(al_5xxx)},
      series_6xxx: {len(al_6xxx)},
      series_7xxx: {len(al_7xxx)}
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
  module.exports = ALUMINUM_TEMPER_CONDITIONS;
}
'''
    
    output_path = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials\N_NONFERROUS\aluminum_temper_conditions.js"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"\nOutput: {output_path}")
    print(f"File size: {len(output) / 1024:.1f} KB")

if __name__ == "__main__":
    main()
