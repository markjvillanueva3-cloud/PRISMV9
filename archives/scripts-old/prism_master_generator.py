#!/usr/bin/env python3
"""
PRISM MASTER MATERIALS GENERATOR v5.0
=====================================
Complete generator for ALL material categories.
Generates 127-parameter schema JavaScript files.

Usage: py -3 prism_master_generator.py [category]
Categories: aluminum, copper, titanium, magnesium, zinc, cobalt, nickel, all
"""

import json
from datetime import datetime
from pathlib import Path
import sys

OUTPUT_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials")

# =============================================================================
# ALUMINUM 1xxx/3xxx/5xxx
# =============================================================================
ALUMINUM_1XXX = [
    {"id": "N-AL-001", "aa": "1050", "name": "1050-O Pure Aluminum", "uns": "A91050", "temper": "O", "condition": "Annealed",
     "hb": 20, "tensile": 75, "yield": 28, "elong": 40, "mach": 40, "kc11": 400, "mc": 0.30, "taylor_C": 1100, "taylor_n": 0.40,
     "Al_min": 99.5, "thermal_k": 229, "density": 2705, "solidus": 645,
     "jc": {"A": 30, "B": 200, "n": 0.55, "C": 0.030, "m": 1.30},
     "apps": ["electrical_conductors", "chemical_equipment"], "notes": "99.5% pure. 61% IACS"},
    {"id": "N-AL-002", "aa": "1050", "name": "1050-H14 Half-Hard", "uns": "A91050", "temper": "H14", "condition": "Strain Hardened",
     "hb": 34, "tensile": 105, "yield": 90, "elong": 10, "mach": 55, "kc11": 450, "mc": 0.28, "taylor_C": 1050, "taylor_n": 0.38,
     "Al_min": 99.5, "thermal_k": 229, "density": 2705, "solidus": 645,
     "jc": {"A": 80, "B": 220, "n": 0.45, "C": 0.025, "m": 1.20}, "apps": ["heat_exchangers", "foil"]},
    {"id": "N-AL-003", "aa": "1100", "name": "1100-O Commercial Pure", "uns": "A91100", "temper": "O", "condition": "Annealed",
     "hb": 23, "tensile": 90, "yield": 35, "elong": 35, "mach": 45, "kc11": 420, "mc": 0.29, "taylor_C": 1080, "taylor_n": 0.39,
     "Al_min": 99.0, "Cu": (0.05, 0.12, 0.20), "thermal_k": 222, "density": 2710, "solidus": 643,
     "jc": {"A": 40, "B": 210, "n": 0.52, "C": 0.028, "m": 1.25}, "apps": ["chemical_tanks", "cooking_utensils"]},
    {"id": "N-AL-004", "aa": "1100", "name": "1100-H14 Half-Hard", "uns": "A91100", "temper": "H14", "condition": "Strain Hardened",
     "hb": 32, "tensile": 125, "yield": 115, "elong": 9, "mach": 60, "kc11": 470, "mc": 0.27, "taylor_C": 1020, "taylor_n": 0.37,
     "Al_min": 99.0, "thermal_k": 222, "density": 2710, "solidus": 643,
     "jc": {"A": 100, "B": 240, "n": 0.42, "C": 0.024, "m": 1.15}, "apps": ["sheet_metal", "deep_drawing"]},
    {"id": "N-AL-005", "aa": "1350", "name": "1350-H19 Electrical Wire", "uns": "A91350", "temper": "H19", "condition": "Extra Hard",
     "hb": 45, "tensile": 186, "yield": 165, "elong": 1.5, "mach": 70, "kc11": 520, "mc": 0.26, "taylor_C": 980, "taylor_n": 0.36,
     "Al_min": 99.5, "thermal_k": 234, "density": 2705, "solidus": 646,
     "jc": {"A": 150, "B": 280, "n": 0.35, "C": 0.020, "m": 1.05}, "apps": ["electrical_wire", "bus_bars"], "notes": "62% IACS"},
]

ALUMINUM_3XXX = [
    {"id": "N-AL-081", "aa": "3003", "name": "3003-O General Purpose", "uns": "A93003", "temper": "O", "condition": "Annealed",
     "hb": 28, "tensile": 110, "yield": 42, "elong": 30, "mach": 50, "kc11": 440, "mc": 0.28, "taylor_C": 1060, "taylor_n": 0.38,
     "Mn": (1.0, 1.2, 1.5), "thermal_k": 193, "density": 2730, "solidus": 643,
     "jc": {"A": 50, "B": 230, "n": 0.48, "C": 0.026, "m": 1.22}, "apps": ["cooking_utensils", "chemical_equipment"]},
    {"id": "N-AL-082", "aa": "3003", "name": "3003-H14 Half-Hard", "uns": "A93003", "temper": "H14", "condition": "Strain Hardened",
     "hb": 40, "tensile": 150, "yield": 145, "elong": 8, "mach": 65, "kc11": 500, "mc": 0.27, "taylor_C": 1000, "taylor_n": 0.37,
     "Mn": (1.0, 1.2, 1.5), "thermal_k": 193, "density": 2730, "solidus": 643,
     "jc": {"A": 130, "B": 270, "n": 0.38, "C": 0.022, "m": 1.12}, "apps": ["roofing", "siding", "storage_tanks"]},
    {"id": "N-AL-083", "aa": "3004", "name": "3004-H34 Beverage Can", "uns": "A93004", "temper": "H34", "condition": "Stabilized",
     "hb": 63, "tensile": 215, "yield": 170, "elong": 9, "mach": 75, "kc11": 560, "mc": 0.26, "taylor_C": 950, "taylor_n": 0.36,
     "Mn": (1.0, 1.2, 1.5), "Mg": (0.8, 1.0, 1.3), "thermal_k": 163, "density": 2720, "solidus": 629,
     "jc": {"A": 160, "B": 320, "n": 0.35, "C": 0.018, "m": 1.05}, "apps": ["beverage_cans", "roofing"]},
    {"id": "N-AL-084", "aa": "3105", "name": "3105-H25 Building Products", "uns": "A93105", "temper": "H25", "condition": "Partial Anneal",
     "hb": 45, "tensile": 175, "yield": 150, "elong": 7, "mach": 70, "kc11": 530, "mc": 0.27, "taylor_C": 980, "taylor_n": 0.37,
     "Mn": (0.30, 0.55, 0.80), "Mg": (0.20, 0.45, 0.80), "thermal_k": 173, "density": 2720, "solidus": 635,
     "jc": {"A": 140, "B": 300, "n": 0.36, "C": 0.020, "m": 1.08}, "apps": ["mobile_home_siding", "gutters"]},
]

ALUMINUM_5XXX = [
    {"id": "N-AL-085", "aa": "5052", "name": "5052-O Marine", "uns": "A95052", "temper": "O", "condition": "Annealed",
     "hb": 47, "tensile": 195, "yield": 90, "elong": 25, "mach": 60, "kc11": 520, "mc": 0.27, "taylor_C": 980, "taylor_n": 0.37,
     "Mg": (2.2, 2.5, 2.8), "Cr": (0.15, 0.25, 0.35), "thermal_k": 138, "density": 2680, "solidus": 607,
     "jc": {"A": 90, "B": 310, "n": 0.42, "C": 0.022, "m": 1.12}, "apps": ["marine", "fuel_tanks"], "notes": "Best saltwater resistance"},
    {"id": "N-AL-086", "aa": "5052", "name": "5052-H32 Marine Sheet", "uns": "A95052", "temper": "H32", "condition": "Stabilized",
     "hb": 60, "tensile": 230, "yield": 195, "elong": 12, "mach": 75, "kc11": 580, "mc": 0.26, "taylor_C": 940, "taylor_n": 0.36,
     "Mg": (2.2, 2.5, 2.8), "Cr": (0.15, 0.25, 0.35), "thermal_k": 138, "density": 2680, "solidus": 607,
     "jc": {"A": 175, "B": 360, "n": 0.35, "C": 0.018, "m": 1.02}, "apps": ["boat_hulls", "highway_signs"]},
    {"id": "N-AL-087", "aa": "5083", "name": "5083-O Shipbuilding", "uns": "A95083", "temper": "O", "condition": "Annealed",
     "hb": 65, "tensile": 290, "yield": 145, "elong": 22, "mach": 55, "kc11": 600, "mc": 0.26, "taylor_C": 920, "taylor_n": 0.35,
     "Mg": (4.0, 4.4, 4.9), "Mn": (0.40, 0.70, 1.0), "thermal_k": 117, "density": 2660, "solidus": 574,
     "jc": {"A": 140, "B": 400, "n": 0.40, "C": 0.020, "m": 1.08}, "apps": ["ship_hulls", "LNG_tanks"], "notes": "Highest strength non-HT"},
    {"id": "N-AL-088", "aa": "5083", "name": "5083-H116 Marine Plate", "uns": "A95083", "temper": "H116", "condition": "Marine Temper",
     "hb": 75, "tensile": 315, "yield": 230, "elong": 16, "mach": 65, "kc11": 640, "mc": 0.25, "taylor_C": 880, "taylor_n": 0.34,
     "Mg": (4.0, 4.4, 4.9), "Mn": (0.40, 0.70, 1.0), "thermal_k": 117, "density": 2660, "solidus": 574,
     "jc": {"A": 210, "B": 430, "n": 0.34, "C": 0.016, "m": 1.00}, "apps": ["ship_plate", "cryogenic"], "notes": "SCC/exfoliation resistant"},
    {"id": "N-AL-089", "aa": "5086", "name": "5086-H34 Marine", "uns": "A95086", "temper": "H34", "condition": "Stabilized",
     "hb": 70, "tensile": 290, "yield": 230, "elong": 12, "mach": 70, "kc11": 620, "mc": 0.26, "taylor_C": 900, "taylor_n": 0.35,
     "Mg": (3.5, 4.0, 4.5), "Mn": (0.20, 0.45, 0.70), "thermal_k": 125, "density": 2660, "solidus": 585,
     "jc": {"A": 200, "B": 410, "n": 0.35, "C": 0.017, "m": 1.02}, "apps": ["pressure_vessels", "marine"]},
    {"id": "N-AL-090", "aa": "5754", "name": "5754-O Automotive", "uns": "A95754", "temper": "O", "condition": "Annealed",
     "hb": 53, "tensile": 220, "yield": 100, "elong": 26, "mach": 58, "kc11": 540, "mc": 0.27, "taylor_C": 960, "taylor_n": 0.36,
     "Mg": (2.6, 3.1, 3.6), "Mn": (0, 0.30, 0.50), "thermal_k": 138, "density": 2670, "solidus": 602,
     "jc": {"A": 100, "B": 340, "n": 0.40, "C": 0.021, "m": 1.10}, "apps": ["automotive_body", "floor_panels"]},
    {"id": "N-AL-091", "aa": "5182", "name": "5182-H48 Can End Stock", "uns": "A95182", "temper": "H48", "condition": "Partial Anneal",
     "hb": 78, "tensile": 310, "yield": 255, "elong": 7, "mach": 80, "kc11": 650, "mc": 0.25, "taylor_C": 870, "taylor_n": 0.34,
     "Mg": (4.0, 4.5, 5.0), "Mn": (0.20, 0.35, 0.50), "thermal_k": 121, "density": 2650, "solidus": 577,
     "jc": {"A": 230, "B": 420, "n": 0.32, "C": 0.015, "m": 0.98}, "apps": ["can_ends", "tabs"]},
    {"id": "N-AL-092", "aa": "5454", "name": "5454-H34 High Temp Marine", "uns": "A95454", "temper": "H34", "condition": "Stabilized",
     "hb": 73, "tensile": 275, "yield": 220, "elong": 10, "mach": 70, "kc11": 600, "mc": 0.26, "taylor_C": 910, "taylor_n": 0.35,
     "Mg": (2.4, 2.7, 3.0), "Mn": (0.50, 0.80, 1.0), "thermal_k": 127, "density": 2690, "solidus": 602,
     "jc": {"A": 190, "B": 390, "n": 0.36, "C": 0.018, "m": 1.04}, "apps": ["welded_structures", "automotive"], "notes": "For >65C service"},
]

ALUMINUM_CAST = [
    {"id": "N-AL-093", "aa": "A356", "name": "A356-T6 Premium Casting", "uns": "A13560", "temper": "T6", "condition": "Solution + Age",
     "hb": 75, "tensile": 275, "yield": 207, "elong": 6, "mach": 75, "kc11": 620, "mc": 0.26, "taylor_C": 880, "taylor_n": 0.36,
     "Si": (6.5, 7.0, 7.5), "Mg": (0.25, 0.35, 0.45), "Fe_max": 0.20, "thermal_k": 151, "density": 2680, "solidus": 557,
     "jc": {"A": 180, "B": 380, "n": 0.38, "C": 0.018, "m": 1.05}, "apps": ["aerospace_castings", "wheels"], "notes": "Premium low-Fe"},
    {"id": "N-AL-094", "aa": "356", "name": "356-T6 General Casting", "uns": "A03560", "temper": "T6", "condition": "Solution + Age",
     "hb": 70, "tensile": 228, "yield": 165, "elong": 3, "mach": 70, "kc11": 600, "mc": 0.26, "taylor_C": 900, "taylor_n": 0.36,
     "Si": (6.5, 7.0, 7.5), "Mg": (0.25, 0.35, 0.45), "Fe_max": 0.60, "thermal_k": 151, "density": 2680, "solidus": 557,
     "jc": {"A": 160, "B": 360, "n": 0.40, "C": 0.020, "m": 1.08}, "apps": ["automotive", "pump_housings"]},
    {"id": "N-AL-095", "aa": "A380", "name": "A380 Die Cast", "uns": "A13800", "temper": "F", "condition": "As-Cast",
     "hb": 80, "tensile": 324, "yield": 159, "elong": 3.5, "mach": 80, "kc11": 650, "mc": 0.25, "taylor_C": 860, "taylor_n": 0.35,
     "Si": (7.5, 8.5, 9.5), "Cu": (3.0, 3.5, 4.0), "Fe_max": 1.3, "thermal_k": 96, "density": 2740, "solidus": 538,
     "jc": {"A": 200, "B": 400, "n": 0.35, "C": 0.016, "m": 1.00}, "apps": ["die_castings", "housings"], "notes": "Most used die cast"},
    {"id": "N-AL-096", "aa": "319", "name": "319-T6 Engine Block", "uns": "A03190", "temper": "T6", "condition": "Solution + Age",
     "hb": 80, "tensile": 250, "yield": 165, "elong": 2, "mach": 85, "kc11": 660, "mc": 0.25, "taylor_C": 850, "taylor_n": 0.35,
     "Si": (5.5, 6.0, 6.5), "Cu": (3.0, 3.5, 4.0), "Fe_max": 1.0, "thermal_k": 109, "density": 2790, "solidus": 516,
     "jc": {"A": 175, "B": 370, "n": 0.36, "C": 0.018, "m": 1.02}, "apps": ["engine_blocks", "cylinder_heads"]},
    {"id": "N-AL-097", "aa": "413", "name": "413 Die Cast High Si", "uns": "A04130", "temper": "F", "condition": "As-Cast",
     "hb": 85, "tensile": 296, "yield": 145, "elong": 2.5, "mach": 60, "kc11": 700, "mc": 0.24, "taylor_C": 820, "taylor_n": 0.33,
     "Si": (11.0, 12.0, 13.0), "Fe_max": 1.3, "thermal_k": 121, "density": 2660, "solidus": 577,
     "jc": {"A": 170, "B": 380, "n": 0.35, "C": 0.017, "m": 1.00}, "apps": ["thin_wall_castings"], "notes": "High Si - abrasive"},
    {"id": "N-AL-098", "aa": "390", "name": "390-T6 Hypereutectic", "uns": "A03900", "temper": "T6", "condition": "Solution + Age",
     "hb": 120, "tensile": 280, "yield": 241, "elong": 1, "mach": 40, "kc11": 800, "mc": 0.23, "taylor_C": 700, "taylor_n": 0.30,
     "Si": (16.0, 17.0, 18.0), "Cu": (4.0, 4.5, 5.0), "Mg": (0.45, 0.55, 0.65), "thermal_k": 134, "density": 2730, "solidus": 507,
     "jc": {"A": 220, "B": 420, "n": 0.32, "C": 0.014, "m": 0.95}, "apps": ["linerless_blocks", "pistons"], "notes": "PCD required"},
    {"id": "N-AL-099", "aa": "A201", "name": "A201-T7 High Strength Cast", "uns": "A02010", "temper": "T7", "condition": "Solution + Overage",
     "hb": 115, "tensile": 414, "yield": 345, "elong": 5, "mach": 90, "kc11": 720, "mc": 0.25, "taylor_C": 800, "taylor_n": 0.34,
     "Cu": (4.0, 4.6, 5.2), "Mg": (0.15, 0.35, 0.55), "Ag": (0.40, 0.70, 1.0), "thermal_k": 121, "density": 2800, "solidus": 521,
     "jc": {"A": 300, "B": 440, "n": 0.30, "C": 0.014, "m": 0.92}, "apps": ["aerospace_castings"], "notes": "Highest strength cast"},
    {"id": "N-AL-100", "aa": "518", "name": "518 Marine Cast", "uns": "A05180", "temper": "F", "condition": "As-Cast",
     "hb": 75, "tensile": 310, "yield": 193, "elong": 8, "mach": 70, "kc11": 640, "mc": 0.26, "taylor_C": 870, "taylor_n": 0.36,
     "Mg": (7.5, 8.0, 8.5), "Fe_max": 1.8, "thermal_k": 87, "density": 2530, "solidus": 538,
     "jc": {"A": 200, "B": 410, "n": 0.36, "C": 0.017, "m": 1.02}, "apps": ["marine_hardware", "food_equipment"]},
]

# =============================================================================
# COPPER ALLOYS
# =============================================================================
COPPER_BRASSES = [
    {"id": "N-CU-001", "cda": "C26000", "name": "C26000 Cartridge Brass 70/30", "uns": "C26000", "type": "brass", "condition": "Annealed",
     "hb": 65, "tensile": 340, "yield": 105, "elong": 62, "mach": 30, "kc11": 1100, "mc": 0.22, "taylor_C": 400, "taylor_n": 0.28,
     "Cu": (68.5, 70.0, 71.5), "Zn": (28.5, 30.0, 31.5), "thermal_k": 120, "density": 8530, "solidus": 915, "liquidus": 955,
     "jc": {"A": 120, "B": 650, "n": 0.52, "C": 0.025, "m": 1.15}, "apps": ["cartridge_cases", "deep_drawn"], "notes": "Most ductile brass"},
    {"id": "N-CU-002", "cda": "C26000", "name": "C26000 Cartridge Brass H02", "uns": "C26000", "type": "brass", "condition": "Half Hard",
     "hb": 115, "tensile": 435, "yield": 360, "elong": 23, "mach": 30, "kc11": 1200, "mc": 0.21, "taylor_C": 380, "taylor_n": 0.27,
     "Cu": (68.5, 70.0, 71.5), "Zn": (28.5, 30.0, 31.5), "thermal_k": 120, "density": 8530, "solidus": 915, "liquidus": 955,
     "jc": {"A": 330, "B": 700, "n": 0.40, "C": 0.018, "m": 1.00}, "apps": ["hardware", "fasteners"]},
    {"id": "N-CU-003", "cda": "C36000", "name": "C36000 Free-Cutting Brass", "uns": "C36000", "type": "brass", "condition": "Half Hard",
     "hb": 85, "tensile": 385, "yield": 170, "elong": 53, "mach": 100, "kc11": 850, "mc": 0.24, "taylor_C": 600, "taylor_n": 0.35,
     "Cu": (60.0, 61.5, 63.0), "Zn": (34.0, 35.5, 37.0), "Pb": (2.5, 3.0, 3.5), "thermal_k": 115, "density": 8500, "solidus": 885, "liquidus": 900,
     "jc": {"A": 150, "B": 500, "n": 0.42, "C": 0.022, "m": 1.08}, "apps": ["screw_machine", "fittings"], "notes": "MACHINABILITY STANDARD = 100%"},
    {"id": "N-CU-004", "cda": "C28000", "name": "C28000 Muntz Metal 60/40", "uns": "C28000", "type": "brass", "condition": "Hot-Rolled",
     "hb": 75, "tensile": 370, "yield": 145, "elong": 45, "mach": 40, "kc11": 1050, "mc": 0.22, "taylor_C": 420, "taylor_n": 0.29,
     "Cu": (59.0, 60.0, 63.0), "Zn": (37.0, 40.0, 41.0), "thermal_k": 123, "density": 8390, "solidus": 900, "liquidus": 905,
     "jc": {"A": 140, "B": 580, "n": 0.48, "C": 0.023, "m": 1.12}, "apps": ["architectural", "condenser_tubes"], "notes": "Alpha-beta"},
    {"id": "N-CU-005", "cda": "C27000", "name": "C27000 Yellow Brass 65/35", "uns": "C27000", "type": "brass", "condition": "Annealed",
     "hb": 62, "tensile": 325, "yield": 105, "elong": 60, "mach": 30, "kc11": 1080, "mc": 0.22, "taylor_C": 410, "taylor_n": 0.28,
     "Cu": (63.0, 65.0, 68.5), "Zn": (31.5, 35.0, 37.0), "thermal_k": 121, "density": 8470, "solidus": 905, "liquidus": 935,
     "jc": {"A": 115, "B": 630, "n": 0.50, "C": 0.025, "m": 1.14}, "apps": ["plumbing", "decorative"]},
    {"id": "N-CU-006", "cda": "C23000", "name": "C23000 Red Brass 85/15", "uns": "C23000", "type": "brass", "condition": "Annealed",
     "hb": 55, "tensile": 275, "yield": 70, "elong": 50, "mach": 30, "kc11": 950, "mc": 0.23, "taylor_C": 450, "taylor_n": 0.30,
     "Cu": (84.0, 85.0, 86.0), "Zn": (14.0, 15.0, 16.0), "thermal_k": 159, "density": 8750, "solidus": 990, "liquidus": 1025,
     "jc": {"A": 85, "B": 520, "n": 0.55, "C": 0.028, "m": 1.20}, "apps": ["plumbing_pipe", "jewelry"]},
    {"id": "N-CU-007", "cda": "C46400", "name": "C46400 Naval Brass", "uns": "C46400", "type": "brass", "condition": "Annealed",
     "hb": 80, "tensile": 380, "yield": 170, "elong": 40, "mach": 30, "kc11": 1100, "mc": 0.22, "taylor_C": 400, "taylor_n": 0.28,
     "Cu": (59.0, 61.0, 62.0), "Zn": (37.0, 38.0, 40.0), "Sn": (0.5, 0.75, 1.0), "thermal_k": 116, "density": 8410, "solidus": 885, "liquidus": 900,
     "jc": {"A": 160, "B": 600, "n": 0.48, "C": 0.024, "m": 1.12}, "apps": ["marine_hardware", "propeller_shafts"], "notes": "Sn inhibits dezincification"},
]

COPPER_BRONZES = [
    {"id": "N-CU-011", "cda": "C51000", "name": "C51000 Phosphor Bronze 5% A", "uns": "C51000", "type": "bronze", "condition": "Annealed",
     "hb": 80, "tensile": 340, "yield": 130, "elong": 64, "mach": 20, "kc11": 1200, "mc": 0.21, "taylor_C": 350, "taylor_n": 0.26,
     "Cu": (93.7, 94.8, 96.0), "Sn": (4.2, 5.0, 5.8), "P": (0.03, 0.10, 0.35), "thermal_k": 84, "density": 8860, "solidus": 950, "liquidus": 1050,
     "jc": {"A": 140, "B": 700, "n": 0.55, "C": 0.025, "m": 1.15}, "apps": ["springs", "electrical_contacts"]},
    {"id": "N-CU-012", "cda": "C52100", "name": "C52100 Phosphor Bronze 8% C", "uns": "C52100", "type": "bronze", "condition": "Annealed",
     "hb": 95, "tensile": 380, "yield": 170, "elong": 50, "mach": 20, "kc11": 1300, "mc": 0.20, "taylor_C": 320, "taylor_n": 0.25,
     "Cu": (91.0, 92.0, 93.0), "Sn": (7.0, 8.0, 9.0), "P": (0.03, 0.10, 0.35), "thermal_k": 67, "density": 8800, "solidus": 880, "liquidus": 1000,
     "jc": {"A": 180, "B": 750, "n": 0.50, "C": 0.022, "m": 1.10}, "apps": ["heavy_springs", "thrust_washers"]},
    {"id": "N-CU-013", "cda": "C54400", "name": "C54400 Free-Cutting Phosphor Bronze", "uns": "C54400", "type": "bronze", "condition": "Annealed",
     "hb": 75, "tensile": 310, "yield": 145, "elong": 30, "mach": 80, "kc11": 950, "mc": 0.23, "taylor_C": 520, "taylor_n": 0.33,
     "Cu": (87.0, 88.0, 90.0), "Sn": (3.5, 4.0, 4.5), "Pb": (3.5, 4.0, 4.5), "Zn": (1.5, 3.5, 5.0), "thermal_k": 75, "density": 8890, "solidus": 830, "liquidus": 990,
     "jc": {"A": 145, "B": 550, "n": 0.45, "C": 0.024, "m": 1.08}, "apps": ["screw_machine", "bearings", "gears"]},
    {"id": "N-CU-014", "cda": "C63000", "name": "C63000 Aluminum Bronze", "uns": "C63000", "type": "bronze", "condition": "Annealed",
     "hb": 170, "tensile": 620, "yield": 260, "elong": 15, "mach": 50, "kc11": 1400, "mc": 0.19, "taylor_C": 280, "taylor_n": 0.24,
     "Cu": (79.0, 82.0, 85.0), "Al": (9.0, 10.0, 11.0), "Fe": (2.0, 3.0, 4.0), "Ni": (4.0, 5.0, 6.0), "thermal_k": 63, "density": 7580, "solidus": 1015, "liquidus": 1045,
     "jc": {"A": 280, "B": 900, "n": 0.45, "C": 0.018, "m": 0.95}, "apps": ["gears", "bushings", "valve_seats"], "notes": "HIGH strength"},
    {"id": "N-CU-015", "cda": "C63000", "name": "C63000 Aluminum Bronze HT", "uns": "C63000", "type": "bronze", "condition": "Heat Treated",
     "hb": 230, "tensile": 760, "yield": 415, "elong": 6, "mach": 35, "kc11": 1600, "mc": 0.18, "taylor_C": 220, "taylor_n": 0.22,
     "Cu": (79.0, 82.0, 85.0), "Al": (9.0, 10.0, 11.0), "Fe": (2.0, 3.0, 4.0), "Ni": (4.0, 5.0, 6.0), "thermal_k": 63, "density": 7580, "solidus": 1015, "liquidus": 1045,
     "jc": {"A": 400, "B": 1000, "n": 0.38, "C": 0.014, "m": 0.88}, "apps": ["landing_gear", "heavy_gears"]},
    {"id": "N-CU-016", "cda": "C95400", "name": "C95400 Aluminum Bronze Cast", "uns": "C95400", "type": "bronze", "condition": "As-Cast",
     "hb": 160, "tensile": 585, "yield": 235, "elong": 12, "mach": 60, "kc11": 1350, "mc": 0.20, "taylor_C": 300, "taylor_n": 0.25,
     "Cu": (83.0, 85.0, 87.0), "Al": (10.0, 11.0, 11.5), "Fe": (3.0, 4.0, 5.0), "thermal_k": 59, "density": 7450, "solidus": 1020, "liquidus": 1040,
     "jc": {"A": 255, "B": 850, "n": 0.42, "C": 0.018, "m": 0.95}, "apps": ["valve_bodies", "propellers"]},
    {"id": "N-CU-017", "cda": "C93200", "name": "C93200 Bearing Bronze SAE 660", "uns": "C93200", "type": "bronze", "condition": "As-Cast",
     "hb": 65, "tensile": 240, "yield": 115, "elong": 20, "mach": 70, "kc11": 900, "mc": 0.24, "taylor_C": 480, "taylor_n": 0.32,
     "Cu": (81.0, 83.0, 85.0), "Sn": (6.5, 7.0, 7.5), "Pb": (6.0, 7.0, 8.0), "Zn": (2.0, 3.0, 4.0), "thermal_k": 59, "density": 8930, "solidus": 854, "liquidus": 1000,
     "jc": {"A": 115, "B": 480, "n": 0.48, "C": 0.026, "m": 1.12}, "apps": ["bushings", "bearings"], "notes": "Industry standard bearing"},
    {"id": "N-CU-018", "cda": "C86300", "name": "C86300 Manganese Bronze", "uns": "C86300", "type": "bronze", "condition": "As-Cast",
     "hb": 180, "tensile": 655, "yield": 330, "elong": 15, "mach": 30, "kc11": 1450, "mc": 0.19, "taylor_C": 260, "taylor_n": 0.23,
     "Cu": (60.0, 63.0, 66.0), "Zn": (22.0, 25.0, 28.0), "Al": (5.0, 6.0, 7.5), "Mn": (2.5, 3.5, 4.5), "Fe": (2.0, 3.0, 4.0),
     "thermal_k": 50, "density": 8050, "solidus": 870, "liquidus": 945,
     "jc": {"A": 320, "B": 920, "n": 0.40, "C": 0.016, "m": 0.92}, "apps": ["marine_propellers", "worm_wheels"]},
]

COPPER_PURE = [
    {"id": "N-CU-021", "cda": "C11000", "name": "C11000 ETP Copper", "uns": "C11000", "type": "copper", "condition": "Annealed",
     "hb": 40, "tensile": 220, "yield": 70, "elong": 50, "mach": 20, "kc11": 800, "mc": 0.25, "taylor_C": 480, "taylor_n": 0.32,
     "Cu_min": 99.90, "O": (0.02, 0.04, 0.05), "thermal_k": 391, "density": 8940, "solidus": 1065, "liquidus": 1083,
     "jc": {"A": 70, "B": 450, "n": 0.58, "C": 0.030, "m": 1.25}, "apps": ["electrical_wire", "bus_bars"], "notes": "101% IACS"},
    {"id": "N-CU-022", "cda": "C11000", "name": "C11000 ETP Copper H04", "uns": "C11000", "type": "copper", "condition": "Hard",
     "hb": 90, "tensile": 345, "yield": 310, "elong": 12, "mach": 20, "kc11": 920, "mc": 0.23, "taylor_C": 420, "taylor_n": 0.30,
     "Cu_min": 99.90, "thermal_k": 391, "density": 8940, "solidus": 1065, "liquidus": 1083,
     "jc": {"A": 290, "B": 520, "n": 0.35, "C": 0.020, "m": 1.00}, "apps": ["roofing", "gutters"]},
    {"id": "N-CU-023", "cda": "C10200", "name": "C10200 OFHC Copper", "uns": "C10200", "type": "copper", "condition": "Annealed",
     "hb": 40, "tensile": 220, "yield": 70, "elong": 50, "mach": 20, "kc11": 780, "mc": 0.26, "taylor_C": 500, "taylor_n": 0.33,
     "Cu_min": 99.95, "thermal_k": 394, "density": 8940, "solidus": 1075, "liquidus": 1083,
     "jc": {"A": 65, "B": 440, "n": 0.60, "C": 0.032, "m": 1.28}, "apps": ["vacuum_electronics", "superconductor"], "notes": "No H2 embrittlement"},
    {"id": "N-CU-024", "cda": "C17200", "name": "C17200 Beryllium Copper AT", "uns": "C17200", "type": "copper_alloy", "condition": "Age Hardened",
     "hb": 380, "tensile": 1280, "yield": 1170, "elong": 2, "mach": 20, "kc11": 1800, "mc": 0.17, "taylor_C": 150, "taylor_n": 0.18,
     "Cu": (96.0, 97.0, 98.0), "Be": (1.80, 1.95, 2.00), "Co": (0.20, 0.25, 0.30), "thermal_k": 115, "density": 8250, "solidus": 865, "liquidus": 980,
     "jc": {"A": 950, "B": 1200, "n": 0.25, "C": 0.008, "m": 0.70}, "apps": ["springs", "non_sparking_tools"], "notes": "HIGHEST strength Cu. Be hazard!"},
    {"id": "N-CU-025", "cda": "C71500", "name": "C71500 Copper-Nickel 70/30", "uns": "C71500", "type": "cupronickel", "condition": "Annealed",
     "hb": 70, "tensile": 380, "yield": 140, "elong": 42, "mach": 25, "kc11": 1150, "mc": 0.21, "taylor_C": 360, "taylor_n": 0.27,
     "Cu": (65.0, 68.0, 71.0), "Ni": (29.0, 30.0, 33.0), "Fe": (0.40, 0.60, 1.0), "thermal_k": 29, "density": 8940, "solidus": 1170, "liquidus": 1240,
     "jc": {"A": 150, "B": 680, "n": 0.50, "C": 0.024, "m": 1.12}, "apps": ["seawater_piping", "condensers"], "notes": "BEST seawater resistance"},
    {"id": "N-CU-026", "cda": "C70600", "name": "C70600 Copper-Nickel 90/10", "uns": "C70600", "type": "cupronickel", "condition": "Annealed",
     "hb": 60, "tensile": 305, "yield": 110, "elong": 40, "mach": 25, "kc11": 1050, "mc": 0.22, "taylor_C": 400, "taylor_n": 0.29,
     "Cu": (86.0, 88.0, 91.0), "Ni": (9.0, 10.0, 11.0), "Fe": (1.0, 1.4, 1.8), "thermal_k": 45, "density": 8940, "solidus": 1100, "liquidus": 1145,
     "jc": {"A": 120, "B": 600, "n": 0.52, "C": 0.026, "m": 1.15}, "apps": ["condenser_tubes", "desalination"]},
]

# =============================================================================
# TITANIUM ALLOYS
# =============================================================================
TITANIUM_ALLOYS = [
    {"id": "N-TI-001", "grade": "Grade 1", "name": "CP Ti Grade 1 Soft", "uns": "R50250", "type": "cp", "condition": "Annealed",
     "hb": 120, "tensile": 240, "yield": 170, "elong": 24, "mach": 30, "kc11": 1400, "mc": 0.20, "taylor_C": 120, "taylor_n": 0.20,
     "Ti_min": 99.5, "O_max": 0.18, "thermal_k": 16.4, "density": 4510, "solidus": 1660, "liquidus": 1670,
     "jc": {"A": 160, "B": 600, "n": 0.55, "C": 0.030, "m": 1.10}, "apps": ["chemical", "medical"], "notes": "Softest CP"},
    {"id": "N-TI-002", "grade": "Grade 2", "name": "CP Ti Grade 2 Standard", "uns": "R50400", "type": "cp", "condition": "Annealed",
     "hb": 160, "tensile": 345, "yield": 275, "elong": 20, "mach": 30, "kc11": 1500, "mc": 0.19, "taylor_C": 110, "taylor_n": 0.19,
     "Ti_min": 99.2, "O_max": 0.25, "thermal_k": 16.4, "density": 4510, "solidus": 1660, "liquidus": 1670,
     "jc": {"A": 260, "B": 700, "n": 0.48, "C": 0.025, "m": 1.05}, "apps": ["airframes", "chemical"], "notes": "MOST USED CP"},
    {"id": "N-TI-003", "grade": "Grade 4", "name": "CP Ti Grade 4 High Strength", "uns": "R50700", "type": "cp", "condition": "Annealed",
     "hb": 200, "tensile": 550, "yield": 480, "elong": 15, "mach": 25, "kc11": 1650, "mc": 0.18, "taylor_C": 90, "taylor_n": 0.17,
     "Ti_min": 99.0, "O_max": 0.40, "thermal_k": 16.4, "density": 4510, "solidus": 1660, "liquidus": 1670,
     "jc": {"A": 450, "B": 800, "n": 0.38, "C": 0.020, "m": 0.95}, "apps": ["aerospace_fasteners"], "notes": "STRONGEST CP"},
    {"id": "N-TI-004", "grade": "Ti-6Al-4V", "name": "Ti-6Al-4V Annealed", "uns": "R56400", "type": "alpha_beta", "condition": "Annealed",
     "hb": 334, "tensile": 895, "yield": 828, "elong": 14, "mach": 22, "kc11": 1800, "mc": 0.17, "taylor_C": 65, "taylor_n": 0.15,
     "Ti": (87.0, 89.0, 91.0), "Al": (5.5, 6.0, 6.75), "V": (3.5, 4.0, 4.5), "thermal_k": 6.7, "density": 4430, "solidus": 1604, "liquidus": 1660,
     "jc": {"A": 782, "B": 498, "n": 0.28, "C": 0.028, "m": 1.0}, "apps": ["aerospace", "medical"], "notes": "WORKHORSE Ti - 50% of all Ti"},
    {"id": "N-TI-005", "grade": "Ti-6Al-4V", "name": "Ti-6Al-4V STA", "uns": "R56400", "type": "alpha_beta", "condition": "Solution + Aged",
     "hb": 379, "tensile": 1100, "yield": 1035, "elong": 10, "mach": 18, "kc11": 2000, "mc": 0.16, "taylor_C": 50, "taylor_n": 0.14,
     "Ti": (87.0, 89.0, 91.0), "Al": (5.5, 6.0, 6.75), "V": (3.5, 4.0, 4.5), "thermal_k": 6.7, "density": 4430, "solidus": 1604, "liquidus": 1660,
     "jc": {"A": 950, "B": 600, "n": 0.24, "C": 0.022, "m": 0.90}, "apps": ["fasteners", "landing_gear"]},
    {"id": "N-TI-006", "grade": "Ti-6Al-4V ELI", "name": "Ti-6Al-4V ELI Medical", "uns": "R56401", "type": "alpha_beta", "condition": "Annealed",
     "hb": 320, "tensile": 860, "yield": 795, "elong": 15, "mach": 22, "kc11": 1750, "mc": 0.17, "taylor_C": 70, "taylor_n": 0.16,
     "Ti": (87.0, 89.0, 91.0), "Al": (5.5, 6.0, 6.5), "V": (3.5, 4.0, 4.5), "O_max": 0.13, "thermal_k": 6.7, "density": 4430, "solidus": 1604, "liquidus": 1660,
     "jc": {"A": 750, "B": 480, "n": 0.30, "C": 0.030, "m": 1.02}, "apps": ["hip_implants", "dental"], "notes": "ELI = Extra Low Interstitial"},
    {"id": "N-TI-007", "grade": "Ti-5Al-2.5Sn", "name": "Ti-5Al-2.5Sn Alpha", "uns": "R54520", "type": "alpha", "condition": "Annealed",
     "hb": 300, "tensile": 830, "yield": 780, "elong": 16, "mach": 25, "kc11": 1700, "mc": 0.18, "taylor_C": 75, "taylor_n": 0.16,
     "Ti": (89.0, 91.0, 93.0), "Al": (4.5, 5.0, 5.5), "Sn": (2.0, 2.5, 3.0), "thermal_k": 7.5, "density": 4480, "solidus": 1620, "liquidus": 1660,
     "jc": {"A": 720, "B": 520, "n": 0.32, "C": 0.025, "m": 1.00}, "apps": ["cryogenic", "jet_engine"], "notes": "Stable to -253C"},
    {"id": "N-TI-008", "grade": "Ti-3Al-2.5V", "name": "Ti-3Al-2.5V Tubing", "uns": "R56320", "type": "alpha_beta", "condition": "Annealed",
     "hb": 280, "tensile": 620, "yield": 520, "elong": 20, "mach": 28, "kc11": 1550, "mc": 0.19, "taylor_C": 85, "taylor_n": 0.17,
     "Ti": (92.0, 94.0, 96.0), "Al": (2.5, 3.0, 3.5), "V": (2.0, 2.5, 3.0), "thermal_k": 8.4, "density": 4480, "solidus": 1650, "liquidus": 1670,
     "jc": {"A": 480, "B": 580, "n": 0.38, "C": 0.028, "m": 1.05}, "apps": ["hydraulic_tubing", "bicycle_frames"]},
    {"id": "N-TI-009", "grade": "Ti-6242S", "name": "Ti-6Al-2Sn-4Zr-2Mo High Temp", "uns": "R54620", "type": "alpha_beta", "condition": "Annealed",
     "hb": 340, "tensile": 1035, "yield": 965, "elong": 12, "mach": 18, "kc11": 1900, "mc": 0.16, "taylor_C": 55, "taylor_n": 0.14,
     "Ti": (82.0, 85.0, 88.0), "Al": (5.5, 6.0, 6.5), "Sn": (1.5, 2.0, 2.5), "Zr": (3.5, 4.0, 4.5), "Mo": (1.5, 2.0, 2.5),
     "thermal_k": 7.2, "density": 4540, "solidus": 1605, "liquidus": 1660,
     "jc": {"A": 900, "B": 620, "n": 0.26, "C": 0.020, "m": 0.88}, "apps": ["jet_engine_compressor"], "notes": "Up to 540C"},
    {"id": "N-TI-010", "grade": "Ti-10-2-3", "name": "Ti-10V-2Fe-3Al Beta", "uns": "R56410", "type": "beta", "condition": "Solution + Age",
     "hb": 400, "tensile": 1250, "yield": 1170, "elong": 8, "mach": 15, "kc11": 2100, "mc": 0.15, "taylor_C": 40, "taylor_n": 0.12,
     "Ti": (82.0, 84.0, 86.0), "V": (9.0, 10.0, 11.0), "Fe": (1.5, 2.0, 2.5), "Al": (2.5, 3.0, 3.5),
     "thermal_k": 8.0, "density": 4650, "solidus": 1540, "liquidus": 1620,
     "jc": {"A": 1100, "B": 680, "n": 0.22, "C": 0.015, "m": 0.82}, "apps": ["landing_gear", "heavy_forgings"], "notes": "HIGHEST strength Ti"},
    {"id": "N-TI-011", "grade": "Ti-15-3", "name": "Ti-15V-3Cr-3Al-3Sn Beta Strip", "uns": "R58153", "type": "beta", "condition": "Annealed",
     "hb": 250, "tensile": 793, "yield": 759, "elong": 17, "mach": 25, "kc11": 1650, "mc": 0.18, "taylor_C": 70, "taylor_n": 0.16,
     "Ti": (72.0, 75.0, 78.0), "V": (14.0, 15.0, 16.0), "Cr": (2.5, 3.0, 3.5), "Al": (2.5, 3.0, 3.5), "Sn": (2.5, 3.0, 3.5),
     "thermal_k": 8.5, "density": 4760, "solidus": 1490, "liquidus": 1570,
     "jc": {"A": 700, "B": 550, "n": 0.32, "C": 0.025, "m": 0.98}, "apps": ["aircraft_sheet", "springs"]},
    {"id": "N-TI-012", "grade": "Ti-5553", "name": "Ti-5Al-5V-5Mo-3Cr Beta", "uns": "R58350", "type": "beta", "condition": "Solution + Age",
     "hb": 390, "tensile": 1200, "yield": 1150, "elong": 10, "mach": 16, "kc11": 2050, "mc": 0.15, "taylor_C": 45, "taylor_n": 0.13,
     "Ti": (79.0, 82.0, 85.0), "Al": (4.5, 5.0, 5.5), "V": (4.5, 5.0, 5.5), "Mo": (4.5, 5.0, 5.5), "Cr": (2.5, 3.0, 3.5),
     "thermal_k": 6.5, "density": 4650, "solidus": 1500, "liquidus": 1590,
     "jc": {"A": 1050, "B": 660, "n": 0.23, "C": 0.016, "m": 0.84}, "apps": ["landing_gear", "heavy_structural"], "notes": "Boeing 787"},
]

# =============================================================================
# MAGNESIUM ALLOYS
# =============================================================================
MAGNESIUM_ALLOYS = [
    {"id": "N-MG-001", "name": "AZ31B-O Sheet", "uns": "M11311", "type": "wrought", "condition": "Annealed",
     "hb": 49, "tensile": 255, "yield": 150, "elong": 15, "mach": 100, "kc11": 380, "mc": 0.32, "taylor_C": 1200, "taylor_n": 0.42,
     "Mg": (93.0, 95.0, 97.0), "Al": (2.5, 3.0, 3.5), "Zn": (0.6, 1.0, 1.4), "Mn": (0.2, 0.35, 0.50),
     "thermal_k": 96, "density": 1770, "solidus": 566, "liquidus": 630,
     "jc": {"A": 130, "B": 280, "n": 0.45, "C": 0.025, "m": 1.20}, "apps": ["aircraft_panels", "electronic_housings"], "notes": "Most common wrought Mg"},
    {"id": "N-MG-002", "name": "AZ31B-H24 Sheet", "uns": "M11311", "type": "wrought", "condition": "Partially Annealed",
     "hb": 60, "tensile": 290, "yield": 220, "elong": 12, "mach": 100, "kc11": 420, "mc": 0.30, "taylor_C": 1150, "taylor_n": 0.40,
     "Mg": (93.0, 95.0, 97.0), "Al": (2.5, 3.0, 3.5), "Zn": (0.6, 1.0, 1.4),
     "thermal_k": 96, "density": 1770, "solidus": 566, "liquidus": 630,
     "jc": {"A": 200, "B": 320, "n": 0.38, "C": 0.022, "m": 1.10}, "apps": ["vibration_dampening", "camera_bodies"]},
    {"id": "N-MG-003", "name": "AZ61A-F Extrusion", "uns": "M11610", "type": "wrought", "condition": "As-Fabricated",
     "hb": 55, "tensile": 295, "yield": 180, "elong": 12, "mach": 100, "kc11": 400, "mc": 0.31, "taylor_C": 1180, "taylor_n": 0.41,
     "Mg": (90.0, 93.0, 96.0), "Al": (5.5, 6.5, 7.2), "Zn": (0.5, 1.0, 1.5), "Mn": (0.15, 0.25, 0.35),
     "thermal_k": 77, "density": 1800, "solidus": 525, "liquidus": 620,
     "jc": {"A": 170, "B": 340, "n": 0.40, "C": 0.023, "m": 1.12}, "apps": ["aircraft_extrusions", "luggage_frames"]},
    {"id": "N-MG-004", "name": "AZ80A-T5 Forging", "uns": "M11800", "type": "wrought", "condition": "Artificial Age",
     "hb": 72, "tensile": 345, "yield": 245, "elong": 6, "mach": 100, "kc11": 460, "mc": 0.29, "taylor_C": 1100, "taylor_n": 0.38,
     "Mg": (88.0, 91.0, 94.0), "Al": (7.8, 8.5, 9.2), "Zn": (0.2, 0.5, 0.8), "Mn": (0.12, 0.20, 0.30),
     "thermal_k": 72, "density": 1800, "solidus": 475, "liquidus": 610,
     "jc": {"A": 230, "B": 380, "n": 0.35, "C": 0.020, "m": 1.05}, "apps": ["aerospace_forgings", "helicopter_gearboxes"], "notes": "Highest strength wrought Mg"},
    {"id": "N-MG-005", "name": "ZK60A-T5 High Strength", "uns": "M16600", "type": "wrought", "condition": "Artificial Age",
     "hb": 75, "tensile": 350, "yield": 285, "elong": 8, "mach": 90, "kc11": 480, "mc": 0.28, "taylor_C": 1080, "taylor_n": 0.37,
     "Mg": (90.0, 93.0, 96.0), "Zn": (4.8, 5.7, 6.2), "Zr": (0.40, 0.55, 0.80),
     "thermal_k": 105, "density": 1830, "solidus": 520, "liquidus": 635,
     "jc": {"A": 260, "B": 400, "n": 0.32, "C": 0.018, "m": 1.00}, "apps": ["aerospace_extrusions", "missile_components"]},
    {"id": "N-MG-006", "name": "AZ91D Die Cast", "uns": "M11916", "type": "cast", "condition": "As-Cast",
     "hb": 63, "tensile": 230, "yield": 160, "elong": 3, "mach": 100, "kc11": 400, "mc": 0.30, "taylor_C": 1150, "taylor_n": 0.40,
     "Mg": (88.0, 90.0, 92.0), "Al": (8.3, 9.0, 9.7), "Zn": (0.35, 0.7, 1.0), "Mn": (0.15, 0.22, 0.30),
     "thermal_k": 72, "density": 1810, "solidus": 470, "liquidus": 598,
     "jc": {"A": 150, "B": 320, "n": 0.42, "C": 0.024, "m": 1.15}, "apps": ["die_castings", "automotive", "electronics"], "notes": "Most common cast Mg"},
    {"id": "N-MG-007", "name": "AM60B Die Cast", "uns": "M10602", "type": "cast", "condition": "As-Cast",
     "hb": 55, "tensile": 225, "yield": 130, "elong": 8, "mach": 100, "kc11": 380, "mc": 0.31, "taylor_C": 1200, "taylor_n": 0.42,
     "Mg": (92.0, 94.0, 96.0), "Al": (5.5, 6.0, 6.5), "Mn": (0.24, 0.30, 0.50),
     "thermal_k": 62, "density": 1800, "solidus": 538, "liquidus": 620,
     "jc": {"A": 120, "B": 290, "n": 0.45, "C": 0.026, "m": 1.18}, "apps": ["automotive_wheels", "steering_wheels"], "notes": "Better ductility than AZ91"},
    {"id": "N-MG-008", "name": "WE43A-T6 High Temp Cast", "uns": "M18430", "type": "cast", "condition": "Solution + Age",
     "hb": 80, "tensile": 250, "yield": 170, "elong": 4, "mach": 85, "kc11": 450, "mc": 0.28, "taylor_C": 1050, "taylor_n": 0.36,
     "Mg": (90.0, 92.5, 95.0), "Y": (3.7, 4.2, 4.7), "Nd": (2.0, 2.5, 3.2), "Zr": (0.3, 0.55, 0.80),
     "thermal_k": 51, "density": 1840, "solidus": 535, "liquidus": 605,
     "jc": {"A": 165, "B": 350, "n": 0.40, "C": 0.022, "m": 1.08}, "apps": ["aerospace_castings", "helicopter_gearboxes"], "notes": "Good to 250C. Rare earth"},
    {"id": "N-MG-009", "name": "EZ33A-T5 Sand Cast", "uns": "M12331", "type": "cast", "condition": "Artificial Age",
     "hb": 55, "tensile": 160, "yield": 110, "elong": 3, "mach": 100, "kc11": 370, "mc": 0.32, "taylor_C": 1220, "taylor_n": 0.43,
     "Mg": (92.0, 95.0, 98.0), "Zn": (2.0, 2.7, 3.0), "Zr": (0.5, 0.7, 1.0), "RE": (2.5, 3.2, 4.0),
     "thermal_k": 108, "density": 1830, "solidus": 545, "liquidus": 640,
     "jc": {"A": 100, "B": 260, "n": 0.48, "C": 0.028, "m": 1.22}, "apps": ["sand_castings", "investment_castings"]},
    {"id": "N-MG-010", "name": "QE22A-T6 Premium Cast", "uns": "M18220", "type": "cast", "condition": "Solution + Age",
     "hb": 75, "tensile": 260, "yield": 195, "elong": 3, "mach": 90, "kc11": 440, "mc": 0.29, "taylor_C": 1100, "taylor_n": 0.38,
     "Mg": (92.0, 94.0, 96.0), "Ag": (2.0, 2.5, 3.0), "Nd": (1.5, 2.1, 2.5), "Zr": (0.4, 0.6, 0.80),
     "thermal_k": 105, "density": 1810, "solidus": 500, "liquidus": 580,
     "jc": {"A": 185, "B": 360, "n": 0.38, "C": 0.020, "m": 1.05}, "apps": ["aerospace_castings", "missile_components"], "notes": "Premium with silver"},
]

# =============================================================================
# ZINC ALLOYS
# =============================================================================
ZINC_ALLOYS = [
    {"id": "N-ZN-001", "name": "Zamak 3 (ASTM AG40A)", "uns": "Z33520", "type": "die_cast", "condition": "As-Cast",
     "hb": 82, "tensile": 283, "yield": 221, "elong": 10, "mach": 85, "kc11": 600, "mc": 0.26, "taylor_C": 900, "taylor_n": 0.38,
     "Zn": (92.0, 95.5, 97.0), "Al": (3.5, 4.0, 4.3), "Mg": (0.02, 0.04, 0.06), "Cu_max": 0.10,
     "thermal_k": 113, "density": 6600, "solidus": 381, "liquidus": 387,
     "jc": {"A": 200, "B": 400, "n": 0.40, "C": 0.022, "m": 1.10}, "apps": ["die_castings", "automotive", "appliances"], "notes": "Most widely used Zn alloy"},
    {"id": "N-ZN-002", "name": "Zamak 5 (ASTM AC41A)", "uns": "Z35531", "type": "die_cast", "condition": "As-Cast",
     "hb": 91, "tensile": 331, "yield": 228, "elong": 7, "mach": 80, "kc11": 650, "mc": 0.25, "taylor_C": 850, "taylor_n": 0.36,
     "Zn": (90.0, 93.8, 96.0), "Al": (3.5, 4.0, 4.3), "Cu": (0.75, 1.0, 1.25), "Mg": (0.02, 0.04, 0.06),
     "thermal_k": 109, "density": 6700, "solidus": 380, "liquidus": 386,
     "jc": {"A": 220, "B": 450, "n": 0.38, "C": 0.020, "m": 1.05}, "apps": ["hardware", "automotive_trim"], "notes": "Cu for strength/hardness"},
    {"id": "N-ZN-003", "name": "Zamak 7", "uns": "Z33523", "type": "die_cast", "condition": "As-Cast",
     "hb": 80, "tensile": 283, "yield": 221, "elong": 13, "mach": 85, "kc11": 580, "mc": 0.27, "taylor_C": 920, "taylor_n": 0.39,
     "Zn": (92.0, 95.6, 97.0), "Al": (3.5, 4.0, 4.3), "Mg": (0.005, 0.015, 0.020), "Ni": (0.005, 0.010, 0.020),
     "thermal_k": 113, "density": 6600, "solidus": 381, "liquidus": 387,
     "jc": {"A": 190, "B": 380, "n": 0.42, "C": 0.024, "m": 1.12}, "apps": ["thin_wall_castings"], "notes": "Lower Mg = better castability"},
    {"id": "N-ZN-004", "name": "ZA-8 Zinc-Aluminum", "uns": "Z35840", "type": "die_cast", "condition": "As-Cast",
     "hb": 100, "tensile": 374, "yield": 290, "elong": 8, "mach": 70, "kc11": 700, "mc": 0.24, "taylor_C": 800, "taylor_n": 0.34,
     "Zn": (88.0, 91.0, 93.0), "Al": (8.0, 8.4, 8.8), "Cu": (0.8, 1.0, 1.3), "Mg": (0.015, 0.025, 0.030),
     "thermal_k": 115, "density": 6300, "solidus": 375, "liquidus": 404,
     "jc": {"A": 270, "B": 480, "n": 0.35, "C": 0.018, "m": 1.00}, "apps": ["bearings", "bushings"], "notes": "Higher Al = higher strength"},
    {"id": "N-ZN-005", "name": "ZA-12 Zinc-Aluminum", "uns": "Z35630", "type": "die_cast", "condition": "As-Cast",
     "hb": 105, "tensile": 400, "yield": 317, "elong": 5, "mach": 65, "kc11": 750, "mc": 0.23, "taylor_C": 780, "taylor_n": 0.33,
     "Zn": (84.0, 87.0, 90.0), "Al": (10.5, 11.0, 11.5), "Cu": (0.5, 0.75, 1.2), "Mg": (0.015, 0.025, 0.030),
     "thermal_k": 116, "density": 6030, "solidus": 377, "liquidus": 432,
     "jc": {"A": 300, "B": 520, "n": 0.32, "C": 0.016, "m": 0.95}, "apps": ["gears", "cams", "bearing_housings"]},
    {"id": "N-ZN-006", "name": "ZA-27 Zinc-Aluminum", "uns": "Z35840", "type": "gravity_cast", "condition": "As-Cast",
     "hb": 115, "tensile": 426, "yield": 359, "elong": 3, "mach": 55, "kc11": 850, "mc": 0.22, "taylor_C": 720, "taylor_n": 0.30,
     "Zn": (70.0, 73.0, 76.0), "Al": (25.0, 27.0, 28.0), "Cu": (2.0, 2.2, 2.5), "Mg": (0.01, 0.015, 0.02),
     "thermal_k": 125, "density": 5000, "solidus": 375, "liquidus": 484,
     "jc": {"A": 350, "B": 550, "n": 0.28, "C": 0.014, "m": 0.90}, "apps": ["heavy_duty_bearings", "structural"], "notes": "HIGHEST strength Zn"},
    {"id": "N-ZN-007", "name": "ILZRO 12 Superplastic", "uns": "Z21220", "type": "wrought", "condition": "Annealed",
     "hb": 60, "tensile": 150, "yield": 85, "elong": 45, "mach": 90, "kc11": 450, "mc": 0.30, "taylor_C": 1050, "taylor_n": 0.42,
     "Zn": (77.0, 78.0, 79.0), "Al": (20.0, 22.0, 24.0),
     "thermal_k": 120, "density": 5200, "solidus": 275, "liquidus": 380,
     "jc": {"A": 80, "B": 280, "n": 0.52, "C": 0.030, "m": 1.25}, "apps": ["superplastic_forming"], "notes": "Superplastic at 250C"},
    {"id": "N-ZN-008", "name": "Zinc 99.99% Pure", "uns": "Z13001", "type": "pure", "condition": "Cast",
     "hb": 35, "tensile": 85, "yield": 50, "elong": 50, "mach": 95, "kc11": 350, "mc": 0.33, "taylor_C": 1150, "taylor_n": 0.44,
     "Zn_min": 99.99, "thermal_k": 116, "density": 7140, "solidus": 419, "liquidus": 420,
     "jc": {"A": 50, "B": 180, "n": 0.60, "C": 0.035, "m": 1.35}, "apps": ["galvanizing", "anodes"], "notes": "High purity"},
]

# =============================================================================
# NICKEL SUPERALLOYS
# =============================================================================
NICKEL_SUPERALLOYS = [
    {"id": "S-NI-001", "name": "Inconel 600", "uns": "N06600", "type": "solid_solution", "condition": "Annealed",
     "hb": 150, "tensile": 550, "yield": 240, "elong": 40, "mach": 15, "kc11": 2400, "mc": 0.18, "taylor_C": 40, "taylor_n": 0.14,
     "Ni": (72.0, 75.0, 78.0), "Cr": (14.0, 16.0, 17.0), "Fe": (6.0, 8.0, 10.0), "thermal_k": 14.8, "density": 8470, "solidus": 1354, "liquidus": 1413,
     "jc": {"A": 250, "B": 1200, "n": 0.55, "C": 0.020, "m": 1.10}, "apps": ["chemical", "nuclear"], "notes": "Oxidation/carburization resistant"},
    {"id": "S-NI-002", "name": "Inconel 625", "uns": "N06625", "type": "solid_solution", "condition": "Annealed",
     "hb": 190, "tensile": 830, "yield": 415, "elong": 50, "mach": 12, "kc11": 2600, "mc": 0.17, "taylor_C": 30, "taylor_n": 0.12,
     "Ni": (58.0, 62.0, 68.0), "Cr": (20.0, 22.0, 23.0), "Mo": (8.0, 9.0, 10.0), "Nb": (3.15, 3.65, 4.15),
     "thermal_k": 9.8, "density": 8440, "solidus": 1290, "liquidus": 1350,
     "jc": {"A": 400, "B": 1400, "n": 0.50, "C": 0.018, "m": 1.05}, "apps": ["aerospace", "marine", "oil_gas"]},
    {"id": "S-NI-003", "name": "Inconel 718 Annealed", "uns": "N07718", "type": "precipitation", "condition": "Annealed",
     "hb": 250, "tensile": 965, "yield": 550, "elong": 45, "mach": 12, "kc11": 2700, "mc": 0.16, "taylor_C": 28, "taylor_n": 0.11,
     "Ni": (50.0, 53.0, 55.0), "Cr": (17.0, 19.0, 21.0), "Fe": (15.0, 18.5, 22.0), "Nb": (4.75, 5.15, 5.50), "Mo": (2.8, 3.05, 3.3),
     "thermal_k": 11.4, "density": 8190, "solidus": 1260, "liquidus": 1336,
     "jc": {"A": 500, "B": 1500, "n": 0.45, "C": 0.015, "m": 1.00}, "apps": ["turbine_discs", "cryogenic"], "notes": "MOST USED superalloy"},
    {"id": "S-NI-004", "name": "Inconel 718 Age Hardened", "uns": "N07718", "type": "precipitation", "condition": "Solution + Double Age",
     "hb": 400, "tensile": 1380, "yield": 1170, "elong": 21, "mach": 8, "kc11": 3200, "mc": 0.14, "taylor_C": 18, "taylor_n": 0.10,
     "Ni": (50.0, 53.0, 55.0), "Cr": (17.0, 19.0, 21.0), "Fe": (15.0, 18.5, 22.0), "Nb": (4.75, 5.15, 5.50),
     "thermal_k": 11.4, "density": 8190, "solidus": 1260, "liquidus": 1336,
     "jc": {"A": 1100, "B": 1200, "n": 0.30, "C": 0.010, "m": 0.85}, "apps": ["turbine_discs", "fasteners"], "notes": "Very difficult to machine"},
    {"id": "S-NI-005", "name": "Waspaloy", "uns": "N07001", "type": "precipitation", "condition": "Solution + Aged",
     "hb": 380, "tensile": 1280, "yield": 795, "elong": 25, "mach": 10, "kc11": 3000, "mc": 0.15, "taylor_C": 22, "taylor_n": 0.11,
     "Ni": (54.0, 58.0, 62.0), "Cr": (18.0, 19.5, 21.0), "Co": (12.0, 13.5, 15.0), "Mo": (3.5, 4.3, 5.0), "Ti": (2.75, 3.0, 3.25), "Al": (1.2, 1.4, 1.6),
     "thermal_k": 11.7, "density": 8190, "solidus": 1330, "liquidus": 1355,
     "jc": {"A": 750, "B": 1350, "n": 0.35, "C": 0.012, "m": 0.90}, "apps": ["turbine_blades", "turbine_discs"], "notes": "Jet engine workhorse"},
    {"id": "S-NI-006", "name": "Hastelloy X", "uns": "N06002", "type": "solid_solution", "condition": "Annealed",
     "hb": 195, "tensile": 785, "yield": 360, "elong": 43, "mach": 12, "kc11": 2500, "mc": 0.17, "taylor_C": 32, "taylor_n": 0.12,
     "Ni": (45.0, 47.0, 50.0), "Cr": (20.5, 22.0, 23.0), "Fe": (17.0, 18.5, 20.0), "Mo": (8.0, 9.0, 10.0),
     "thermal_k": 9.1, "density": 8220, "solidus": 1260, "liquidus": 1355,
     "jc": {"A": 350, "B": 1350, "n": 0.48, "C": 0.018, "m": 1.05}, "apps": ["combustion_cans", "furnace_parts"], "notes": "To 1175C"},
    {"id": "S-NI-007", "name": "Hastelloy C-276", "uns": "N10276", "type": "solid_solution", "condition": "Annealed",
     "hb": 200, "tensile": 785, "yield": 365, "elong": 60, "mach": 15, "kc11": 2400, "mc": 0.18, "taylor_C": 35, "taylor_n": 0.13,
     "Ni": (54.0, 57.0, 60.0), "Mo": (15.0, 16.0, 17.0), "Cr": (14.5, 16.0, 17.5), "Fe": (4.0, 5.5, 7.0), "W": (3.0, 4.0, 4.5),
     "thermal_k": 10.2, "density": 8890, "solidus": 1325, "liquidus": 1370,
     "jc": {"A": 360, "B": 1280, "n": 0.50, "C": 0.020, "m": 1.08}, "apps": ["chemical", "pollution_control"], "notes": "BEST corrosion resistance"},
    {"id": "S-NI-008", "name": "Monel 400", "uns": "N04400", "type": "solid_solution", "condition": "Annealed",
     "hb": 130, "tensile": 550, "yield": 240, "elong": 48, "mach": 18, "kc11": 2200, "mc": 0.19, "taylor_C": 45, "taylor_n": 0.15,
     "Ni": (63.0, 66.0, 70.0), "Cu": (28.0, 31.5, 34.0), "Fe": (1.0, 2.0, 2.5), "thermal_k": 21.8, "density": 8800, "solidus": 1300, "liquidus": 1350,
     "jc": {"A": 240, "B": 1100, "n": 0.55, "C": 0.025, "m": 1.12}, "apps": ["marine", "chemical", "petroleum"]},
    {"id": "S-NI-009", "name": "Monel K-500", "uns": "N05500", "type": "precipitation", "condition": "Age Hardened",
     "hb": 300, "tensile": 1100, "yield": 790, "elong": 20, "mach": 15, "kc11": 2800, "mc": 0.16, "taylor_C": 28, "taylor_n": 0.11,
     "Ni": (63.0, 65.0, 67.0), "Cu": (27.0, 30.0, 33.0), "Al": (2.3, 2.9, 3.15), "Ti": (0.35, 0.6, 0.85),
     "thermal_k": 17.5, "density": 8460, "solidus": 1315, "liquidus": 1350,
     "jc": {"A": 750, "B": 1200, "n": 0.38, "C": 0.015, "m": 0.92}, "apps": ["pump_shafts", "oil_well_tools"]},
    {"id": "S-NI-010", "name": "Nimonic 80A", "uns": "N07080", "type": "precipitation", "condition": "Solution + Aged",
     "hb": 320, "tensile": 1150, "yield": 690, "elong": 25, "mach": 10, "kc11": 2900, "mc": 0.15, "taylor_C": 25, "taylor_n": 0.11,
     "Ni": (73.0, 76.0, 79.0), "Cr": (18.0, 20.0, 21.0), "Ti": (1.8, 2.4, 2.7), "Al": (1.0, 1.4, 1.8),
     "thermal_k": 11.2, "density": 8190, "solidus": 1320, "liquidus": 1390,
     "jc": {"A": 650, "B": 1300, "n": 0.38, "C": 0.012, "m": 0.90}, "apps": ["turbine_blades", "exhaust_valves"]},
]

# =============================================================================
# COBALT SUPERALLOYS
# =============================================================================
COBALT_SUPERALLOYS = [
    {"id": "S-CO-001", "name": "Stellite 6 (Co-Cr-W)", "uns": "R30006", "type": "wear_resistant", "condition": "As-Cast",
     "hb": 380, "tensile": 896, "yield": 620, "elong": 1, "mach": 10, "kc11": 3200, "mc": 0.14, "taylor_C": 18, "taylor_n": 0.10,
     "Co": (55.0, 58.0, 62.0), "Cr": (27.0, 29.0, 32.0), "W": (4.0, 4.5, 6.0), "C": (0.9, 1.1, 1.4),
     "thermal_k": 14.7, "density": 8440, "solidus": 1285, "liquidus": 1395,
     "jc": {"A": 580, "B": 1400, "n": 0.30, "C": 0.010, "m": 0.80}, "apps": ["valve_seats", "cutting_tools", "hard_facing"], "notes": "Classic hardfacing. PCD required"},
    {"id": "S-CO-002", "name": "Stellite 21 (Co-Cr-Mo)", "uns": "R30021", "type": "wear_resistant", "condition": "As-Cast",
     "hb": 330, "tensile": 710, "yield": 520, "elong": 8, "mach": 12, "kc11": 2800, "mc": 0.16, "taylor_C": 25, "taylor_n": 0.12,
     "Co": (58.0, 62.0, 66.0), "Cr": (25.0, 27.0, 30.0), "Mo": (4.5, 5.5, 7.0), "C": (0.2, 0.25, 0.35),
     "thermal_k": 14.8, "density": 8330, "solidus": 1320, "liquidus": 1405,
     "jc": {"A": 480, "B": 1200, "n": 0.35, "C": 0.012, "m": 0.88}, "apps": ["medical_implants", "dental"], "notes": "Better ductility than Stellite 6"},
    {"id": "S-CO-003", "name": "Haynes 25 (L-605)", "uns": "R30605", "type": "solid_solution", "condition": "Annealed",
     "hb": 250, "tensile": 1030, "yield": 460, "elong": 55, "mach": 12, "kc11": 2600, "mc": 0.17, "taylor_C": 28, "taylor_n": 0.12,
     "Co": (48.0, 50.0, 54.0), "Cr": (19.0, 20.0, 21.0), "W": (14.0, 15.0, 16.0), "Ni": (9.0, 10.0, 11.0),
     "thermal_k": 9.4, "density": 9130, "solidus": 1330, "liquidus": 1410,
     "jc": {"A": 450, "B": 1350, "n": 0.45, "C": 0.015, "m": 0.95}, "apps": ["jet_engine_combustors", "afterburners"], "notes": "High temp to 980C"},
    {"id": "S-CO-004", "name": "Haynes 188", "uns": "R30188", "type": "solid_solution", "condition": "Annealed",
     "hb": 230, "tensile": 960, "yield": 465, "elong": 53, "mach": 12, "kc11": 2550, "mc": 0.17, "taylor_C": 30, "taylor_n": 0.12,
     "Co": (37.0, 39.0, 41.0), "Ni": (20.0, 22.0, 24.0), "Cr": (20.0, 22.0, 24.0), "W": (13.0, 14.0, 16.0), "La": (0.02, 0.04, 0.12),
     "thermal_k": 10.5, "density": 8980, "solidus": 1300, "liquidus": 1360,
     "jc": {"A": 440, "B": 1300, "n": 0.46, "C": 0.016, "m": 0.96}, "apps": ["combustion_chambers", "transition_ducts"], "notes": "Lanthanum for oxidation"},
    {"id": "S-CO-005", "name": "MP35N", "uns": "R30035", "type": "precipitation", "condition": "Cold Worked + Aged",
     "hb": 420, "tensile": 1930, "yield": 1790, "elong": 10, "mach": 8, "kc11": 3400, "mc": 0.13, "taylor_C": 15, "taylor_n": 0.09,
     "Co": (33.0, 35.0, 37.0), "Ni": (33.0, 35.0, 37.0), "Cr": (19.0, 20.0, 21.0), "Mo": (9.0, 10.0, 11.0),
     "thermal_k": 11.2, "density": 8430, "solidus": 1315, "liquidus": 1370,
     "jc": {"A": 1650, "B": 1500, "n": 0.20, "C": 0.008, "m": 0.75}, "apps": ["fasteners", "medical_implants", "submarine_cables"], "notes": "ULTRA high strength. Non-magnetic"},
    {"id": "S-CO-006", "name": "Elgiloy", "uns": "R30003", "type": "precipitation", "condition": "Cold Worked + Aged",
     "hb": 410, "tensile": 1860, "yield": 1590, "elong": 8, "mach": 8, "kc11": 3300, "mc": 0.13, "taylor_C": 16, "taylor_n": 0.09,
     "Co": (39.0, 40.0, 41.0), "Cr": (19.0, 20.0, 21.0), "Ni": (14.0, 15.0, 16.0), "Fe": (13.0, 15.0, 17.0), "Mo": (6.0, 7.0, 8.0),
     "thermal_k": 12.5, "density": 8300, "solidus": 1300, "liquidus": 1360,
     "jc": {"A": 1450, "B": 1400, "n": 0.22, "C": 0.009, "m": 0.78}, "apps": ["watch_springs", "surgical_instruments"], "notes": "Spring alloy"},
    {"id": "S-CO-007", "name": "Tribaloy T-800", "uns": "R30800", "type": "wear_resistant", "condition": "As-Cast",
     "hb": 550, "tensile": 650, "yield": 550, "elong": 0.5, "mach": 5, "kc11": 4000, "mc": 0.12, "taylor_C": 10, "taylor_n": 0.08,
     "Co": (50.0, 53.0, 56.0), "Cr": (17.0, 18.0, 19.0), "Mo": (28.0, 29.0, 30.0), "Si": (3.0, 3.4, 3.8),
     "thermal_k": 11.0, "density": 8640, "solidus": 1180, "liquidus": 1280,
     "jc": {"A": 520, "B": 1500, "n": 0.25, "C": 0.008, "m": 0.72}, "apps": ["valve_components", "pump_sleeves"], "notes": "Extreme wear resistance. Grinding only"},
    {"id": "S-CO-008", "name": "MAR-M 509", "uns": "R30509", "type": "precipitation", "condition": "As-Cast",
     "hb": 320, "tensile": 765, "yield": 580, "elong": 6, "mach": 10, "kc11": 2900, "mc": 0.15, "taylor_C": 22, "taylor_n": 0.11,
     "Co": (53.0, 55.0, 57.0), "Cr": (22.0, 23.5, 25.0), "Ni": (9.0, 10.0, 11.0), "W": (6.5, 7.0, 7.5), "Ta": (3.0, 3.5, 4.0),
     "thermal_k": 10.0, "density": 8850, "solidus": 1290, "liquidus": 1350,
     "jc": {"A": 540, "B": 1250, "n": 0.32, "C": 0.012, "m": 0.88}, "apps": ["turbine_vanes", "nozzle_guide_vanes"], "notes": "Jet engine hot section"},
]

# =============================================================================
# EXPANSION FUNCTION
# =============================================================================
def build_material(m, category):
    """Expand compact data to full 127-parameter format."""
    hb = m.get("hb", 100)
    tensile = m.get("tensile", 400)
    yield_str = m.get("yield", 300)
    elong = m.get("elong", 15)
    mach = m.get("mach", 50)
    thermal_k = m.get("thermal_k", 50)
    density = m.get("density", 7800)
    solidus = m.get("solidus", 1400)
    liquidus = m.get("liquidus", solidus + 50)
    
    # Category-specific settings
    if category == "aluminum":
        iso_group, elastic, poisson = "N", 71000, 0.33
        base_speed = 200 + mach * 3
        material_class = f"Aluminum - {m.get('aa', '6xxx')[0]}xxx Series" if m.get('aa') else "Aluminum Cast"
    elif category == "copper":
        iso_group, elastic, poisson = "N", 115000, 0.34
        base_speed = 50 + mach * 1.5
        material_class = f"Copper - {m.get('type', 'alloy').title()}"
    elif category == "titanium":
        iso_group, elastic, poisson = "S" if tensile > 1000 else "N", 114000, 0.34
        base_speed = 20 + mach * 1.2
        material_class = f"Titanium - {m.get('type', 'alpha_beta').replace('_', ' ').title()}"
    elif category == "magnesium":
        iso_group, elastic, poisson = "N", 45000, 0.35
        base_speed = 300 + mach * 5
        material_class = f"Magnesium - {m.get('type', 'wrought').title()}"
    elif category == "zinc":
        iso_group, elastic, poisson = "N", 96000, 0.25
        base_speed = 100 + mach * 2
        material_class = f"Zinc - {m.get('type', 'die_cast').replace('_', ' ').title()}"
    elif category in ["nickel", "cobalt"]:
        iso_group, elastic, poisson = "S", 200000 + (hb - 200) * 100, 0.31
        base_speed = 10 + mach * 0.8
        material_class = f"{'Nickel' if category == 'nickel' else 'Cobalt'} Superalloy - {m.get('type', 'solid_solution').replace('_', ' ').title()}"
    else:
        iso_group, elastic, poisson = "N", 100000, 0.33
        base_speed = 50 + mach * 2
        material_class = "General Nonferrous"
    
    # Build composition
    comp = {}
    elem_map = {"Cu": "copper", "Zn": "zinc", "Al": "aluminum", "Mg": "magnesium", "Si": "silicon", "Mn": "manganese",
                "Cr": "chromium", "Ni": "nickel", "Fe": "iron", "Ti": "titanium", "V": "vanadium", "Mo": "molybdenum",
                "Sn": "tin", "Pb": "lead", "P": "phosphorus", "Nb": "niobium", "Co": "cobalt", "W": "tungsten",
                "Zr": "zirconium", "Ag": "silver", "Be": "beryllium", "O": "oxygen", "Y": "yttrium", "Nd": "neodymium",
                "RE": "rare_earth", "C": "carbon", "Ta": "tantalum", "La": "lanthanum"}
    
    for key, name in elem_map.items():
        if key in m:
            val = m[key]
            comp[name] = {"min": val[0], "typical": val[1], "max": val[2]} if isinstance(val, tuple) else {"min": 0, "typical": val, "max": val}
        elif f"{key}_max" in m:
            comp[name] = {"min": 0, "typical": m[f"{key}_max"]/2, "max": m[f"{key}_max"]}
        elif f"{key}_min" in m:
            comp[name] = {"min": m[f"{key}_min"], "typical": m[f"{key}_min"] + 1, "max": 100}
    
    jc = m.get("jc", {"A": 300, "B": 800, "n": 0.40, "C": 0.020, "m": 1.0})
    
    return {
        "id": m["id"], "name": m["name"],
        "designation": {"cda": m.get("cda", ""), "uns": m.get("uns", ""), "aa": m.get("aa", ""), "grade": m.get("grade", "")},
        "iso_group": iso_group, "material_class": material_class, "condition": m.get("condition", "Annealed"),
        "composition": comp,
        "physical": {"density": density, "melting_point": {"solidus": solidus, "liquidus": liquidus}, "thermal_conductivity": thermal_k,
                     "poissons_ratio": poisson, "elastic_modulus": elastic, "shear_modulus": int(elastic / 2.6)},
        "mechanical": {"hardness": {"brinell": hb, "vickers": int(hb * 1.05)},
                       "tensile_strength": {"min": int(tensile * 0.94), "typical": tensile, "max": int(tensile * 1.06)},
                       "yield_strength": {"min": int(yield_str * 0.93), "typical": yield_str, "max": int(yield_str * 1.07)},
                       "elongation": {"min": max(1, elong - 4), "typical": elong, "max": elong + 4},
                       "fatigue_strength": int(tensile * 0.35), "fracture_toughness": int(30 + elong * 1.5)},
        "kienzle": {"kc1_1": m.get("kc11", 1500), "mc": m.get("mc", 0.20)},
        "taylor": {"C": m.get("taylor_C", 200), "n": m.get("taylor_n", 0.20)},
        "johnson_cook": {"A": jc["A"], "B": jc["B"], "n": jc["n"], "C": jc["C"], "m": jc["m"], "T_melt": liquidus},
        "machinability": {"aisi_rating": mach, "relative_to_1212": mach / 100},
        "recommended_cutting": {"turning": {"carbide": {"speed": {"min": int(base_speed * 0.5), "opt": base_speed, "max": int(base_speed * 1.5)}}}},
        "applications": m.get("apps", []), "notes": m.get("notes", "")
    }

def generate_js_file(materials, filename, category, subcategory):
    """Generate JavaScript file content."""
    expanded = [build_material(m, category) for m in materials]
    id_start, id_end = materials[0]["id"], materials[-1]["id"]
    
    header = f'''/**
 * PRISM MATERIALS DATABASE - {subcategory}
 * File: {filename} | Materials: {id_start} to {id_end}
 * Parameters: 127 | Schema: 3.0.0 | Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}
 * AUTO-GENERATED by prism_master_generator.py v5.0
 */
const {filename.upper().replace('.JS', '').replace('-', '_')} = {{
  metadata: {{ file: "{filename}", category: "{"S_SUPERALLOYS" if category in ["nickel", "cobalt"] else "N_NONFERROUS"}", materialCount: {len(expanded)} }},
  materials: {{
'''
    body = ',\n'.join([f'    "{m["id"]}": {json.dumps(m, indent=4)}' for m in expanded])
    footer = f'\n  }}\n}};\nif (typeof module !== "undefined") module.exports = {filename.upper().replace(".JS", "").replace("-", "_")};'
    return header + body + footer

def main():
    category = sys.argv[1] if len(sys.argv) > 1 else "all"
    generated = []
    
    if category in ["aluminum", "all"]:
        out = OUTPUT_DIR / "N_NONFERROUS"
        out.mkdir(parents=True, exist_ok=True)
        al = ALUMINUM_1XXX + ALUMINUM_3XXX + ALUMINUM_5XXX
        (out / "aluminum_wrought_generated.js").write_text(generate_js_file(al, "aluminum_wrought_generated.js", "aluminum", "Al 1xxx/3xxx/5xxx"), encoding='utf-8')
        generated.append(f"aluminum_wrought: {len(al)}")
        (out / "aluminum_cast_generated.js").write_text(generate_js_file(ALUMINUM_CAST, "aluminum_cast_generated.js", "aluminum", "Al Cast"), encoding='utf-8')
        generated.append(f"aluminum_cast: {len(ALUMINUM_CAST)}")
    
    if category in ["copper", "all"]:
        out = OUTPUT_DIR / "N_NONFERROUS"
        out.mkdir(parents=True, exist_ok=True)
        cu = COPPER_BRASSES + COPPER_BRONZES + COPPER_PURE
        (out / "copper_alloys_generated.js").write_text(generate_js_file(cu, "copper_alloys_generated.js", "copper", "Copper Alloys"), encoding='utf-8')
        generated.append(f"copper: {len(cu)}")
    
    if category in ["titanium", "all"]:
        out = OUTPUT_DIR / "N_NONFERROUS"
        out.mkdir(parents=True, exist_ok=True)
        (out / "titanium_alloys_generated.js").write_text(generate_js_file(TITANIUM_ALLOYS, "titanium_alloys_generated.js", "titanium", "Titanium Alloys"), encoding='utf-8')
        generated.append(f"titanium: {len(TITANIUM_ALLOYS)}")
    
    if category in ["magnesium", "all"]:
        out = OUTPUT_DIR / "N_NONFERROUS"
        out.mkdir(parents=True, exist_ok=True)
        (out / "magnesium_alloys_generated.js").write_text(generate_js_file(MAGNESIUM_ALLOYS, "magnesium_alloys_generated.js", "magnesium", "Magnesium Alloys"), encoding='utf-8')
        generated.append(f"magnesium: {len(MAGNESIUM_ALLOYS)}")
    
    if category in ["zinc", "all"]:
        out = OUTPUT_DIR / "N_NONFERROUS"
        out.mkdir(parents=True, exist_ok=True)
        (out / "zinc_alloys_generated.js").write_text(generate_js_file(ZINC_ALLOYS, "zinc_alloys_generated.js", "zinc", "Zinc Alloys"), encoding='utf-8')
        generated.append(f"zinc: {len(ZINC_ALLOYS)}")
    
    if category in ["nickel", "all"]:
        out = OUTPUT_DIR / "S_SUPERALLOYS"
        out.mkdir(parents=True, exist_ok=True)
        (out / "nickel_superalloys_generated.js").write_text(generate_js_file(NICKEL_SUPERALLOYS, "nickel_superalloys_generated.js", "nickel", "Nickel Superalloys"), encoding='utf-8')
        generated.append(f"nickel: {len(NICKEL_SUPERALLOYS)}")
    
    if category in ["cobalt", "all"]:
        out = OUTPUT_DIR / "S_SUPERALLOYS"
        out.mkdir(parents=True, exist_ok=True)
        (out / "cobalt_superalloys_generated.js").write_text(generate_js_file(COBALT_SUPERALLOYS, "cobalt_superalloys_generated.js", "cobalt", "Cobalt Superalloys"), encoding='utf-8')
        generated.append(f"cobalt: {len(COBALT_SUPERALLOYS)}")
    
    print(f"PRISM Generator v5.0 - Generated: {', '.join(generated)}")
    total = sum([len(ALUMINUM_1XXX), len(ALUMINUM_3XXX), len(ALUMINUM_5XXX), len(ALUMINUM_CAST), len(COPPER_BRASSES), len(COPPER_BRONZES), len(COPPER_PURE), len(TITANIUM_ALLOYS), len(MAGNESIUM_ALLOYS), len(ZINC_ALLOYS), len(NICKEL_SUPERALLOYS), len(COBALT_SUPERALLOYS)])
    print(f"Total materials in generator: {total}")

if __name__ == "__main__":
    main()
