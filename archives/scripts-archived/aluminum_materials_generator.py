#!/usr/bin/env python3
"""
PRISM Aluminum Materials Generator v1.0
=======================================
Batch generator for aluminum alloy materials.
Outputs 127-parameter schema JavaScript files.

Usage:
    python aluminum_materials_generator.py [series]
    series: 1xxx, 2xxx, 3xxx, 5xxx, 6xxx, 7xxx, cast, all

Example:
    python aluminum_materials_generator.py 7xxx
"""

import json
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path(r"C:\\PRISM\EXTRACTED\materials\N_NONFERROUS")

# =============================================================================
# ALUMINUM ALLOY COMPACT DATA
# Each entry: {id, aa, name, temper, condition, hb, tensile, yield, elong, 
#             mach_rating, kc11, mc, taylor_C, taylor_n, composition, thermal_k,
#             density, melting_solidus, applications, notes}
# =============================================================================

ALUMINUM_7XXX = [
    # 7xxx Series - Al-Zn-Mg(-Cu) - Highest Strength
    {"id": "N-AL-051", "aa": "7075", "name": "7075-O Annealed", "uns": "A97075", "din": "3.4365",
     "temper": "O", "condition": "Annealed",
     "hb": 60, "tensile": 230, "yield": 105, "elong": 17,
     "mach": 70, "kc11": 520, "mc": 0.26, "taylor_C": 950, "taylor_n": 0.36,
     "Zn": (5.1, 5.6, 6.1), "Mg": (2.1, 2.5, 2.9), "Cu": (1.2, 1.6, 2.0), "Cr": (0.18, 0.23, 0.28),
     "thermal_k": 173, "density": 2810, "solidus": 477, "scc": "resistant",
     "jc": {"A": 130, "B": 360, "n": 0.44, "C": 0.020, "m": 1.10},
     "apps": ["forming_stock", "rivet_stock", "forging_billet"],
     "notes": "Highest strength Al series in annealed condition"},
    
    {"id": "N-AL-052", "aa": "7075", "name": "7075-T6 Peak Aged", "uns": "A97075", "din": "3.4365",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 150, "tensile": 572, "yield": 503, "elong": 11,
     "mach": 125, "kc11": 850, "mc": 0.23, "taylor_C": 720, "taylor_n": 0.32,
     "Zn": (5.1, 5.6, 6.1), "Mg": (2.1, 2.5, 2.9), "Cu": (1.2, 1.6, 2.0), "Cr": (0.18, 0.23, 0.28),
     "thermal_k": 130, "density": 2810, "solidus": 477, "scc": "highly_susceptible",
     "jc": {"A": 420, "B": 510, "n": 0.27, "C": 0.011, "m": 0.85},
     "apps": ["aircraft_structures", "aerospace_fittings", "gears", "shafts"],
     "notes": "HIGHEST strength common aluminum. T6 susceptible to SCC"},

    {"id": "N-AL-053", "aa": "7075", "name": "7075-T651 Stress Relieved", "uns": "A97075", "din": "3.4365",
     "temper": "T651", "condition": "Solution + Stretch + Artificial Age",
     "hb": 150, "tensile": 572, "yield": 503, "elong": 9,
     "mach": 130, "kc11": 850, "mc": 0.23, "taylor_C": 720, "taylor_n": 0.32,
     "Zn": (5.1, 5.6, 6.1), "Mg": (2.1, 2.5, 2.9), "Cu": (1.2, 1.6, 2.0), "Cr": (0.18, 0.23, 0.28),
     "thermal_k": 130, "density": 2810, "solidus": 477, "scc": "highly_susceptible",
     "jc": {"A": 420, "B": 510, "n": 0.27, "C": 0.011, "m": 0.85},
     "apps": ["aircraft_plate", "precision_machined_parts", "mold_plates"],
     "notes": "Stress-relieved plate. Minimal machining distortion"},

    {"id": "N-AL-054", "aa": "7075", "name": "7075-T73 SCC Resistant", "uns": "A97075", "din": "3.4365",
     "temper": "T73", "condition": "Solution + Over-age for SCC",
     "hb": 135, "tensile": 503, "yield": 434, "elong": 13,
     "mach": 115, "kc11": 780, "mc": 0.24, "taylor_C": 760, "taylor_n": 0.33,
     "Zn": (5.1, 5.6, 6.1), "Mg": (2.1, 2.5, 2.9), "Cu": (1.2, 1.6, 2.0), "Cr": (0.18, 0.23, 0.28),
     "thermal_k": 155, "density": 2810, "solidus": 477, "scc": "highly_resistant",
     "jc": {"A": 380, "B": 480, "n": 0.29, "C": 0.012, "m": 0.88},
     "apps": ["aircraft_fittings", "landing_gear_components"],
     "notes": "OVERAGED for SCC resistance. 10-15% lower strength than T6"},

    {"id": "N-AL-055", "aa": "7075", "name": "7075-T76 Exfoliation Resistant", "uns": "A97075", "din": "3.4365",
     "temper": "T76", "condition": "Solution + Over-age for Exfoliation",
     "hb": 140, "tensile": 530, "yield": 455, "elong": 12,
     "mach": 120, "kc11": 810, "mc": 0.23, "taylor_C": 740, "taylor_n": 0.33,
     "Zn": (5.1, 5.6, 6.1), "Mg": (2.1, 2.5, 2.9), "Cu": (1.2, 1.6, 2.0), "Cr": (0.18, 0.23, 0.28),
     "thermal_k": 142, "density": 2810, "solidus": 477, "scc": "resistant", "exfoliation": "highly_resistant",
     "jc": {"A": 400, "B": 490, "n": 0.28, "C": 0.012, "m": 0.87},
     "apps": ["aircraft_wing_skins", "fuselage_skins", "marine_aerospace"],
     "notes": "T76 = exfoliation resistant. Between T6 and T73"},

    {"id": "N-AL-056", "aa": "7050", "name": "7050-T7451 Aerospace Plate", "uns": "A97050", "din": "3.4144",
     "temper": "T7451", "condition": "Solution + Stretch + Over-age",
     "hb": 145, "tensile": 552, "yield": 490, "elong": 12,
     "mach": 120, "kc11": 830, "mc": 0.23, "taylor_C": 740, "taylor_n": 0.33,
     "Zn": (5.7, 6.2, 6.7), "Mg": (1.9, 2.25, 2.6), "Cu": (2.0, 2.3, 2.6), "Zr": (0.08, 0.12, 0.15),
     "thermal_k": 157, "density": 2830, "solidus": 488, "scc": "highly_resistant",
     "jc": {"A": 410, "B": 495, "n": 0.28, "C": 0.012, "m": 0.86},
     "apps": ["aircraft_wing_structures", "fuselage_frames", "bulkheads"],
     "notes": "7050 = higher Cu than 7075. F-15, F-18, 747"},

    {"id": "N-AL-057", "aa": "7050", "name": "7050-T7651 Higher Strength", "uns": "A97050", "din": "3.4144",
     "temper": "T7651", "condition": "Solution + Stretch + Alternate Age",
     "hb": 150, "tensile": 570, "yield": 510, "elong": 11,
     "mach": 125, "kc11": 850, "mc": 0.23, "taylor_C": 730, "taylor_n": 0.32,
     "Zn": (5.7, 6.2, 6.7), "Mg": (1.9, 2.25, 2.6), "Cu": (2.0, 2.3, 2.6), "Zr": (0.08, 0.12, 0.15),
     "thermal_k": 147, "density": 2830, "solidus": 488, "scc": "resistant",
     "jc": {"A": 430, "B": 505, "n": 0.27, "C": 0.011, "m": 0.85},
     "apps": ["aircraft_wing_spars", "heavy_section_machining", "military_aircraft"],
     "notes": "T7651 = higher strength than T7451 with moderate SCC resistance"},

    {"id": "N-AL-058", "aa": "7055", "name": "7055-T7751 Highest Strength", "uns": "A97055", "din": "3.4055",
     "temper": "T7751", "condition": "Solution + Stretch + RRA",
     "hb": 165, "tensile": 634, "yield": 593, "elong": 9,
     "mach": 130, "kc11": 920, "mc": 0.22, "taylor_C": 680, "taylor_n": 0.31,
     "Zn": (7.6, 8.0, 8.4), "Mg": (1.8, 2.05, 2.3), "Cu": (2.0, 2.3, 2.6), "Zr": (0.08, 0.12, 0.25),
     "thermal_k": 155, "density": 2850, "solidus": 477, "scc": "resistant",
     "jc": {"A": 510, "B": 545, "n": 0.24, "C": 0.010, "m": 0.82},
     "apps": ["boeing_777_upper_wing_skins", "military_aircraft"],
     "notes": "HIGHEST strength production aluminum (634 MPa)"},

    {"id": "N-AL-059", "aa": "7475", "name": "7475-T7351 High Toughness", "uns": "A97475", "din": "3.4475",
     "temper": "T7351", "condition": "Solution + Stretch + Over-age",
     "hb": 140, "tensile": 503, "yield": 441, "elong": 14,
     "mach": 110, "kc11": 780, "mc": 0.24, "taylor_C": 760, "taylor_n": 0.33,
     "Zn": (5.2, 5.7, 6.2), "Mg": (1.9, 2.25, 2.6), "Cu": (1.2, 1.55, 1.9), "Cr": (0.18, 0.22, 0.25),
     "Fe_max": 0.12, "Si_max": 0.10,
     "thermal_k": 163, "density": 2810, "solidus": 477, "scc": "highly_resistant", "fracture_toughness": 42,
     "jc": {"A": 390, "B": 480, "n": 0.30, "C": 0.012, "m": 0.88},
     "apps": ["fuselage_lower_skins", "wing_lower_skins", "damage_tolerant_designs"],
     "notes": "HIGHEST TOUGHNESS 7xxx. Low Fe/Si = superior damage tolerance"},

    {"id": "N-AL-060", "aa": "7178", "name": "7178-T6 High Strength", "uns": "A97178", "din": "3.4178",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 160, "tensile": 607, "yield": 538, "elong": 8,
     "mach": 130, "kc11": 900, "mc": 0.22, "taylor_C": 680, "taylor_n": 0.31,
     "Zn": (6.3, 6.8, 7.3), "Mg": (2.4, 2.75, 3.1), "Cu": (1.6, 2.0, 2.4), "Cr": (0.18, 0.23, 0.28),
     "thermal_k": 125, "density": 2830, "solidus": 477, "scc": "highly_susceptible",
     "jc": {"A": 480, "B": 530, "n": 0.25, "C": 0.010, "m": 0.83},
     "apps": ["highly_stressed_aircraft_parts", "wing_compression_members"],
     "notes": "Higher Zn/Mg than 7075 = higher strength but lower toughness"},

    {"id": "N-AL-061", "aa": "7039", "name": "7039-T64 Military/Marine", "uns": "A97039", "din": "3.4039",
     "temper": "T64", "condition": "Solution + Artificial Age",
     "hb": 105, "tensile": 415, "yield": 340, "elong": 14,
     "mach": 95, "kc11": 700, "mc": 0.24, "taylor_C": 800, "taylor_n": 0.34,
     "Zn": (3.5, 4.0, 4.5), "Mg": (2.3, 2.8, 3.3), "Mn": (0.10, 0.25, 0.40), "Cr": (0.15, 0.20, 0.25),
     "Cu_max": 0.10,  # No copper = weldable
     "thermal_k": 145, "density": 2740, "solidus": 538, "scc": "resistant",
     "jc": {"A": 300, "B": 440, "n": 0.32, "C": 0.014, "m": 0.92},
     "apps": ["military_vehicles", "pontoon_bridges", "marine_structures"],
     "notes": "WELDABLE 7xxx! No Cu = good weldability. M113 APC armor"},

    {"id": "N-AL-062", "aa": "7020", "name": "7020-T6 Weldable Structural", "uns": "A97020", "din": "3.4335",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 115, "tensile": 385, "yield": 325, "elong": 14,
     "mach": 100, "kc11": 700, "mc": 0.24, "taylor_C": 820, "taylor_n": 0.35,
     "Zn": (4.0, 4.5, 5.0), "Mg": (1.0, 1.2, 1.4), "Mn": (0.05, 0.28, 0.50), "Cr": (0.10, 0.23, 0.35),
     "Zr": (0.08, 0.14, 0.20), "Cu_max": 0.20,
     "thermal_k": 155, "density": 2780, "solidus": 532, "scc": "resistant",
     "jc": {"A": 290, "B": 420, "n": 0.33, "C": 0.014, "m": 0.92},
     "apps": ["welded_structures", "railway_vehicles", "truck_bodies", "trailers"],
     "notes": "Natural aging after welding restores ~80% weld zone strength"},

    {"id": "N-AL-063", "aa": "7085", "name": "7085-T7651 Ultra-Thick Plate", "uns": "A97085", "din": "3.4085",
     "temper": "T7651", "condition": "Solution + Stretch + Over-age",
     "hb": 145, "tensile": 550, "yield": 496, "elong": 11,
     "mach": 118, "kc11": 820, "mc": 0.23, "taylor_C": 740, "taylor_n": 0.33,
     "Zn": (7.0, 7.5, 8.0), "Mg": (1.2, 1.5, 1.8), "Cu": (1.3, 1.65, 2.0), "Zr": (0.08, 0.12, 0.15),
     "Fe_max": 0.08, "Si_max": 0.06,  # Ultra-low impurities
     "thermal_k": 157, "density": 2850, "solidus": 477, "scc": "highly_resistant", "fracture_toughness": 35,
     "jc": {"A": 425, "B": 495, "n": 0.27, "C": 0.011, "m": 0.85},
     "apps": ["wing_box_ribs", "bulkheads", "A380_wing_components"],
     "notes": "Ultra-low Fe/Si for thick section properties. Up to 300mm thick"},

    {"id": "N-AL-064", "aa": "7150", "name": "7150-T7751 High Strength/Toughness", "uns": "A97150", "din": "3.4150",
     "temper": "T7751", "condition": "Solution + Stretch + RRA",
     "hb": 158, "tensile": 607, "yield": 558, "elong": 10,
     "mach": 128, "kc11": 880, "mc": 0.22, "taylor_C": 700, "taylor_n": 0.31,
     "Zn": (5.9, 6.4, 6.9), "Mg": (2.0, 2.35, 2.7), "Cu": (1.9, 2.2, 2.5), "Zr": (0.08, 0.12, 0.15),
     "thermal_k": 155, "density": 2840, "solidus": 477, "scc": "resistant", "fracture_toughness": 30,
     "jc": {"A": 470, "B": 525, "n": 0.25, "C": 0.010, "m": 0.83},
     "apps": ["wing_spar_caps", "fuselage_stringers", "F-22_components"],
     "notes": "Zr instead of Cr. Better thick-section properties than 7050"},

    {"id": "N-AL-065", "aa": "7175", "name": "7175-T7351 High Purity Forging", "uns": "A97175", "din": "3.4175",
     "temper": "T7351", "condition": "Solution + Stretch + Over-age",
     "hb": 142, "tensile": 524, "yield": 462, "elong": 13,
     "mach": 112, "kc11": 800, "mc": 0.24, "taylor_C": 750, "taylor_n": 0.33,
     "Zn": (5.1, 5.6, 6.1), "Mg": (2.1, 2.5, 2.9), "Cu": (1.2, 1.6, 2.0), "Cr": (0.18, 0.23, 0.28),
     "Fe_max": 0.20, "Si_max": 0.15,  # Controlled impurities
     "thermal_k": 157, "density": 2800, "solidus": 477, "scc": "highly_resistant", "fracture_toughness": 38,
     "jc": {"A": 400, "B": 490, "n": 0.29, "C": 0.012, "m": 0.87},
     "apps": ["aircraft_forgings", "landing_gear", "structural_forgings"],
     "notes": "HIGH PURITY 7075 for forgings. Lower Fe/Si = better toughness"},
]

ALUMINUM_6XXX = [
    # 6xxx Series - Al-Mg-Si - Structural/Extrusion
    {"id": "N-AL-031", "aa": "6061", "name": "6061-O Annealed", "uns": "A96061", "din": "3.3211",
     "temper": "O", "condition": "Annealed",
     "hb": 30, "tensile": 125, "yield": 55, "elong": 25,
     "mach": 55, "kc11": 450, "mc": 0.28, "taylor_C": 1050, "taylor_n": 0.38,
     "Mg": (0.8, 1.0, 1.2), "Si": (0.4, 0.6, 0.8), "Cu": (0.15, 0.28, 0.40), "Cr": (0.04, 0.20, 0.35),
     "thermal_k": 180, "density": 2700, "solidus": 582, "scc": "resistant",
     "jc": {"A": 60, "B": 300, "n": 0.50, "C": 0.025, "m": 1.20},
     "apps": ["forming_stock", "welding_base"],
     "notes": "Very soft/gummy. High BUE tendency"},

    {"id": "N-AL-032", "aa": "6061", "name": "6061-T4 Solution Treated", "uns": "A96061", "din": "3.3211",
     "temper": "T4", "condition": "Solution + Natural Age",
     "hb": 65, "tensile": 240, "yield": 145, "elong": 22,
     "mach": 75, "kc11": 580, "mc": 0.26, "taylor_C": 920, "taylor_n": 0.36,
     "Mg": (0.8, 1.0, 1.2), "Si": (0.4, 0.6, 0.8), "Cu": (0.15, 0.28, 0.40), "Cr": (0.04, 0.20, 0.35),
     "thermal_k": 167, "density": 2700, "solidus": 582, "scc": "resistant",
     "jc": {"A": 145, "B": 400, "n": 0.40, "C": 0.020, "m": 1.10},
     "apps": ["general_structures", "formable_parts"],
     "notes": "Intermediate strength. Good formability"},

    {"id": "N-AL-033", "aa": "6061", "name": "6061-T6 Peak Aged", "uns": "A96061", "din": "3.3211",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 95, "tensile": 310, "yield": 276, "elong": 12,
     "mach": 100, "kc11": 680, "mc": 0.25, "taylor_C": 850, "taylor_n": 0.35,
     "Mg": (0.8, 1.0, 1.2), "Si": (0.4, 0.6, 0.8), "Cu": (0.15, 0.28, 0.40), "Cr": (0.04, 0.20, 0.35),
     "thermal_k": 167, "density": 2700, "solidus": 582, "scc": "resistant",
     "jc": {"A": 250, "B": 430, "n": 0.34, "C": 0.015, "m": 1.00},
     "apps": ["structural_components", "truck_frames", "marine", "bridges"],
     "notes": "WORKHORSE aluminum. Most used heat-treatable Al globally"},

    {"id": "N-AL-034", "aa": "6061", "name": "6061-T651 Stress Relieved", "uns": "A96061", "din": "3.3211",
     "temper": "T651", "condition": "Solution + Stretch + Artificial Age",
     "hb": 95, "tensile": 310, "yield": 276, "elong": 10,
     "mach": 105, "kc11": 680, "mc": 0.25, "taylor_C": 850, "taylor_n": 0.35,
     "Mg": (0.8, 1.0, 1.2), "Si": (0.4, 0.6, 0.8), "Cu": (0.15, 0.28, 0.40), "Cr": (0.04, 0.20, 0.35),
     "thermal_k": 167, "density": 2700, "solidus": 582, "scc": "resistant",
     "jc": {"A": 250, "B": 430, "n": 0.34, "C": 0.015, "m": 1.00},
     "apps": ["precision_plate", "jigs_fixtures", "mold_plates"],
     "notes": "Stress-relieved. Minimal machining distortion"},

    {"id": "N-AL-035", "aa": "6063", "name": "6063-T5 Architectural", "uns": "A96063", "din": "3.3206",
     "temper": "T5", "condition": "Cooled + Artificial Age",
     "hb": 60, "tensile": 190, "yield": 145, "elong": 12,
     "mach": 65, "kc11": 520, "mc": 0.27, "taylor_C": 980, "taylor_n": 0.37,
     "Mg": (0.45, 0.68, 0.90), "Si": (0.20, 0.40, 0.60),
     "thermal_k": 200, "density": 2690, "solidus": 615, "scc": "resistant",
     "jc": {"A": 100, "B": 350, "n": 0.45, "C": 0.022, "m": 1.15},
     "apps": ["architectural_extrusions", "window_frames", "furniture"],
     "notes": "Premier extrusion alloy. Excellent surface finish"},

    {"id": "N-AL-036", "aa": "6063", "name": "6063-T6 Peak Aged", "uns": "A96063", "din": "3.3206",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 73, "tensile": 245, "yield": 214, "elong": 12,
     "mach": 80, "kc11": 600, "mc": 0.26, "taylor_C": 900, "taylor_n": 0.36,
     "Mg": (0.45, 0.68, 0.90), "Si": (0.20, 0.40, 0.60),
     "thermal_k": 200, "density": 2690, "solidus": 615, "scc": "resistant",
     "jc": {"A": 180, "B": 390, "n": 0.38, "C": 0.018, "m": 1.05},
     "apps": ["heat_sinks", "structural_extrusions", "ladders"],
     "notes": "Higher strength than T5. Good thermal conductivity"},

    {"id": "N-AL-037", "aa": "6082", "name": "6082-T6 High Strength", "uns": "A96082", "din": "3.2315",
     "temper": "T6", "condition": "Solution + Artificial Age",
     "hb": 100, "tensile": 340, "yield": 310, "elong": 10,
     "mach": 95, "kc11": 720, "mc": 0.24, "taylor_C": 820, "taylor_n": 0.34,
     "Mg": (0.60, 1.0, 1.20), "Si": (0.70, 1.0, 1.30), "Mn": (0.40, 0.70, 1.0),
     "thermal_k": 170, "density": 2710, "solidus": 555, "scc": "resistant",
     "jc": {"A": 280, "B": 450, "n": 0.32, "C": 0.014, "m": 0.98},
     "apps": ["structural_european", "bridges", "cranes", "transport"],
     "notes": "Strongest 6xxx. European structural standard"},

    {"id": "N-AL-038", "aa": "6262", "name": "6262-T9 Free Machining", "uns": "A96262", "din": "3.3262",
     "temper": "T9", "condition": "Solution + Cold Work + Artificial Age",
     "hb": 120, "tensile": 400, "yield": 380, "elong": 10,
     "mach": 180, "kc11": 600, "mc": 0.26, "taylor_C": 1050, "taylor_n": 0.40,
     "Mg": (0.80, 1.0, 1.20), "Si": (0.40, 0.6, 0.80), "Cu": (0.15, 0.28, 0.40),
     "Pb": (0.40, 0.55, 0.70), "Bi": (0.40, 0.55, 0.70),  # Free-machining additives
     "thermal_k": 172, "density": 2720, "solidus": 582, "scc": "resistant",
     "jc": {"A": 320, "B": 420, "n": 0.30, "C": 0.012, "m": 0.95},
     "apps": ["screw_machine_products", "fittings", "valve_bodies"],
     "notes": "FREE-MACHINING 6xxx with Pb/Bi. Best 6xxx machining"},
]

# =============================================================================
# MATERIAL EXPANSION FUNCTION
# =============================================================================

def build_aluminum_material(m: dict) -> dict:
    """Expand compact data to full 127-parameter format."""
    
    # Extract base values
    aa = m.get("aa", "")
    hb = m.get("hb", 95)
    tensile = m.get("tensile", 310)
    yield_str = m.get("yield", 276)
    elong = m.get("elong", 12)
    mach = m.get("mach", 100)
    thermal_k = m.get("thermal_k", 167)
    density = m.get("density", 2700)
    solidus = m.get("solidus", 582)
    
    # Determine series-based characteristics
    series = int(aa[0]) if aa and aa[0].isdigit() else 6
    
    # Defaults by series
    if series == 7:
        liquidus = solidus + 158
        elastic = 71700 if hb > 140 else 71000
        scc_default = "susceptible"
        fracture = m.get("fracture_toughness", 24 + (200 - hb) * 0.1)
    elif series == 2:
        liquidus = solidus + 135
        elastic = 72400 if hb > 120 else 71000
        scc_default = "susceptible"
        fracture = m.get("fracture_toughness", 28)
    else:  # 6xxx
        liquidus = solidus + 70
        elastic = 69000
        scc_default = "resistant"
        fracture = m.get("fracture_toughness", 35)
    
    # Build composition
    comp = {"aluminum": {"min": 85.0, "max": 98.0, "typical": 91.0}}
    
    # Add elements from compact data
    element_map = {
        "Zn": "zinc", "Mg": "magnesium", "Cu": "copper", "Si": "silicon",
        "Mn": "manganese", "Cr": "chromium", "Zr": "zirconium", "Ti": "titanium",
        "Fe": "iron", "Pb": "lead", "Bi": "bismuth"
    }
    
    for key, elem in element_map.items():
        if key in m:
            val = m[key]
            if isinstance(val, tuple):
                comp[elem] = {"min": val[0], "typical": val[1], "max": val[2]}
            else:
                comp[elem] = {"min": 0, "typical": val, "max": val * 1.2}
    
    # Handle max-only elements
    for suffix in ["_max"]:
        for key in list(m.keys()):
            if key.endswith(suffix):
                elem_key = key[:-4]  # Remove _max
                if elem_key in element_map:
                    comp[element_map[elem_key]] = {"min": 0, "typical": m[key]/2, "max": m[key]}
    
    # Calculate derived values
    jc = m.get("jc", {"A": 250, "B": 430, "n": 0.34, "C": 0.015, "m": 1.0})
    
    # Machinability characteristics
    is_fm = mach >= 150  # Free-machining
    is_soft = hb < 60
    is_hard = hb > 140
    
    chip_type = "short_broken" if is_fm else ("continuous_gummy" if is_soft else ("short_segmented" if is_hard else "short_curled"))
    bue_tendency = "very_low" if is_fm or is_hard else ("very_high" if is_soft else "moderate")
    
    # Cutting speed calculations
    base_speed = 200 + mach * 3
    
    return {
        "id": m["id"],
        "name": m["name"],
        "designation": {
            "aa": aa,
            "uns": m.get("uns", ""),
            "din": m.get("din", ""),
            "jis": f"A{aa}" if aa else "",
            "en": f"EN AW-{aa}" if aa else "",
            "iso": f"Al{'Zn' if series == 7 else 'MgSi' if series == 6 else 'Cu'}"
        },
        "iso_group": "N",
        "material_class": f"Aluminum - {aa[0]}xxx Series",
        "condition": m.get("condition", "T6"),
        "temper": m.get("temper", "T6"),
        
        "composition": comp,
        
        "physical": {
            "density": density,
            "melting_point": {"solidus": solidus, "liquidus": int(liquidus)},
            "specific_heat": 900 - density * 0.002,
            "thermal_conductivity": thermal_k,
            "thermal_expansion": 23.4e-6,
            "electrical_resistivity": 2.8e-8 + (200 - thermal_k) * 0.05e-8,
            "electrical_conductivity_iacs": int(thermal_k * 0.28),
            "magnetic_permeability": 1.00,
            "poissons_ratio": 0.33,
            "elastic_modulus": elastic,
            "shear_modulus": int(elastic / 2.66)
        },
        
        "mechanical": {
            "hardness": {
                "brinell": hb,
                "rockwell_b": int(hb * 0.62 - 2) if hb > 40 else None,
                "rockwell_c": None,
                "vickers": int(hb * 1.05)
            },
            "tensile_strength": {"min": int(tensile * 0.94), "typical": tensile, "max": int(tensile * 1.06)},
            "yield_strength": {"min": int(yield_str * 0.93), "typical": yield_str, "max": int(yield_str * 1.07)},
            "compressive_strength": {"min": int(yield_str * 0.93), "typical": yield_str, "max": int(yield_str * 1.07)},
            "elongation": {"min": max(2, elong - 4), "typical": elong, "max": elong + 4},
            "reduction_of_area": {"min": int(elong * 1.5), "typical": int(elong * 2.2), "max": int(elong * 3.0)},
            "impact_energy": {"joules": int(10 + elong * 0.5), "temperature": 20},
            "fatigue_strength": int(tensile * 0.30),
            "fracture_toughness": int(fracture)
        },
        
        "kienzle": {
            "kc1_1": m.get("kc11", 680),
            "mc": m.get("mc", 0.25),
            "kc_adjust_rake": -3.5,
            "kc_adjust_speed": -0.08,
            "chip_compression": 2.5 + (150 - hb) * 0.005
        },
        
        "taylor": {
            "C": m.get("taylor_C", 850),
            "n": m.get("taylor_n", 0.35),
            "reference_speed": int(m.get("taylor_C", 850) * 0.5),
            "reference_life": 15,
            "speed_range": {
                "min": int(base_speed * 0.5),
                "max": int(base_speed * 2.2)
            }
        },
        
        "johnson_cook": {
            "A": jc["A"],
            "B": jc["B"],
            "n": jc["n"],
            "C": jc["C"],
            "m": jc["m"],
            "T_melt": int(liquidus),
            "T_ref": 20,
            "epsilon_ref": 1.0
        },
        
        "machinability": {
            "aisi_rating": mach,
            "relative_to_1212": mach / 100,
            "chip_form": chip_type,
            "surface_finish_achievable": 0.4 if is_hard else (1.0 if is_soft else 0.6),
            "cutting_force_factor": 0.35 + hb * 0.0015,
            "built_up_edge_tendency": bue_tendency,
            "tool_wear_pattern": "even_flank" if is_hard else ("bue_flank" if is_soft else "even_flank")
        },
        
        "recommended_cutting": {
            "turning": {
                "carbide_coated": {
                    "speed": {"min": int(base_speed * 0.6), "opt": int(base_speed), "max": int(base_speed * 1.6)},
                    "feed": {"min": 0.10, "opt": 0.24, "max": 0.46},
                    "doc": {"min": 0.6, "opt": 2.8, "max": 7.5}
                },
                "pcd": {
                    "speed": {"min": int(base_speed * 1.2), "opt": int(base_speed * 2.0), "max": int(base_speed * 3.0)},
                    "feed": {"min": 0.08, "opt": 0.20, "max": 0.38},
                    "doc": {"min": 0.4, "opt": 2.2, "max": 6.0}
                }
            },
            "milling": {
                "carbide_coated": {
                    "speed": {"min": int(base_speed * 0.5), "opt": int(base_speed * 0.85), "max": int(base_speed * 1.4)},
                    "feed_per_tooth": {"min": 0.08, "opt": 0.19, "max": 0.36},
                    "doc": {"min": 0.6, "opt": 2.8, "max": 6.0},
                    "woc_factor": 0.68
                }
            },
            "drilling": {
                "carbide": {
                    "speed": {"min": int(base_speed * 0.35), "opt": int(base_speed * 0.60), "max": int(base_speed * 1.0)},
                    "feed_per_rev": {"min": 0.10, "opt": 0.24, "max": 0.44}
                }
            }
        },
        
        "surface_integrity": {
            "residual_stress_tendency": "compressive" if is_hard else "neutral",
            "white_layer_risk": "none",
            "work_hardening_depth": 0.02 if is_hard else 0.04,
            "surface_roughness_typical": {"Ra": 0.4 if is_hard else 0.7, "Rz": 2.5 if is_hard else 4.0}
        },
        
        "coolant": {
            "requirement": "recommended",
            "recommended_type": "soluble_oil",
            "mql_suitable": True,
            "cryogenic_benefit": "slight" if series == 7 and is_hard else "minimal"
        },
        
        "applications": m.get("apps", ["general_structural"]),
        
        "heat_treatment": {
            "temper": m.get("temper", "T6"),
            "solution_temp": solidus - 10 if m.get("temper", "T6") != "O" else None,
            "quench": "water" if m.get("temper", "T6") != "O" else None,
            "artificial_aging": "standard" if "T6" in m.get("temper", "T6") else None
        },
        
        "corrosion_resistance": {
            "general": "good" if series == 7 else "excellent",
            "stress_corrosion": m.get("scc", scc_default),
            "exfoliation": m.get("exfoliation", "moderate" if series == 7 else "resistant")
        },
        
        "notes": m.get("notes", "")
    }


def generate_js_file(materials: list, filename: str, category: str, id_range: tuple):
    """Generate JavaScript file from material list."""
    
    expanded = [build_aluminum_material(m) for m in materials]
    
    header = f'''/**
 * PRISM MATERIALS DATABASE - {category}
 * File: {filename}
 * Materials: {id_range[0]} through {id_range[1]}
 * 
 * ISO Category: N (Non-Ferrous)
 * 
 * Parameters per material: 127
 * Schema version: 3.0.0
 * Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}
 * 
 * AUTO-GENERATED by aluminum_materials_generator.py
 */

const {filename.upper().replace('.JS', '').replace('-', '_')} = {{
  metadata: {{
    file: "{filename}",
    category: "N_NONFERROUS",
    subcategory: "{category}",
    materialCount: {len(expanded)},
    idRange: {{ start: "{id_range[0]}", end: "{id_range[1]}" }},
    schemaVersion: "3.0.0",
    generated: "{datetime.now().strftime("%Y-%m-%d")}"
  }},

  materials: {{
'''
    
    # Convert materials to JS
    js_materials = []
    for mat in expanded:
        js = json.dumps(mat, indent=4)
        # Convert to JS object notation
        js = js.replace('"id":', 'id:')
        js = js.replace('true', 'true').replace('false', 'false').replace('null', 'null')
        js_materials.append(f'    "{mat["id"]}": {js}')
    
    body = ',\n\n'.join(js_materials)
    
    footer = '''
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ''' + filename.upper().replace('.JS', '').replace('-', '_') + ''';
}
'''
    
    return header + body + footer


def main():
    import sys
    
    series = sys.argv[1] if len(sys.argv) > 1 else "all"
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    if series in ["7xxx", "all"]:
        content = generate_js_file(
            ALUMINUM_7XXX,
            "aluminum_7xxx_051_065.js",
            "Aluminum 7xxx Series - High Strength",
            ("N-AL-051", "N-AL-065")
        )
        out_file = OUTPUT_DIR / "aluminum_7xxx_generated.js"
        out_file.write_text(content, encoding='utf-8')
        print(f"Generated: {out_file} ({len(ALUMINUM_7XXX)} materials)")
    
    if series in ["6xxx", "all"]:
        content = generate_js_file(
            ALUMINUM_6XXX,
            "aluminum_6xxx_031_038.js",
            "Aluminum 6xxx Series - Structural",
            ("N-AL-031", "N-AL-038")
        )
        out_file = OUTPUT_DIR / "aluminum_6xxx_generated.js"
        out_file.write_text(content, encoding='utf-8')
        print(f"Generated: {out_file} ({len(ALUMINUM_6XXX)} materials)")
    
    print("\n✅ Generation complete!")
    print(f"Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
