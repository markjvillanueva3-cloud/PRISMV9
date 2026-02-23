#!/usr/bin/env python3
"""
PRISM - Specialty Steels, Cryogenic, Valve, Gear Steels
P-CS-251 to P-CS-300 (50 materials)
"""

import json
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials")

STEELS_251_300 = [
    # CRYOGENIC STEELS
    {"id": "P-CS-251", "aisi": "9%Ni", "name": "9% Nickel Cryogenic Steel", "uns": "K81340", "din": "1.5662", "en": "X8Ni9",
     "subtype": "cryogenic", "C": (0, 0.08, 0.13), "Mn": (0.30, 0.50, 0.90), "Ni": (8.50, 9.00, 9.50), "Si": (0.15, 0.25, 0.35),
     "condition": "Q&T", "hb": 200, "tensile": 690, "yield": 585, "elong": 20,
     "kc11": 2000, "mc": 0.23, "mach": 48, "taylor_C": 135, "taylor_n": 0.18,
     "jc": {"A": 580, "B": 760, "n": 0.42, "C": 0.022, "m": 0.96}, "thermal_k": 26.0,
     "note": "LNG tanks -196°C"},
    {"id": "P-CS-252", "aisi": "5%Ni", "name": "5% Nickel Cryogenic Steel", "uns": "K41583", "din": "1.5680", "en": "12Ni5",
     "subtype": "cryogenic", "C": (0, 0.08, 0.13), "Mn": (0.30, 0.60, 0.90), "Ni": (4.75, 5.00, 5.25),
     "condition": "Q&T", "hb": 190, "tensile": 655, "yield": 515, "elong": 22,
     "kc11": 1920, "mc": 0.23, "mach": 52, "taylor_C": 145, "taylor_n": 0.20,
     "jc": {"A": 520, "B": 720, "n": 0.44, "C": 0.025, "m": 0.94}, "thermal_k": 30.0,
     "note": "Ethylene tanks -100°C"},
    {"id": "P-CS-253", "aisi": "3.5%Ni", "name": "3.5% Nickel Cryogenic Steel", "uns": "K32018", "din": "1.5637", "en": "10Ni14",
     "subtype": "cryogenic", "C": (0, 0.08, 0.15), "Mn": (0.40, 0.70, 0.90), "Ni": (3.25, 3.50, 3.75),
     "condition": "Normalized + Tempered", "hb": 180, "tensile": 620, "yield": 450, "elong": 24,
     "kc11": 1850, "mc": 0.23, "mach": 55, "taylor_C": 150, "taylor_n": 0.21,
     "jc": {"A": 480, "B": 680, "n": 0.46, "C": 0.028, "m": 0.92}, "thermal_k": 34.0,
     "note": "Propane service -45°C"},

    # VALVE STEELS
    {"id": "P-CS-254", "aisi": "F6NM", "name": "F6NM 13-4 Valve Steel", "uns": "S41500", "din": "1.4313", "en": "X3CrNiMo13-4",
     "subtype": "valve", "C": (0, 0.03, 0.05), "Cr": (12.0, 13.0, 14.0), "Ni": (3.5, 4.5, 5.5), "Mo": (0.40, 0.60, 1.00),
     "condition": "Q&T", "hb": 280, "tensile": 860, "yield": 620, "elong": 15,
     "kc11": 2200, "mc": 0.22, "mach": 42, "taylor_C": 125, "taylor_n": 0.17,
     "jc": {"A": 680, "B": 820, "n": 0.38, "C": 0.016, "m": 1.02}, "thermal_k": 22.0,
     "note": "Gate valves, pump impellers"},
    {"id": "P-CS-255", "aisi": "F22", "name": "F22 2.25Cr-1Mo Valve Steel", "uns": "K21590", "din": "1.7380", "en": "10CrMo9-10",
     "subtype": "valve", "C": (0.05, 0.10, 0.15), "Cr": (2.00, 2.25, 2.50), "Mo": (0.90, 1.00, 1.10),
     "condition": "Normalized + Tempered", "hb": 170, "tensile": 515, "yield": 310, "elong": 20,
     "kc11": 1750, "mc": 0.24, "mach": 58, "taylor_C": 160, "taylor_n": 0.22,
     "jc": {"A": 420, "B": 660, "n": 0.48, "C": 0.030, "m": 0.92}, "thermal_k": 38.0,
     "note": "High temp valves to 595°C"},
    {"id": "P-CS-256", "aisi": "F91", "name": "F91 9Cr-1Mo-V Valve Steel", "uns": "K91560", "din": "1.4903", "en": "X10CrMoVNb9-1",
     "subtype": "valve", "C": (0.08, 0.10, 0.12), "Cr": (8.00, 9.00, 9.50), "Mo": (0.85, 1.00, 1.05), "V": (0.18, 0.22, 0.25), "Nb": (0.06, 0.08, 0.10),
     "condition": "Normalized + Tempered", "hb": 210, "tensile": 620, "yield": 450, "elong": 18,
     "kc11": 1950, "mc": 0.23, "mach": 50, "taylor_C": 140, "taylor_n": 0.19,
     "jc": {"A": 520, "B": 740, "n": 0.44, "C": 0.024, "m": 0.96}, "thermal_k": 28.0,
     "note": "Steam piping to 650°C"},
    {"id": "P-CS-257", "aisi": "X20CrMoV12-1", "name": "12% Cr Valve Steel", "uns": "", "din": "1.4922", "en": "X20CrMoV12-1",
     "subtype": "valve", "C": (0.17, 0.22, 0.23), "Cr": (10.0, 12.0, 12.5), "Mo": (0.80, 1.00, 1.20), "V": (0.25, 0.30, 0.35),
     "condition": "Q&T", "hb": 255, "tensile": 760, "yield": 590, "elong": 14,
     "kc11": 2100, "mc": 0.22, "mach": 45, "taylor_C": 130, "taylor_n": 0.18,
     "jc": {"A": 620, "B": 800, "n": 0.40, "C": 0.018, "m": 1.0}, "thermal_k": 24.0,
     "note": "Steam turbine blades"},

    # GEAR STEELS
    {"id": "P-CS-258", "aisi": "4118H", "name": "AISI 4118H Gear Steel", "uns": "H41180", "din": "1.7131", "en": "16MnCr5",
     "subtype": "gear", "C": (0.17, 0.20, 0.23), "Mn": (0.60, 0.85, 1.05), "Cr": (0.30, 0.50, 0.70), "Mo": (0.08, 0.12, 0.15),
     "condition": "Carburized 58 HRC", "hb": 555, "hrc": 58, "tensile": 1930, "yield": 1725, "elong": 4,
     "kc11": 3900, "mc": 0.19, "mach": 15, "taylor_C": 58, "taylor_n": 0.10,
     "jc": {"A": 1600, "B": 950, "n": 0.24, "C": 0.008, "m": 1.12}, "thermal_k": 44.0,
     "note": "Automotive transmission gears"},
    {"id": "P-CS-259", "aisi": "5120H", "name": "AISI 5120H Gear Steel", "uns": "H51200", "din": "1.7147", "en": "20MnCr5",
     "subtype": "gear", "C": (0.17, 0.20, 0.23), "Mn": (0.60, 0.80, 1.00), "Cr": (0.60, 0.80, 1.00),
     "condition": "Carburized 60 HRC", "hb": 600, "hrc": 60, "tensile": 2000, "yield": 1825, "elong": 3,
     "kc11": 4200, "mc": 0.18, "mach": 12, "taylor_C": 50, "taylor_n": 0.09,
     "jc": {"A": 1720, "B": 970, "n": 0.22, "C": 0.007, "m": 1.15}, "thermal_k": 42.0},
    {"id": "P-CS-260", "aisi": "4820H", "name": "AISI 4820H Aircraft Gear", "uns": "H48200", "din": "1.6587", "en": "18CrNiMo7-6",
     "subtype": "gear", "C": (0.17, 0.20, 0.23), "Ni": (3.25, 3.50, 3.75), "Cr": (0, 0.20, 0.35), "Mo": (0.20, 0.25, 0.30),
     "condition": "Carburized 60 HRC", "hb": 600, "hrc": 60, "tensile": 2000, "yield": 1860, "elong": 3,
     "kc11": 4250, "mc": 0.18, "mach": 12, "taylor_C": 48, "taylor_n": 0.09,
     "jc": {"A": 1740, "B": 980, "n": 0.21, "C": 0.006, "m": 1.16}, "thermal_k": 38.0,
     "note": "High toughness aircraft gears"},
    {"id": "P-CS-261", "aisi": "18CrNiMo7-6", "name": "18CrNiMo7-6 Heavy Gear", "uns": "", "din": "1.6587", "en": "18CrNiMo7-6",
     "subtype": "gear", "C": (0.15, 0.18, 0.21), "Cr": (1.50, 1.70, 1.80), "Ni": (1.40, 1.65, 1.80), "Mo": (0.25, 0.30, 0.35),
     "condition": "Carburized 61 HRC", "hb": 615, "hrc": 61, "tensile": 2070, "yield": 1930, "elong": 3,
     "kc11": 4350, "mc": 0.18, "mach": 11, "taylor_C": 46, "taylor_n": 0.08,
     "jc": {"A": 1800, "B": 990, "n": 0.20, "C": 0.006, "m": 1.17}, "thermal_k": 36.0,
     "note": "Wind turbine gearboxes"},

    # PRESSURE VESSEL STEELS
    {"id": "P-CS-262", "aisi": "SA516-70", "name": "SA516 Grade 70 Pressure Vessel", "uns": "K02700", "din": "1.0425", "en": "P265GH",
     "subtype": "pressure_vessel", "C": (0, 0.20, 0.27), "Mn": (0.85, 1.10, 1.20), "Si": (0.15, 0.30, 0.40),
     "condition": "Normalized", "hb": 150, "tensile": 485, "yield": 260, "elong": 21,
     "kc11": 1600, "mc": 0.25, "mach": 62, "taylor_C": 170, "taylor_n": 0.23,
     "jc": {"A": 380, "B": 620, "n": 0.50, "C": 0.035, "m": 0.90}, "thermal_k": 50.0,
     "note": "Boilers, pressure vessels"},
    {"id": "P-CS-263", "aisi": "SA387-11", "name": "SA387 Grade 11 Cr-Mo Vessel", "uns": "K11789", "din": "1.7335", "en": "13CrMo4-5",
     "subtype": "pressure_vessel", "C": (0.05, 0.12, 0.17), "Cr": (1.00, 1.25, 1.50), "Mo": (0.45, 0.55, 0.65),
     "condition": "Normalized + Tempered", "hb": 170, "tensile": 515, "yield": 310, "elong": 22,
     "kc11": 1720, "mc": 0.24, "mach": 58, "taylor_C": 160, "taylor_n": 0.22,
     "jc": {"A": 420, "B": 660, "n": 0.48, "C": 0.030, "m": 0.92}, "thermal_k": 42.0,
     "note": "Refinery vessels to 525°C"},
    {"id": "P-CS-264", "aisi": "SA387-22", "name": "SA387 Grade 22 2.25Cr-1Mo Vessel", "uns": "K21590", "din": "1.7380", "en": "10CrMo9-10",
     "subtype": "pressure_vessel", "C": (0.05, 0.10, 0.15), "Cr": (2.00, 2.25, 2.50), "Mo": (0.90, 1.00, 1.10),
     "condition": "Normalized + Tempered", "hb": 175, "tensile": 520, "yield": 310, "elong": 20,
     "kc11": 1740, "mc": 0.24, "mach": 56, "taylor_C": 155, "taylor_n": 0.22,
     "jc": {"A": 430, "B": 670, "n": 0.47, "C": 0.028, "m": 0.93}, "thermal_k": 38.0},

    # FASTENER STEELS
    {"id": "P-CS-265", "aisi": "4037", "name": "AISI 4037 Fastener Steel", "uns": "G40370", "din": "1.7225", "en": "42CrMo4",
     "subtype": "fastener", "C": (0.35, 0.38, 0.40), "Mn": (0.70, 0.80, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Q&T Grade 8", "hb": 302, "hrc": 32, "tensile": 1035, "yield": 895, "elong": 12,
     "kc11": 2350, "mc": 0.22, "mach": 42, "taylor_C": 125, "taylor_n": 0.17,
     "jc": {"A": 850, "B": 870, "n": 0.34, "C": 0.014, "m": 1.05}, "thermal_k": 42.0,
     "note": "Grade 8 bolts"},
    {"id": "P-CS-266", "aisi": "1541", "name": "AISI 1541 High Mn Fastener", "uns": "G15410", "din": "", "en": "",
     "subtype": "fastener", "C": (0.36, 0.40, 0.44), "Mn": (1.35, 1.50, 1.65),
     "condition": "Q&T Grade 8", "hb": 290, "hrc": 30, "tensile": 1000, "yield": 860, "elong": 14,
     "kc11": 2280, "mc": 0.22, "mach": 45, "taylor_C": 130, "taylor_n": 0.18,
     "jc": {"A": 820, "B": 860, "n": 0.36, "C": 0.015, "m": 1.04}, "thermal_k": 46.0},
    {"id": "P-CS-267", "aisi": "4140mod", "name": "AISI 4140 Grade 10.9 Fastener", "uns": "G41400", "din": "1.7225", "en": "42CrMo4",
     "subtype": "fastener", "C": (0.38, 0.41, 0.43), "Cr": (0.80, 0.95, 1.10), "Mo": (0.15, 0.20, 0.25),
     "condition": "Q&T Grade 10.9", "hb": 330, "hrc": 35, "tensile": 1100, "yield": 1000, "elong": 10,
     "kc11": 2550, "mc": 0.21, "mach": 38, "taylor_C": 115, "taylor_n": 0.16,
     "jc": {"A": 950, "B": 900, "n": 0.30, "C": 0.012, "m": 1.08}, "thermal_k": 42.0,
     "note": "Metric 10.9 fasteners"},
    {"id": "P-CS-268", "aisi": "4340mod", "name": "AISI 4340 Grade 12.9 Fastener", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "fastener", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Q&T Grade 12.9", "hb": 385, "hrc": 40, "tensile": 1220, "yield": 1100, "elong": 9,
     "kc11": 2750, "mc": 0.21, "mach": 32, "taylor_C": 100, "taylor_n": 0.15,
     "jc": {"A": 1050, "B": 920, "n": 0.28, "C": 0.010, "m": 1.10}, "thermal_k": 38.0,
     "note": "Highest strength metric fasteners"},

    # ELECTRICAL STEELS
    {"id": "P-CS-269", "aisi": "M19", "name": "M19 Electrical Steel (Non-Oriented)", "uns": "", "din": "1.0897", "en": "M270-35A",
     "subtype": "electrical", "C": (0, 0.01, 0.02), "Si": (1.80, 2.20, 2.60), "Al": (0, 0.30, 0.50),
     "condition": "Fully Processed", "hb": 150, "tensile": 490, "yield": 350, "elong": 30,
     "kc11": 1600, "mc": 0.25, "mach": 65, "taylor_C": 175, "taylor_n": 0.24,
     "jc": {"A": 380, "B": 580, "n": 0.55, "C": 0.045, "m": 0.86}, "thermal_k": 30.0,
     "note": "Motor laminations"},
    {"id": "P-CS-270", "aisi": "M6", "name": "M6 Electrical Steel (Grain Oriented)", "uns": "", "din": "1.0898", "en": "M111-27P",
     "subtype": "electrical", "C": (0, 0.01, 0.02), "Si": (2.80, 3.20, 3.50),
     "condition": "Grain Oriented", "hb": 180, "tensile": 520, "yield": 380, "elong": 25,
     "kc11": 1750, "mc": 0.24, "mach": 55, "taylor_C": 150, "taylor_n": 0.21,
     "jc": {"A": 450, "B": 650, "n": 0.50, "C": 0.038, "m": 0.88}, "thermal_k": 25.0,
     "note": "Transformer cores"},

    # AUSTEMPERED STEELS
    {"id": "P-CS-271", "aisi": "1050ADI", "name": "AISI 1050 Austempered", "uns": "G10500",
     "subtype": "austempered", "C": (0.48, 0.51, 0.55), "Mn": (0.60, 0.80, 0.90),
     "condition": "Austempered 38 HRC", "hb": 352, "hrc": 38, "tensile": 1240, "yield": 1000, "elong": 8,
     "kc11": 2600, "mc": 0.21, "mach": 32, "taylor_C": 100, "taylor_n": 0.15,
     "jc": {"A": 980, "B": 890, "n": 0.30, "C": 0.010, "m": 1.08}, "thermal_k": 42.0,
     "note": "Automotive components"},
    {"id": "P-CS-272", "aisi": "4150ADI", "name": "AISI 4150 Austempered", "uns": "G41500", "din": "1.7228", "en": "50CrMo4",
     "subtype": "austempered", "C": (0.48, 0.51, 0.53), "Cr": (0.80, 0.95, 1.10), "Mo": (0.15, 0.20, 0.25),
     "condition": "Austempered 42 HRC", "hb": 400, "hrc": 42, "tensile": 1380, "yield": 1170, "elong": 6,
     "kc11": 2850, "mc": 0.20, "mach": 28, "taylor_C": 92, "taylor_n": 0.14,
     "jc": {"A": 1100, "B": 920, "n": 0.28, "C": 0.010, "m": 1.10}, "thermal_k": 40.0},

    # BAINITIC STEELS
    {"id": "P-CS-273", "aisi": "Bainite300", "name": "Bainitic Steel 300 Class", "uns": "",
     "subtype": "bainitic", "C": (0.15, 0.20, 0.25), "Mn": (1.50, 2.00, 2.50), "Mo": (0.15, 0.25, 0.35), "Si": (0.20, 0.50, 0.80),
     "condition": "Air Cooled Bainite", "hb": 300, "hrc": 31, "tensile": 1000, "yield": 900, "elong": 12,
     "kc11": 2350, "mc": 0.22, "mach": 42, "taylor_C": 125, "taylor_n": 0.17,
     "jc": {"A": 850, "B": 870, "n": 0.34, "C": 0.014, "m": 1.05}, "thermal_k": 40.0,
     "note": "Rail applications"},
    {"id": "P-CS-274", "aisi": "CarFree", "name": "Carbide-Free Bainitic Steel", "uns": "",
     "subtype": "bainitic", "C": (0.80, 0.90, 1.00), "Si": (1.50, 2.00, 2.50), "Mn": (0.80, 1.00, 1.20), "Cr": (0.50, 0.80, 1.00),
     "condition": "Isothermal Transform", "hb": 600, "hrc": 60, "tensile": 2000, "yield": 1600, "elong": 5,
     "kc11": 4200, "mc": 0.18, "mach": 12, "taylor_C": 50, "taylor_n": 0.09,
     "jc": {"A": 1700, "B": 980, "n": 0.22, "C": 0.006, "m": 1.16}, "thermal_k": 35.0,
     "note": "Armour, extreme wear"},

    # QUENCHED & PARTITIONED STEELS
    {"id": "P-CS-275", "aisi": "QP980", "name": "Q&P 980 3rd Gen AHSS", "uns": "",
     "subtype": "q_and_p", "C": (0.20, 0.25, 0.30), "Mn": (1.80, 2.20, 2.50), "Si": (1.20, 1.60, 2.00),
     "condition": "Q&P Processed", "hb": 300, "tensile": 980, "yield": 700, "elong": 18,
     "kc11": 2380, "mc": 0.22, "mach": 40, "taylor_C": 120, "taylor_n": 0.17,
     "jc": {"A": 750, "B": 850, "n": 0.38, "C": 0.018, "m": 1.02}, "thermal_k": 38.0,
     "note": "3rd gen automotive"},
    {"id": "P-CS-276", "aisi": "QP1180", "name": "Q&P 1180 3rd Gen AHSS", "uns": "",
     "subtype": "q_and_p", "C": (0.25, 0.30, 0.35), "Mn": (2.00, 2.40, 2.80), "Si": (1.40, 1.80, 2.20),
     "condition": "Q&P Processed", "hb": 350, "tensile": 1180, "yield": 950, "elong": 12,
     "kc11": 2650, "mc": 0.21, "mach": 35, "taylor_C": 108, "taylor_n": 0.16,
     "jc": {"A": 920, "B": 900, "n": 0.32, "C": 0.012, "m": 1.08}, "thermal_k": 36.0},

    # TWIP STEELS
    {"id": "P-CS-277", "aisi": "TWIP980", "name": "TWIP Steel 980 High Mn", "uns": "",
     "subtype": "twip", "C": (0.50, 0.60, 0.70), "Mn": (17.0, 22.0, 25.0), "Al": (1.0, 1.5, 2.0),
     "condition": "Solution Annealed", "hb": 200, "tensile": 980, "yield": 450, "elong": 50,
     "kc11": 2200, "mc": 0.22, "mach": 35, "taylor_C": 108, "taylor_n": 0.16,
     "jc": {"A": 550, "B": 950, "n": 0.60, "C": 0.040, "m": 0.80}, "thermal_k": 15.0,
     "note": "Twinning induced plasticity - extreme formability"},

    # MEDIUM MANGANESE STEELS
    {"id": "P-CS-278", "aisi": "MedMn1000", "name": "Medium Mn 1000 3rd Gen", "uns": "",
     "subtype": "medium_mn", "C": (0.10, 0.15, 0.20), "Mn": (5.0, 7.0, 10.0), "Al": (0, 1.0, 2.0),
     "condition": "Intercritical Annealed", "hb": 280, "tensile": 1000, "yield": 800, "elong": 20,
     "kc11": 2350, "mc": 0.22, "mach": 38, "taylor_C": 115, "taylor_n": 0.16,
     "jc": {"A": 780, "B": 880, "n": 0.42, "C": 0.022, "m": 0.98}, "thermal_k": 22.0,
     "note": "Next gen automotive"},

    # TWINNING INDUCED PLASTICITY (SECONDARY)
    {"id": "P-CS-279", "aisi": "X70MnAlSi", "name": "X70MnAlSi TRIPLEX Steel", "uns": "",
     "subtype": "triplex", "C": (0.70, 0.80, 0.90), "Mn": (26.0, 28.0, 30.0), "Al": (10.0, 12.0, 14.0), "Si": (0, 0.30, 0.50),
     "condition": "Solution Annealed", "hb": 260, "tensile": 950, "yield": 680, "elong": 35,
     "kc11": 2280, "mc": 0.22, "mach": 32, "taylor_C": 100, "taylor_n": 0.15,
     "jc": {"A": 700, "B": 920, "n": 0.50, "C": 0.035, "m": 0.85}, "thermal_k": 12.0,
     "note": "Low density (~7.0 g/cm³)"},

    # STAINLESS TOOL STEELS
    {"id": "P-CS-280", "aisi": "440C", "name": "AISI 440C Stainless Tool", "uns": "S44004", "din": "1.4125", "en": "X105CrMo17",
     "subtype": "stainless_tool", "C": (0.95, 1.05, 1.20), "Cr": (16.0, 17.0, 18.0), "Mo": (0, 0.50, 0.75),
     "condition": "Annealed", "hb": 260, "tensile": 760, "yield": 450, "elong": 8,
     "kc11": 2250, "mc": 0.22, "mach": 38, "taylor_C": 115, "taylor_n": 0.16,
     "jc": {"A": 620, "B": 820, "n": 0.40, "C": 0.018, "m": 1.0}, "thermal_k": 24.0,
     "note": "Knife blades, bearings"},
    {"id": "P-CS-281", "aisi": "440C", "name": "AISI 440C Hardened 58 HRC", "uns": "S44004", "din": "1.4125", "en": "X105CrMo17",
     "subtype": "stainless_tool", "C": (0.95, 1.05, 1.20), "Cr": (16.0, 17.0, 18.0), "Mo": (0, 0.50, 0.75),
     "condition": "Hardened 58 HRC", "hb": 555, "hrc": 58, "tensile": 1970, "yield": 1900, "elong": 2,
     "kc11": 4100, "mc": 0.18, "mach": 12, "taylor_C": 50, "taylor_n": 0.09,
     "jc": {"A": 1680, "B": 960, "n": 0.22, "C": 0.006, "m": 1.16}, "thermal_k": 24.0},
    {"id": "P-CS-282", "aisi": "154CM", "name": "154CM Premium Stainless", "uns": "S45700", "din": "", "en": "",
     "subtype": "stainless_tool", "C": (1.00, 1.05, 1.10), "Cr": (13.5, 14.0, 14.5), "Mo": (3.75, 4.00, 4.25),
     "condition": "Hardened 60 HRC", "hb": 600, "hrc": 60, "tensile": 2070, "yield": 2000, "elong": 2,
     "kc11": 4350, "mc": 0.18, "mach": 10, "taylor_C": 45, "taylor_n": 0.08,
     "jc": {"A": 1780, "B": 980, "n": 0.20, "C": 0.006, "m": 1.18}, "thermal_k": 20.0,
     "note": "Premium knife steel"},
    {"id": "P-CS-283", "aisi": "VG10", "name": "VG-10 Japanese Knife Steel", "uns": "", "din": "", "en": "",
     "subtype": "stainless_tool", "C": (0.95, 1.00, 1.05), "Cr": (14.5, 15.0, 15.5), "Mo": (0.9, 1.0, 1.2), "Co": (1.3, 1.5, 1.7), "V": (0.1, 0.2, 0.3),
     "condition": "Hardened 60 HRC", "hb": 600, "hrc": 60, "tensile": 2050, "yield": 1980, "elong": 2,
     "kc11": 4300, "mc": 0.18, "mach": 11, "taylor_C": 48, "taylor_n": 0.09,
     "jc": {"A": 1760, "B": 975, "n": 0.21, "C": 0.006, "m": 1.17}, "thermal_k": 18.0,
     "note": "Japanese kitchen knives"},

    # POWDER METALLURGY STAINLESS
    {"id": "P-CS-284", "aisi": "CPM-S30V", "name": "CPM S30V PM Stainless", "uns": "", "din": "", "en": "",
     "subtype": "pm_stainless", "C": (1.40, 1.45, 1.50), "Cr": (14.0, 14.0, 14.0), "Mo": (2.0, 2.0, 2.0), "V": (4.0, 4.0, 4.0),
     "condition": "Hardened 59 HRC", "hb": 575, "hrc": 59, "tensile": 2000, "yield": 1920, "elong": 2,
     "kc11": 4200, "mc": 0.18, "mach": 12, "taylor_C": 50, "taylor_n": 0.09,
     "jc": {"A": 1720, "B": 970, "n": 0.22, "C": 0.006, "m": 1.16}, "thermal_k": 16.0,
     "note": "Premium American knife steel"},
    {"id": "P-CS-285", "aisi": "CPM-S35VN", "name": "CPM S35VN PM Stainless", "uns": "", "din": "", "en": "",
     "subtype": "pm_stainless", "C": (1.35, 1.40, 1.45), "Cr": (14.0, 14.0, 14.0), "Mo": (2.0, 2.0, 2.0), "V": (3.0, 3.0, 3.0), "Nb": (0.50, 0.50, 0.50),
     "condition": "Hardened 60 HRC", "hb": 600, "hrc": 60, "tensile": 2050, "yield": 1980, "elong": 2,
     "kc11": 4280, "mc": 0.18, "mach": 11, "taylor_C": 48, "taylor_n": 0.09,
     "jc": {"A": 1750, "B": 980, "n": 0.21, "C": 0.006, "m": 1.17}, "thermal_k": 16.0,
     "note": "Improved toughness over S30V"},
    {"id": "P-CS-286", "aisi": "CPM-20CV", "name": "CPM 20CV Super PM Stainless", "uns": "", "din": "", "en": "",
     "subtype": "pm_stainless", "C": (1.85, 1.90, 1.95), "Cr": (20.0, 20.0, 20.0), "Mo": (1.0, 1.0, 1.0), "V": (4.0, 4.0, 4.0), "W": (0.60, 0.60, 0.60),
     "condition": "Hardened 62 HRC", "hb": 650, "hrc": 62, "tensile": 2200, "yield": 2150, "elong": 1,
     "kc11": 4600, "mc": 0.17, "mach": 8, "taylor_C": 40, "taylor_n": 0.07,
     "jc": {"A": 1900, "B": 1020, "n": 0.18, "C": 0.005, "m": 1.20}, "thermal_k": 14.0,
     "note": "Ultimate corrosion + wear"},

    # SURGICAL/MEDICAL STEELS
    {"id": "P-CS-287", "aisi": "316LVM", "name": "316LVM Surgical Implant Grade", "uns": "S31673", "din": "1.4441", "en": "X2CrNiMo18-15-3",
     "subtype": "surgical", "C": (0, 0.02, 0.03), "Cr": (17.0, 18.0, 19.0), "Ni": (13.0, 14.0, 15.0), "Mo": (2.5, 2.75, 3.0),
     "condition": "Cold Worked", "hb": 250, "tensile": 860, "yield": 690, "elong": 20,
     "kc11": 2200, "mc": 0.22, "mach": 40, "taylor_C": 120, "taylor_n": 0.17,
     "jc": {"A": 720, "B": 850, "n": 0.42, "C": 0.022, "m": 0.96}, "thermal_k": 15.0,
     "note": "Orthopedic implants"},
    {"id": "P-CS-288", "aisi": "ASTMF138", "name": "ASTM F138 Surgical Steel", "uns": "S31673", "din": "1.4441", "en": "X2CrNiMo18-15-3",
     "subtype": "surgical", "C": (0, 0.02, 0.03), "Cr": (17.0, 18.0, 19.0), "Ni": (13.0, 14.0, 15.0), "Mo": (2.5, 2.75, 3.0),
     "condition": "Annealed", "hb": 180, "tensile": 560, "yield": 290, "elong": 40,
     "kc11": 1850, "mc": 0.23, "mach": 48, "taylor_C": 135, "taylor_n": 0.18,
     "jc": {"A": 450, "B": 720, "n": 0.55, "C": 0.040, "m": 0.85}, "thermal_k": 15.0,
     "note": "Bone plates, screws"},

    # NITROGEN STRENGTHENED SURGICAL
    {"id": "P-CS-289", "aisi": "Rex734", "name": "Rex 734 N-Strengthened Surgical", "uns": "S29108", "din": "1.4472", "en": "X13CrMnMoN18-14-3",
     "subtype": "surgical", "C": (0, 0.04, 0.08), "Cr": (19.0, 21.0, 22.0), "Ni": (9.0, 10.0, 11.0), "Mo": (2.0, 2.5, 3.0), "Mn": (3.5, 4.0, 4.5), "N": (0.35, 0.40, 0.45),
     "condition": "Cold Worked", "hb": 320, "tensile": 1100, "yield": 900, "elong": 15,
     "kc11": 2550, "mc": 0.21, "mach": 32, "taylor_C": 100, "taylor_n": 0.15,
     "jc": {"A": 920, "B": 900, "n": 0.35, "C": 0.012, "m": 1.06}, "thermal_k": 13.0,
     "note": "Hip implants - Ni-free"},

    # REMAINING SPECIALTY GRADES
    {"id": "P-CS-290", "aisi": "Aermet100", "name": "AerMet 100 Ultra High Strength", "uns": "K92580", "din": "", "en": "",
     "subtype": "ultra_high_strength", "C": (0.21, 0.23, 0.25), "Ni": (11.0, 11.5, 12.0), "Co": (13.0, 13.5, 14.0), "Cr": (2.9, 3.1, 3.3), "Mo": (1.1, 1.2, 1.4),
     "condition": "Aged", "hb": 550, "hrc": 54, "tensile": 1965, "yield": 1725, "elong": 13,
     "kc11": 3600, "mc": 0.19, "mach": 18, "taylor_C": 68, "taylor_n": 0.11,
     "jc": {"A": 1550, "B": 950, "n": 0.26, "C": 0.008, "m": 1.12}, "thermal_k": 20.0,
     "note": "Landing gear, drivetrain - highest K1c"},
    {"id": "P-CS-291", "aisi": "Aermet310", "name": "AerMet 310 Premium", "uns": "K93160", "din": "", "en": "",
     "subtype": "ultra_high_strength", "C": (0.23, 0.25, 0.27), "Ni": (10.8, 11.0, 11.2), "Co": (14.8, 15.0, 15.2), "Cr": (2.35, 2.40, 2.45), "Mo": (1.35, 1.40, 1.45),
     "condition": "Aged", "hb": 600, "hrc": 58, "tensile": 2170, "yield": 1930, "elong": 10,
     "kc11": 4000, "mc": 0.18, "mach": 14, "taylor_C": 55, "taylor_n": 0.10,
     "jc": {"A": 1800, "B": 980, "n": 0.22, "C": 0.006, "m": 1.16}, "thermal_k": 18.0,
     "note": "2170 MPa with 88 MPa√m K1c"},
    {"id": "P-CS-292", "aisi": "Ferrium", "name": "Ferrium S53 Corrosion Resistant", "uns": "", "din": "", "en": "",
     "subtype": "ultra_high_strength", "C": (0.18, 0.21, 0.23), "Cr": (9.5, 10.0, 10.5), "Ni": (5.2, 5.5, 5.8), "Co": (13.5, 14.0, 14.5), "Mo": (1.8, 2.0, 2.2), "W": (0.9, 1.0, 1.1), "V": (0.28, 0.30, 0.32),
     "condition": "Aged", "hb": 530, "hrc": 53, "tensile": 1930, "yield": 1585, "elong": 12,
     "kc11": 3550, "mc": 0.19, "mach": 20, "taylor_C": 72, "taylor_n": 0.12,
     "jc": {"A": 1500, "B": 940, "n": 0.27, "C": 0.009, "m": 1.10}, "thermal_k": 19.0,
     "note": "Stainless + ultra high strength"},
    {"id": "P-CS-293", "aisi": "FerriumM54", "name": "Ferrium M54 Gear/Bearing Steel", "uns": "", "din": "", "en": "",
     "subtype": "ultra_high_strength", "C": (0.28, 0.30, 0.32), "Cr": (0.90, 1.00, 1.10), "Ni": (7.0, 7.5, 8.0), "Co": (11.5, 12.0, 12.5), "Mo": (2.8, 3.0, 3.2), "W": (1.2, 1.3, 1.4), "V": (0.10, 0.12, 0.14),
     "condition": "Case Hardened", "hb": 650, "hrc": 62, "tensile": 2100, "yield": 1900, "elong": 8,
     "kc11": 4400, "mc": 0.17, "mach": 10, "taylor_C": 45, "taylor_n": 0.08,
     "jc": {"A": 1850, "B": 1000, "n": 0.20, "C": 0.005, "m": 1.18}, "thermal_k": 18.0,
     "note": "Helicopter transmission gears"},
    {"id": "P-CS-294", "aisi": "CarpenterCT15", "name": "Carpenter CT15C Ultra Corrosion", "uns": "", "din": "", "en": "",
     "subtype": "ultra_high_strength", "C": (0, 0.01, 0.03), "Cr": (14.0, 14.5, 15.0), "Ni": (4.8, 5.0, 5.2), "Co": (14.0, 14.5, 15.0), "Mo": (4.3, 4.5, 4.7), "Ti": (0.6, 0.7, 0.8),
     "condition": "Aged", "hb": 515, "hrc": 51, "tensile": 1725, "yield": 1520, "elong": 12,
     "kc11": 3400, "mc": 0.19, "mach": 22, "taylor_C": 78, "taylor_n": 0.13,
     "jc": {"A": 1400, "B": 920, "n": 0.28, "C": 0.010, "m": 1.08}, "thermal_k": 16.0,
     "note": "Salt spray resistant + strength"},
    {"id": "P-CS-295", "aisi": "Custom465", "name": "Custom 465 Stainless", "uns": "S46500", "din": "", "en": "",
     "subtype": "ultra_high_strength", "C": (0, 0.01, 0.02), "Cr": (11.0, 11.5, 12.0), "Ni": (10.75, 11.0, 11.25), "Mo": (0.75, 1.0, 1.25), "Ti": (1.5, 1.65, 1.8),
     "condition": "H950", "hb": 505, "hrc": 50, "tensile": 1690, "yield": 1585, "elong": 12,
     "kc11": 3350, "mc": 0.19, "mach": 24, "taylor_C": 82, "taylor_n": 0.13,
     "jc": {"A": 1380, "B": 910, "n": 0.29, "C": 0.010, "m": 1.08}, "thermal_k": 18.0,
     "note": "PH stainless - aerospace fasteners"},
    {"id": "P-CS-296", "aisi": "MLX17", "name": "MLX-17 Stainless PH", "uns": "", "din": "", "en": "",
     "subtype": "ultra_high_strength", "C": (0, 0.01, 0.02), "Cr": (11.5, 12.0, 12.5), "Ni": (9.0, 9.5, 10.0), "Ti": (1.0, 1.1, 1.2), "Al": (0.3, 0.4, 0.5),
     "condition": "Aged", "hb": 485, "hrc": 49, "tensile": 1620, "yield": 1520, "elong": 14,
     "kc11": 3250, "mc": 0.19, "mach": 26, "taylor_C": 88, "taylor_n": 0.14,
     "jc": {"A": 1320, "B": 900, "n": 0.30, "C": 0.011, "m": 1.07}, "thermal_k": 19.0,
     "note": "Next gen aerospace"},
    {"id": "P-CS-297", "aisi": "AF1410", "name": "AF1410 Secondary Hardening", "uns": "K92571", "din": "", "en": "",
     "subtype": "secondary_hardening", "C": (0.13, 0.16, 0.17), "Ni": (9.75, 10.0, 10.25), "Co": (13.5, 14.0, 14.5), "Cr": (1.90, 2.00, 2.10), "Mo": (0.90, 1.00, 1.10),
     "condition": "Aged", "hb": 515, "hrc": 51, "tensile": 1725, "yield": 1515, "elong": 14,
     "kc11": 3400, "mc": 0.19, "mach": 22, "taylor_C": 78, "taylor_n": 0.13,
     "jc": {"A": 1420, "B": 920, "n": 0.28, "C": 0.010, "m": 1.08}, "thermal_k": 22.0,
     "note": "Aircraft arrestor hooks"},
    {"id": "P-CS-298", "aisi": "HMX", "name": "HMX Ultra Tough Aircraft", "uns": "", "din": "", "en": "",
     "subtype": "ultra_high_strength", "C": (0.12, 0.14, 0.16), "Ni": (6.8, 7.0, 7.2), "Co": (16.5, 17.0, 17.5), "Cr": (1.90, 2.00, 2.10), "Mo": (1.0, 1.1, 1.2), "W": (0.95, 1.00, 1.05),
     "condition": "Aged", "hb": 500, "hrc": 50, "tensile": 1690, "yield": 1450, "elong": 15,
     "kc11": 3320, "mc": 0.19, "mach": 24, "taylor_C": 82, "taylor_n": 0.13,
     "jc": {"A": 1360, "B": 900, "n": 0.30, "C": 0.011, "m": 1.07}, "thermal_k": 21.0,
     "note": "Highest toughness UHS steel"},
    {"id": "P-CS-299", "aisi": "17-4PH", "name": "17-4 PH Condition H900", "uns": "S17400", "din": "1.4542", "en": "X5CrNiCuNb16-4",
     "subtype": "ph_stainless", "C": (0, 0.04, 0.07), "Cr": (15.0, 16.5, 17.5), "Ni": (3.0, 4.0, 5.0), "Cu": (3.0, 3.5, 5.0), "Nb": (0.15, 0.30, 0.45),
     "condition": "H900 (48 HRC)", "hb": 460, "hrc": 48, "tensile": 1380, "yield": 1170, "elong": 10,
     "kc11": 3000, "mc": 0.20, "mach": 28, "taylor_C": 92, "taylor_n": 0.14,
     "jc": {"A": 1100, "B": 900, "n": 0.30, "C": 0.012, "m": 1.08}, "thermal_k": 18.0,
     "note": "Shafts, gears, fasteners"},
    {"id": "P-CS-300", "aisi": "15-5PH", "name": "15-5 PH Condition H1025", "uns": "S15500", "din": "1.4545", "en": "X5CrNiCu15-5",
     "subtype": "ph_stainless", "C": (0, 0.04, 0.07), "Cr": (14.0, 15.0, 15.5), "Ni": (3.5, 4.5, 5.5), "Cu": (2.5, 3.25, 4.5), "Nb": (0.15, 0.30, 0.45),
     "condition": "H1025 (38 HRC)", "hb": 352, "hrc": 38, "tensile": 1070, "yield": 1000, "elong": 12,
     "kc11": 2650, "mc": 0.21, "mach": 35, "taylor_C": 108, "taylor_n": 0.16,
     "jc": {"A": 950, "B": 880, "n": 0.32, "C": 0.014, "m": 1.05}, "thermal_k": 18.0,
     "note": "Better transverse properties than 17-4"}
]


def build_steel(s):
    C = s.get("C", (0.30, 0.40, 0.50)); Mn = s.get("Mn", (0.30, 0.60, 0.90)); Si = s.get("Si", (0.15, 0.25, 0.35))
    Cr = s.get("Cr", (0, 0, 0)); Mo = s.get("Mo", (0, 0, 0)); V = s.get("V", (0, 0, 0)); Ni = s.get("Ni", (0, 0, 0))
    Co = s.get("Co", (0, 0, 0)); Ti = s.get("Ti", (0, 0, 0)); Nb = s.get("Nb", (0, 0, 0)); Cu = s.get("Cu", (0, 0, 0))
    Al = s.get("Al", (0, 0, 0)); W = s.get("W", (0, 0, 0)); N = s.get("N", (0, 0, 0))
    hb = s["hb"]; hrc = s.get("hrc"); tensile = s["tensile"]; yield_str = s["yield"]; elong = s.get("elong", 12)
    thermal_k = s.get("thermal_k", 40.0); subtype = s.get("subtype", "specialty"); jc = s["jc"]
    density = 7850 + (Co[1] * 10) + (Ni[1] * 5) + (W[1] * 20) - (Al[1] * 100) - (Mn[1] * 10)
    melting = 1500 - (C[1] * 80) - (Ni[1] * 5)
    chip = "segmented" if hb > 500 else ("continuous_short" if hb > 280 else "continuous")
    
    return {
        "id": s["id"], "name": s["name"],
        "designation": {"aisi_sae": s.get("aisi", ""), "uns": s.get("uns", ""), "din": s.get("din", ""), "en": s.get("en", "")},
        "iso_group": "P" if hb < 350 else "H", "material_class": f"Steel - {subtype.replace('_', ' ').title()}",
        "condition": s["condition"],
        "composition": {"carbon": {"min": C[0], "max": C[2], "typical": C[1]}, "chromium": {"min": Cr[0], "max": Cr[2], "typical": Cr[1]},
                       "nickel": {"min": Ni[0], "max": Ni[2], "typical": Ni[1]}, "molybdenum": {"min": Mo[0], "max": Mo[2], "typical": Mo[1]},
                       "cobalt": {"min": Co[0], "max": Co[2], "typical": Co[1]}, "vanadium": {"min": V[0], "max": V[2], "typical": V[1]},
                       "tungsten": {"min": W[0], "max": W[2], "typical": W[1]}, "titanium": {"min": Ti[0], "max": Ti[2], "typical": Ti[1]},
                       "aluminum": {"min": Al[0], "max": Al[2], "typical": Al[1]}, "copper": {"min": Cu[0], "max": Cu[2], "typical": Cu[1]},
                       "niobium": {"min": Nb[0], "max": Nb[2], "typical": Nb[1]}, "nitrogen": {"min": N[0], "max": N[2], "typical": N[1]}},
        "physical": {"density": int(density), "melting_point": {"solidus": int(melting)}, "thermal_conductivity": thermal_k},
        "mechanical": {"hardness": {"brinell": hb, "rockwell_c": hrc, "vickers": int(hb * 1.05)},
                      "tensile_strength": {"typical": tensile}, "yield_strength": {"typical": yield_str}, "elongation": {"typical": elong}},
        "kienzle": {"kc1_1": s["kc11"], "mc": s["mc"]},
        "johnson_cook": {"A": jc["A"], "B": jc["B"], "C": jc["C"], "n": jc["n"], "m": jc["m"]},
        "taylor": {"C": s["taylor_C"], "n": s["taylor_n"]},
        "machinability": {"aisi_rating": s["mach"], "relative_to_1212": s["mach"] / 100},
        "notes": s.get("note", "")
    }


def generate():
    header = f'''/**
 * PRISM MATERIALS DATABASE - Specialty Steels
 * File: steels_251_300.js - P-CS-251 to P-CS-300 (50 materials)
 * Cryogenic, Valve, Gear, Pressure Vessel, Fastener, Electrical, AHSS, PM Stainless, Surgical, Ultra-High Strength
 * Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 */
const STEELS_251_300 = {{
  metadata: {{file: "steels_251_300.js", category: "P_STEELS", materialCount: {len(STEELS_251_300)}}},
  materials: {{
'''
    mats = [f'    "{s["id"]}": ' + json.dumps(build_steel(s), indent=6).replace('\n', '\n    ') for s in STEELS_251_300]
    footer = '\n  }\n};\nif (typeof module !== "undefined") module.exports = STEELS_251_300;\n'
    content = header + ',\n\n'.join(mats) + footer
    
    out = OUTPUT_DIR / "P_STEELS" / "steels_251_300.js"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f: f.write(content)
    print(f"[OK] Generated {len(STEELS_251_300)} materials\nOutput: {out}\nSize: {out.stat().st_size / 1024:.1f} KB")

if __name__ == "__main__":
    print("PRISM Steels 251-300 Generator\n" + "=" * 50)
    generate()
    print("\n[P_STEELS now at 300/400]")
