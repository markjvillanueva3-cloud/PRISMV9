#!/usr/bin/env python3
"""
PRISM - Steel Condition Variants & International Equivalents
P-CS-301 to P-CS-350 (50 materials)
FOCUS: Multiple heat treatment conditions for critical machining grades
"""

import json
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path(r"C:\\PRISM\EXTRACTED\materials")

# Key insight: Same steel, different conditions = COMPLETELY different machining parameters
STEELS_301_350 = [
    # ══════════════════════════════════════════════════════════════════
    # 4340 COMPLETE CONDITION MATRIX (Aircraft/Automotive critical grade)
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-301", "aisi": "4340", "name": "AISI 4340 Annealed (Soft)", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "alloy_condition", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Annealed 197 HB", "hb": 197, "hrc": None, "tensile": 655, "yield": 415, "elong": 22,
     "kc11": 1850, "mc": 0.24, "mach": 57, "taylor_C": 155, "taylor_n": 0.22,
     "jc": {"A": 520, "B": 680, "n": 0.45, "C": 0.028, "m": 0.92}, "thermal_k": 38.0,
     "note": "Best machinability - rough machining before heat treat"},
    {"id": "P-CS-302", "aisi": "4340", "name": "AISI 4340 Normalized", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "alloy_condition", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Normalized 229 HB", "hb": 229, "hrc": 20, "tensile": 793, "yield": 470, "elong": 18,
     "kc11": 2020, "mc": 0.23, "mach": 52, "taylor_C": 145, "taylor_n": 0.20,
     "jc": {"A": 620, "B": 740, "n": 0.40, "C": 0.022, "m": 0.96}, "thermal_k": 38.0,
     "note": "Uniform grain structure - intermediate machining"},
    {"id": "P-CS-303", "aisi": "4340", "name": "AISI 4340 Q&T 22 HRC", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "alloy_condition", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Q&T 22 HRC (235 HB)", "hb": 235, "hrc": 22, "tensile": 830, "yield": 690, "elong": 17,
     "kc11": 2100, "mc": 0.23, "mach": 50, "taylor_C": 140, "taylor_n": 0.19,
     "jc": {"A": 680, "B": 780, "n": 0.38, "C": 0.020, "m": 0.98}, "thermal_k": 38.0,
     "note": "Soft Q&T - good balance machining/strength"},
    {"id": "P-CS-304", "aisi": "4340", "name": "AISI 4340 Q&T 32 HRC", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "alloy_condition", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Q&T 32 HRC (302 HB)", "hb": 302, "hrc": 32, "tensile": 1030, "yield": 860, "elong": 14,
     "kc11": 2380, "mc": 0.22, "mach": 42, "taylor_C": 125, "taylor_n": 0.17,
     "jc": {"A": 850, "B": 850, "n": 0.32, "C": 0.014, "m": 1.05}, "thermal_k": 38.0,
     "note": "Medium hardness - standard structural"},
    {"id": "P-CS-305", "aisi": "4340", "name": "AISI 4340 Q&T 38 HRC", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "alloy_condition", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Q&T 38 HRC (352 HB)", "hb": 352, "hrc": 38, "tensile": 1200, "yield": 1100, "elong": 12,
     "kc11": 2650, "mc": 0.21, "mach": 35, "taylor_C": 108, "taylor_n": 0.16,
     "jc": {"A": 1000, "B": 900, "n": 0.28, "C": 0.011, "m": 1.08}, "thermal_k": 38.0,
     "note": "Hard turning viable - carbide tooling"},
    {"id": "P-CS-306", "aisi": "4340", "name": "AISI 4340 Q&T 50 HRC", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "alloy_condition", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Q&T 50 HRC (480 HB)", "hb": 480, "hrc": 50, "tensile": 1620, "yield": 1520, "elong": 8,
     "kc11": 3200, "mc": 0.20, "mach": 22, "taylor_C": 78, "taylor_n": 0.13,
     "jc": {"A": 1350, "B": 950, "n": 0.24, "C": 0.008, "m": 1.12}, "thermal_k": 38.0,
     "note": "CBN/ceramic required - hard turning limit"},
    {"id": "P-CS-307", "aisi": "4340", "name": "AISI 4340 Q&T 54 HRC (Maximum)", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "alloy_condition", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Q&T 54 HRC (540 HB)", "hb": 540, "hrc": 54, "tensile": 1860, "yield": 1720, "elong": 5,
     "kc11": 3650, "mc": 0.19, "mach": 15, "taylor_C": 58, "taylor_n": 0.10,
     "jc": {"A": 1580, "B": 980, "n": 0.22, "C": 0.006, "m": 1.15}, "thermal_k": 38.0,
     "note": "Near maximum hardness - CBN grinding recommended"},
    {"id": "P-CS-308", "aisi": "4340", "name": "AISI 4340 Stress Relieved", "uns": "G43400", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "alloy_condition", "C": (0.38, 0.41, 0.43), "Ni": (1.65, 1.85, 2.00), "Cr": (0.70, 0.85, 0.90), "Mo": (0.20, 0.25, 0.30),
     "condition": "Stress Relieved 28 HRC", "hb": 277, "hrc": 28, "tensile": 965, "yield": 830, "elong": 15,
     "kc11": 2250, "mc": 0.22, "mach": 45, "taylor_C": 130, "taylor_n": 0.18,
     "jc": {"A": 780, "B": 820, "n": 0.34, "C": 0.015, "m": 1.04}, "thermal_k": 38.0,
     "note": "Reduced residual stress - precision components"},

    # ══════════════════════════════════════════════════════════════════
    # D2 TOOL STEEL CONDITION MATRIX (Die steel - critical for mold/die)
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-309", "aisi": "D2", "name": "D2 Tool Steel Annealed", "uns": "T30402", "din": "1.2379", "en": "X155CrVMo12-1",
     "subtype": "tool_condition", "C": (1.40, 1.55, 1.60), "Cr": (11.0, 12.0, 13.0), "Mo": (0.70, 0.85, 1.10), "V": (0.80, 1.00, 1.10),
     "condition": "Annealed 217 HB Max", "hb": 217, "hrc": None, "tensile": 760, "yield": 520, "elong": 12,
     "kc11": 2100, "mc": 0.23, "mach": 45, "taylor_C": 130, "taylor_n": 0.18,
     "jc": {"A": 580, "B": 780, "n": 0.42, "C": 0.020, "m": 0.98}, "thermal_k": 20.0,
     "note": "Soft annealed - machining before hardening"},
    {"id": "P-CS-310", "aisi": "D2", "name": "D2 Tool Steel 54 HRC", "uns": "T30402", "din": "1.2379", "en": "X155CrVMo12-1",
     "subtype": "tool_condition", "C": (1.40, 1.55, 1.60), "Cr": (11.0, 12.0, 13.0), "Mo": (0.70, 0.85, 1.10), "V": (0.80, 1.00, 1.10),
     "condition": "Hardened 54 HRC", "hb": 540, "hrc": 54, "tensile": 1860, "yield": 1720, "elong": 2,
     "kc11": 3700, "mc": 0.19, "mach": 14, "taylor_C": 55, "taylor_n": 0.10,
     "jc": {"A": 1600, "B": 980, "n": 0.22, "C": 0.006, "m": 1.16}, "thermal_k": 20.0,
     "note": "Low hardness end - some hard milling possible"},
    {"id": "P-CS-311", "aisi": "D2", "name": "D2 Tool Steel 58 HRC", "uns": "T30402", "din": "1.2379", "en": "X155CrVMo12-1",
     "subtype": "tool_condition", "C": (1.40, 1.55, 1.60), "Cr": (11.0, 12.0, 13.0), "Mo": (0.70, 0.85, 1.10), "V": (0.80, 1.00, 1.10),
     "condition": "Hardened 58 HRC", "hb": 600, "hrc": 58, "tensile": 2070, "yield": 1930, "elong": 1,
     "kc11": 4100, "mc": 0.18, "mach": 10, "taylor_C": 45, "taylor_n": 0.08,
     "jc": {"A": 1780, "B": 1000, "n": 0.20, "C": 0.005, "m": 1.18}, "thermal_k": 20.0,
     "note": "Working hardness - wire EDM or grinding"},
    {"id": "P-CS-312", "aisi": "D2", "name": "D2 Tool Steel 62 HRC (Max)", "uns": "T30402", "din": "1.2379", "en": "X155CrVMo12-1",
     "subtype": "tool_condition", "C": (1.40, 1.55, 1.60), "Cr": (11.0, 12.0, 13.0), "Mo": (0.70, 0.85, 1.10), "V": (0.80, 1.00, 1.10),
     "condition": "Hardened 62 HRC (Maximum)", "hb": 650, "hrc": 62, "tensile": 2280, "yield": 2150, "elong": 0,
     "kc11": 4500, "mc": 0.17, "mach": 6, "taylor_C": 35, "taylor_n": 0.06,
     "jc": {"A": 1950, "B": 1050, "n": 0.18, "C": 0.004, "m": 1.22}, "thermal_k": 20.0,
     "note": "Maximum hardness - grinding/EDM only"},

    # ══════════════════════════════════════════════════════════════════
    # H13 HOT WORK TOOL STEEL MATRIX (Die casting, forging dies)
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-313", "aisi": "H13", "name": "H13 Hot Work Annealed", "uns": "T20813", "din": "1.2344", "en": "X40CrMoV5-1",
     "subtype": "tool_condition", "C": (0.32, 0.40, 0.45), "Cr": (4.75, 5.25, 5.50), "Mo": (1.10, 1.40, 1.75), "V": (0.80, 1.00, 1.20), "Si": (0.80, 1.00, 1.20),
     "condition": "Annealed 192 HB Max", "hb": 192, "hrc": None, "tensile": 670, "yield": 450, "elong": 16,
     "kc11": 1950, "mc": 0.24, "mach": 52, "taylor_C": 145, "taylor_n": 0.20,
     "jc": {"A": 500, "B": 720, "n": 0.45, "C": 0.025, "m": 0.94}, "thermal_k": 24.0,
     "note": "Fully annealed - pre-hardened machining"},
    {"id": "P-CS-314", "aisi": "H13", "name": "H13 Hot Work Prehardened 38 HRC", "uns": "T20813", "din": "1.2344", "en": "X40CrMoV5-1",
     "subtype": "tool_condition", "C": (0.32, 0.40, 0.45), "Cr": (4.75, 5.25, 5.50), "Mo": (1.10, 1.40, 1.75), "V": (0.80, 1.00, 1.20),
     "condition": "Prehardened 38 HRC", "hb": 352, "hrc": 38, "tensile": 1200, "yield": 1050, "elong": 10,
     "kc11": 2650, "mc": 0.21, "mach": 35, "taylor_C": 108, "taylor_n": 0.16,
     "jc": {"A": 980, "B": 880, "n": 0.30, "C": 0.012, "m": 1.06}, "thermal_k": 24.0,
     "note": "Prehardened stock - machining before final heat treat"},
    {"id": "P-CS-315", "aisi": "H13", "name": "H13 Hot Work 44 HRC", "uns": "T20813", "din": "1.2344", "en": "X40CrMoV5-1",
     "subtype": "tool_condition", "C": (0.32, 0.40, 0.45), "Cr": (4.75, 5.25, 5.50), "Mo": (1.10, 1.40, 1.75), "V": (0.80, 1.00, 1.20),
     "condition": "Hardened 44 HRC", "hb": 420, "hrc": 44, "tensile": 1410, "yield": 1280, "elong": 8,
     "kc11": 2950, "mc": 0.20, "mach": 28, "taylor_C": 92, "taylor_n": 0.14,
     "jc": {"A": 1150, "B": 920, "n": 0.27, "C": 0.010, "m": 1.10}, "thermal_k": 24.0,
     "note": "Standard die casting die hardness"},
    {"id": "P-CS-316", "aisi": "H13", "name": "H13 Hot Work 48 HRC", "uns": "T20813", "din": "1.2344", "en": "X40CrMoV5-1",
     "subtype": "tool_condition", "C": (0.32, 0.40, 0.45), "Cr": (4.75, 5.25, 5.50), "Mo": (1.10, 1.40, 1.75), "V": (0.80, 1.00, 1.20),
     "condition": "Hardened 48 HRC", "hb": 460, "hrc": 48, "tensile": 1550, "yield": 1420, "elong": 6,
     "kc11": 3150, "mc": 0.20, "mach": 22, "taylor_C": 78, "taylor_n": 0.13,
     "jc": {"A": 1300, "B": 950, "n": 0.25, "C": 0.008, "m": 1.12}, "thermal_k": 24.0,
     "note": "Higher hardness - forging dies"},
    {"id": "P-CS-317", "aisi": "H13", "name": "H13 Hot Work 52 HRC (Max)", "uns": "T20813", "din": "1.2344", "en": "X40CrMoV5-1",
     "subtype": "tool_condition", "C": (0.32, 0.40, 0.45), "Cr": (4.75, 5.25, 5.50), "Mo": (1.10, 1.40, 1.75), "V": (0.80, 1.00, 1.20),
     "condition": "Hardened 52 HRC (Maximum)", "hb": 510, "hrc": 52, "tensile": 1720, "yield": 1600, "elong": 4,
     "kc11": 3400, "mc": 0.19, "mach": 18, "taylor_C": 68, "taylor_n": 0.11,
     "jc": {"A": 1450, "B": 970, "n": 0.23, "C": 0.007, "m": 1.14}, "thermal_k": 24.0,
     "note": "Maximum working hardness - CBN/ceramic"},
    {"id": "P-CS-318", "aisi": "H13", "name": "H13 Hot Work Nitrided Surface", "uns": "T20813", "din": "1.2344", "en": "X40CrMoV5-1",
     "subtype": "tool_condition", "C": (0.32, 0.40, 0.45), "Cr": (4.75, 5.25, 5.50), "Mo": (1.10, 1.40, 1.75), "V": (0.80, 1.00, 1.20),
     "condition": "48 HRC Core + Nitrided 65 HRC Surface", "hb": 460, "hrc": 65, "tensile": 1550, "yield": 1420, "elong": 6,
     "kc11": 4800, "mc": 0.16, "mach": 5, "taylor_C": 28, "taylor_n": 0.05,
     "jc": {"A": 2100, "B": 1100, "n": 0.15, "C": 0.003, "m": 1.28}, "thermal_k": 24.0,
     "note": "Nitrided surface - grinding only on case"},

    # ══════════════════════════════════════════════════════════════════
    # A2 AIR HARDENING TOOL STEEL MATRIX
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-319", "aisi": "A2", "name": "A2 Air Hardening Annealed", "uns": "T30102", "din": "1.2363", "en": "X100CrMoV5",
     "subtype": "tool_condition", "C": (0.95, 1.00, 1.05), "Cr": (4.75, 5.25, 5.50), "Mo": (0.90, 1.10, 1.40), "V": (0.15, 0.25, 0.50),
     "condition": "Annealed 212 HB Max", "hb": 212, "hrc": None, "tensile": 740, "yield": 510, "elong": 14,
     "kc11": 2050, "mc": 0.23, "mach": 48, "taylor_C": 135, "taylor_n": 0.18,
     "jc": {"A": 560, "B": 760, "n": 0.43, "C": 0.022, "m": 0.96}, "thermal_k": 24.0,
     "note": "Annealed - good machinability for die blanks"},
    {"id": "P-CS-320", "aisi": "A2", "name": "A2 Air Hardening 57-59 HRC", "uns": "T30102", "din": "1.2363", "en": "X100CrMoV5",
     "subtype": "tool_condition", "C": (0.95, 1.00, 1.05), "Cr": (4.75, 5.25, 5.50), "Mo": (0.90, 1.10, 1.40), "V": (0.15, 0.25, 0.50),
     "condition": "Hardened 58 HRC", "hb": 600, "hrc": 58, "tensile": 2070, "yield": 1930, "elong": 2,
     "kc11": 4050, "mc": 0.18, "mach": 10, "taylor_C": 45, "taylor_n": 0.08,
     "jc": {"A": 1760, "B": 990, "n": 0.20, "C": 0.005, "m": 1.18}, "thermal_k": 24.0,
     "note": "Standard die hardness - blanking/forming dies"},
    {"id": "P-CS-321", "aisi": "A2", "name": "A2 Air Hardening 62-64 HRC", "uns": "T30102", "din": "1.2363", "en": "X100CrMoV5",
     "subtype": "tool_condition", "C": (0.95, 1.00, 1.05), "Cr": (4.75, 5.25, 5.50), "Mo": (0.90, 1.10, 1.40), "V": (0.15, 0.25, 0.50),
     "condition": "Hardened 63 HRC (Maximum)", "hb": 675, "hrc": 63, "tensile": 2350, "yield": 2220, "elong": 0,
     "kc11": 4650, "mc": 0.17, "mach": 5, "taylor_C": 32, "taylor_n": 0.06,
     "jc": {"A": 2000, "B": 1080, "n": 0.17, "C": 0.004, "m": 1.24}, "thermal_k": 24.0,
     "note": "Maximum hardness - grinding/EDM only"},

    # ══════════════════════════════════════════════════════════════════
    # O1 OIL HARDENING TOOL STEEL (Common shop tool steel)
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-322", "aisi": "O1", "name": "O1 Oil Hardening Annealed", "uns": "T31501", "din": "1.2510", "en": "100MnCrW4",
     "subtype": "tool_condition", "C": (0.85, 0.95, 1.00), "Mn": (1.00, 1.20, 1.40), "Cr": (0.40, 0.50, 0.60), "W": (0.40, 0.50, 0.60), "V": (0, 0.20, 0.30),
     "condition": "Annealed 201 HB Max", "hb": 201, "hrc": None, "tensile": 700, "yield": 480, "elong": 18,
     "kc11": 1950, "mc": 0.24, "mach": 52, "taylor_C": 145, "taylor_n": 0.20,
     "jc": {"A": 520, "B": 720, "n": 0.45, "C": 0.026, "m": 0.94}, "thermal_k": 30.0,
     "note": "Annealed - excellent machinability"},
    {"id": "P-CS-323", "aisi": "O1", "name": "O1 Oil Hardening 58 HRC", "uns": "T31501", "din": "1.2510", "en": "100MnCrW4",
     "subtype": "tool_condition", "C": (0.85, 0.95, 1.00), "Mn": (1.00, 1.20, 1.40), "Cr": (0.40, 0.50, 0.60), "W": (0.40, 0.50, 0.60),
     "condition": "Hardened 58 HRC", "hb": 600, "hrc": 58, "tensile": 2070, "yield": 1930, "elong": 2,
     "kc11": 4000, "mc": 0.18, "mach": 10, "taylor_C": 45, "taylor_n": 0.08,
     "jc": {"A": 1740, "B": 980, "n": 0.20, "C": 0.006, "m": 1.17}, "thermal_k": 30.0,
     "note": "Standard gauge/jig hardness"},
    {"id": "P-CS-324", "aisi": "O1", "name": "O1 Oil Hardening 64 HRC Max", "uns": "T31501", "din": "1.2510", "en": "100MnCrW4",
     "subtype": "tool_condition", "C": (0.85, 0.95, 1.00), "Mn": (1.00, 1.20, 1.40), "Cr": (0.40, 0.50, 0.60), "W": (0.40, 0.50, 0.60),
     "condition": "Hardened 64 HRC (Maximum)", "hb": 700, "hrc": 64, "tensile": 2420, "yield": 2300, "elong": 0,
     "kc11": 4800, "mc": 0.17, "mach": 4, "taylor_C": 28, "taylor_n": 0.05,
     "jc": {"A": 2050, "B": 1100, "n": 0.16, "C": 0.003, "m": 1.26}, "thermal_k": 30.0,
     "note": "Maximum hardness - cutting tools, knives"},

    # ══════════════════════════════════════════════════════════════════
    # S7 SHOCK RESISTING TOOL STEEL
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-325", "aisi": "S7", "name": "S7 Shock Resisting Annealed", "uns": "T41907", "din": "1.2355", "en": "45CrMoV6-7",
     "subtype": "tool_condition", "C": (0.45, 0.50, 0.55), "Cr": (3.00, 3.25, 3.50), "Mo": (1.30, 1.45, 1.60), "V": (0, 0.25, 0.35),
     "condition": "Annealed 187 HB Max", "hb": 187, "hrc": None, "tensile": 650, "yield": 430, "elong": 18,
     "kc11": 1880, "mc": 0.24, "mach": 55, "taylor_C": 150, "taylor_n": 0.21,
     "jc": {"A": 480, "B": 700, "n": 0.46, "C": 0.028, "m": 0.92}, "thermal_k": 28.0,
     "note": "Annealed - impact tools, chisels"},
    {"id": "P-CS-326", "aisi": "S7", "name": "S7 Shock Resisting 52 HRC", "uns": "T41907", "din": "1.2355", "en": "45CrMoV6-7",
     "subtype": "tool_condition", "C": (0.45, 0.50, 0.55), "Cr": (3.00, 3.25, 3.50), "Mo": (1.30, 1.45, 1.60), "V": (0, 0.25, 0.35),
     "condition": "Hardened 52 HRC", "hb": 510, "hrc": 52, "tensile": 1720, "yield": 1520, "elong": 6,
     "kc11": 3350, "mc": 0.19, "mach": 18, "taylor_C": 68, "taylor_n": 0.11,
     "jc": {"A": 1420, "B": 950, "n": 0.24, "C": 0.008, "m": 1.12}, "thermal_k": 28.0,
     "note": "Standard punches, chisels"},
    {"id": "P-CS-327", "aisi": "S7", "name": "S7 Shock Resisting 58 HRC", "uns": "T41907", "din": "1.2355", "en": "45CrMoV6-7",
     "subtype": "tool_condition", "C": (0.45, 0.50, 0.55), "Cr": (3.00, 3.25, 3.50), "Mo": (1.30, 1.45, 1.60), "V": (0, 0.25, 0.35),
     "condition": "Hardened 58 HRC (Maximum)", "hb": 600, "hrc": 58, "tensile": 2070, "yield": 1900, "elong": 3,
     "kc11": 4000, "mc": 0.18, "mach": 12, "taylor_C": 50, "taylor_n": 0.09,
     "jc": {"A": 1700, "B": 990, "n": 0.21, "C": 0.006, "m": 1.16}, "thermal_k": 28.0,
     "note": "Maximum - high impact + wear"},

    # ══════════════════════════════════════════════════════════════════
    # M2 HIGH SPEED STEEL MATRIX (Cutting tools)
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-328", "aisi": "M2", "name": "M2 HSS Annealed", "uns": "T11302", "din": "1.3343", "en": "HS6-5-2",
     "subtype": "hss_condition", "C": (0.78, 0.85, 0.88), "Cr": (3.75, 4.15, 4.50), "Mo": (4.50, 5.00, 5.50), "W": (5.50, 6.35, 6.75), "V": (1.75, 1.90, 2.20),
     "condition": "Annealed 235 HB Max", "hb": 235, "hrc": None, "tensile": 820, "yield": 580, "elong": 10,
     "kc11": 2200, "mc": 0.23, "mach": 42, "taylor_C": 125, "taylor_n": 0.17,
     "jc": {"A": 640, "B": 820, "n": 0.40, "C": 0.018, "m": 1.0}, "thermal_k": 25.0,
     "note": "Annealed for machining tool blanks"},
    {"id": "P-CS-329", "aisi": "M2", "name": "M2 HSS 62 HRC", "uns": "T11302", "din": "1.3343", "en": "HS6-5-2",
     "subtype": "hss_condition", "C": (0.78, 0.85, 0.88), "Cr": (3.75, 4.15, 4.50), "Mo": (4.50, 5.00, 5.50), "W": (5.50, 6.35, 6.75), "V": (1.75, 1.90, 2.20),
     "condition": "Hardened 62 HRC", "hb": 650, "hrc": 62, "tensile": 2280, "yield": 2150, "elong": 0,
     "kc11": 4450, "mc": 0.17, "mach": 6, "taylor_C": 35, "taylor_n": 0.06,
     "jc": {"A": 1920, "B": 1040, "n": 0.18, "C": 0.004, "m": 1.22}, "thermal_k": 25.0,
     "note": "Standard cutting tool hardness"},
    {"id": "P-CS-330", "aisi": "M2", "name": "M2 HSS 65 HRC Max", "uns": "T11302", "din": "1.3343", "en": "HS6-5-2",
     "subtype": "hss_condition", "C": (0.78, 0.85, 0.88), "Cr": (3.75, 4.15, 4.50), "Mo": (4.50, 5.00, 5.50), "W": (5.50, 6.35, 6.75), "V": (1.75, 1.90, 2.20),
     "condition": "Hardened 65 HRC (Maximum)", "hb": 725, "hrc": 65, "tensile": 2520, "yield": 2400, "elong": 0,
     "kc11": 5000, "mc": 0.16, "mach": 3, "taylor_C": 25, "taylor_n": 0.04,
     "jc": {"A": 2150, "B": 1120, "n": 0.15, "C": 0.003, "m": 1.28}, "thermal_k": 25.0,
     "note": "Maximum red hardness - high speed cutting"},

    # ══════════════════════════════════════════════════════════════════
    # P20 MOLD STEEL (Injection molds - most common)
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-331", "aisi": "P20", "name": "P20 Mold Steel Annealed", "uns": "T51620", "din": "1.2311", "en": "40CrMnMo7",
     "subtype": "mold_condition", "C": (0.28, 0.35, 0.40), "Mn": (0.60, 0.85, 1.00), "Cr": (1.40, 1.70, 2.00), "Mo": (0.30, 0.45, 0.55),
     "condition": "Annealed 150 HB", "hb": 150, "hrc": None, "tensile": 520, "yield": 340, "elong": 22,
     "kc11": 1650, "mc": 0.25, "mach": 65, "taylor_C": 175, "taylor_n": 0.24,
     "jc": {"A": 380, "B": 620, "n": 0.50, "C": 0.035, "m": 0.88}, "thermal_k": 34.0,
     "note": "Annealed - rarely used, prehardened preferred"},
    {"id": "P-CS-332", "aisi": "P20", "name": "P20 Mold Steel Prehardened 28-32 HRC", "uns": "T51620", "din": "1.2311", "en": "40CrMnMo7",
     "subtype": "mold_condition", "C": (0.28, 0.35, 0.40), "Mn": (0.60, 0.85, 1.00), "Cr": (1.40, 1.70, 2.00), "Mo": (0.30, 0.45, 0.55),
     "condition": "Prehardened 30 HRC", "hb": 285, "hrc": 30, "tensile": 965, "yield": 830, "elong": 15,
     "kc11": 2280, "mc": 0.22, "mach": 45, "taylor_C": 130, "taylor_n": 0.18,
     "jc": {"A": 780, "B": 840, "n": 0.35, "C": 0.015, "m": 1.04}, "thermal_k": 34.0,
     "note": "Standard injection mold hardness - MOST COMMON"},
    {"id": "P-CS-333", "aisi": "P20", "name": "P20 Mold Steel Q&T 36 HRC", "uns": "T51620", "din": "1.2311", "en": "40CrMnMo7",
     "subtype": "mold_condition", "C": (0.28, 0.35, 0.40), "Mn": (0.60, 0.85, 1.00), "Cr": (1.40, 1.70, 2.00), "Mo": (0.30, 0.45, 0.55),
     "condition": "Q&T 36 HRC", "hb": 337, "hrc": 36, "tensile": 1140, "yield": 1000, "elong": 12,
     "kc11": 2550, "mc": 0.21, "mach": 38, "taylor_C": 115, "taylor_n": 0.16,
     "jc": {"A": 920, "B": 880, "n": 0.31, "C": 0.012, "m": 1.07}, "thermal_k": 34.0,
     "note": "Higher hardness for abrasive plastics"},
    {"id": "P-CS-334", "aisi": "P20HH", "name": "P20 Modified High Hard 40 HRC", "uns": "T51620", "din": "1.2738", "en": "40CrMnNiMo8-6-4",
     "subtype": "mold_condition", "C": (0.35, 0.40, 0.45), "Mn": (1.30, 1.50, 1.70), "Cr": (1.80, 2.00, 2.20), "Mo": (0.15, 0.25, 0.35), "Ni": (0.80, 1.00, 1.20),
     "condition": "Prehardened 40 HRC", "hb": 375, "hrc": 40, "tensile": 1280, "yield": 1140, "elong": 10,
     "kc11": 2750, "mc": 0.21, "mach": 32, "taylor_C": 100, "taylor_n": 0.15,
     "jc": {"A": 1050, "B": 910, "n": 0.29, "C": 0.010, "m": 1.09}, "thermal_k": 32.0,
     "note": "Modified P20 with Ni - large molds through hardening"},

    # ══════════════════════════════════════════════════════════════════
    # 420 STAINLESS MOLD STEEL (Corrosion resistant molds)
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-335", "aisi": "420", "name": "420 Stainless Mold Annealed", "uns": "S42000", "din": "1.2083", "en": "X42Cr13",
     "subtype": "stainless_mold_condition", "C": (0.36, 0.42, 0.50), "Cr": (12.0, 13.0, 14.0),
     "condition": "Annealed 195 HB Max", "hb": 195, "hrc": None, "tensile": 680, "yield": 470, "elong": 20,
     "kc11": 1920, "mc": 0.23, "mach": 50, "taylor_C": 140, "taylor_n": 0.19,
     "jc": {"A": 520, "B": 740, "n": 0.44, "C": 0.024, "m": 0.95}, "thermal_k": 24.0,
     "note": "Annealed for machining"},
    {"id": "P-CS-336", "aisi": "420", "name": "420 Stainless Mold Prehardened 30 HRC", "uns": "S42000", "din": "1.2083", "en": "X42Cr13",
     "subtype": "stainless_mold_condition", "C": (0.36, 0.42, 0.50), "Cr": (12.0, 13.0, 14.0),
     "condition": "Prehardened 30 HRC", "hb": 285, "hrc": 30, "tensile": 980, "yield": 850, "elong": 14,
     "kc11": 2300, "mc": 0.22, "mach": 42, "taylor_C": 125, "taylor_n": 0.17,
     "jc": {"A": 800, "B": 850, "n": 0.36, "C": 0.016, "m": 1.02}, "thermal_k": 24.0,
     "note": "Standard prehardened stainless mold"},
    {"id": "P-CS-337", "aisi": "420", "name": "420 Stainless Mold 50 HRC", "uns": "S42000", "din": "1.2083", "en": "X42Cr13",
     "subtype": "stainless_mold_condition", "C": (0.36, 0.42, 0.50), "Cr": (12.0, 13.0, 14.0),
     "condition": "Hardened 50 HRC", "hb": 480, "hrc": 50, "tensile": 1620, "yield": 1500, "elong": 5,
     "kc11": 3250, "mc": 0.19, "mach": 20, "taylor_C": 72, "taylor_n": 0.12,
     "jc": {"A": 1380, "B": 940, "n": 0.25, "C": 0.008, "m": 1.12}, "thermal_k": 24.0,
     "note": "High polish molds - optical parts"},
    {"id": "P-CS-338", "aisi": "420ESR", "name": "420 ESR Stainless Premium 52 HRC", "uns": "S42000", "din": "1.2083ESR", "en": "X42Cr13ESR",
     "subtype": "stainless_mold_condition", "C": (0.38, 0.42, 0.48), "Cr": (12.5, 13.5, 14.5),
     "condition": "ESR + Hardened 52 HRC", "hb": 510, "hrc": 52, "tensile": 1720, "yield": 1600, "elong": 4,
     "kc11": 3400, "mc": 0.19, "mach": 18, "taylor_C": 68, "taylor_n": 0.11,
     "jc": {"A": 1450, "B": 960, "n": 0.23, "C": 0.007, "m": 1.14}, "thermal_k": 24.0,
     "note": "ESR quality - superior polish, lens molds"},

    # ══════════════════════════════════════════════════════════════════
    # INTERNATIONAL EQUIVALENTS (DIN/EN Focus)
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-339", "aisi": "", "name": "DIN 1.7225 42CrMo4 Normalized", "uns": "", "din": "1.7225", "en": "42CrMo4",
     "subtype": "din_equivalent", "C": (0.38, 0.42, 0.45), "Cr": (0.90, 1.10, 1.20), "Mo": (0.15, 0.22, 0.30),
     "condition": "Normalized (+N)", "hb": 210, "tensile": 710, "yield": 470, "elong": 16,
     "kc11": 2000, "mc": 0.23, "mach": 52, "taylor_C": 145, "taylor_n": 0.20,
     "jc": {"A": 560, "B": 760, "n": 0.42, "C": 0.024, "m": 0.96}, "thermal_k": 42.0,
     "note": "European 4140 equivalent - normalized condition"},
    {"id": "P-CS-340", "aisi": "", "name": "DIN 1.7225 42CrMo4 Q&T +QT", "uns": "", "din": "1.7225", "en": "42CrMo4",
     "subtype": "din_equivalent", "C": (0.38, 0.42, 0.45), "Cr": (0.90, 1.10, 1.20), "Mo": (0.15, 0.22, 0.30),
     "condition": "Quenched & Tempered (+QT) 30 HRC", "hb": 285, "hrc": 30, "tensile": 1000, "yield": 900, "elong": 11,
     "kc11": 2300, "mc": 0.22, "mach": 45, "taylor_C": 130, "taylor_n": 0.18,
     "jc": {"A": 820, "B": 860, "n": 0.34, "C": 0.014, "m": 1.04}, "thermal_k": 42.0,
     "note": "European 4140 Q&T condition"},
    {"id": "P-CS-341", "aisi": "", "name": "DIN 1.6582 34CrNiMo6 +N", "uns": "", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "din_equivalent", "C": (0.30, 0.34, 0.38), "Cr": (1.30, 1.50, 1.70), "Ni": (1.30, 1.50, 1.70), "Mo": (0.15, 0.22, 0.30),
     "condition": "Normalized (+N)", "hb": 220, "tensile": 760, "yield": 530, "elong": 14,
     "kc11": 2080, "mc": 0.23, "mach": 50, "taylor_C": 140, "taylor_n": 0.19,
     "jc": {"A": 600, "B": 780, "n": 0.40, "C": 0.022, "m": 0.98}, "thermal_k": 38.0,
     "note": "European 4340 equivalent - normalized"},
    {"id": "P-CS-342", "aisi": "", "name": "DIN 1.6582 34CrNiMo6 +QT", "uns": "", "din": "1.6582", "en": "34CrNiMo6",
     "subtype": "din_equivalent", "C": (0.30, 0.34, 0.38), "Cr": (1.30, 1.50, 1.70), "Ni": (1.30, 1.50, 1.70), "Mo": (0.15, 0.22, 0.30),
     "condition": "Quenched & Tempered (+QT) 32 HRC", "hb": 302, "hrc": 32, "tensile": 1050, "yield": 900, "elong": 11,
     "kc11": 2400, "mc": 0.22, "mach": 42, "taylor_C": 125, "taylor_n": 0.17,
     "jc": {"A": 870, "B": 870, "n": 0.33, "C": 0.014, "m": 1.05}, "thermal_k": 38.0,
     "note": "European 4340 Q&T condition"},
    {"id": "P-CS-343", "aisi": "", "name": "DIN 1.7131 16MnCr5 Case Hardening", "uns": "", "din": "1.7131", "en": "16MnCr5",
     "subtype": "din_equivalent", "C": (0.14, 0.17, 0.19), "Mn": (1.00, 1.15, 1.30), "Cr": (0.80, 1.00, 1.10),
     "condition": "Case Hardened 60 HRC surface", "hb": 600, "hrc": 60, "tensile": 2000, "yield": 1800, "elong": 3,
     "kc11": 4200, "mc": 0.18, "mach": 12, "taylor_C": 50, "taylor_n": 0.09,
     "jc": {"A": 1700, "B": 980, "n": 0.22, "C": 0.006, "m": 1.16}, "thermal_k": 46.0,
     "note": "European 5115 equivalent - carburized gears"},
    {"id": "P-CS-344", "aisi": "", "name": "DIN 1.7147 20MnCr5 Case Hardening", "uns": "", "din": "1.7147", "en": "20MnCr5",
     "subtype": "din_equivalent", "C": (0.17, 0.20, 0.22), "Mn": (1.10, 1.25, 1.40), "Cr": (1.00, 1.15, 1.30),
     "condition": "Case Hardened 60 HRC surface", "hb": 600, "hrc": 60, "tensile": 2000, "yield": 1850, "elong": 3,
     "kc11": 4250, "mc": 0.18, "mach": 12, "taylor_C": 48, "taylor_n": 0.09,
     "jc": {"A": 1720, "B": 985, "n": 0.21, "C": 0.006, "m": 1.17}, "thermal_k": 44.0,
     "note": "European 5120 equivalent - heavy duty gears"},
    {"id": "P-CS-345", "aisi": "", "name": "DIN 1.6587 18CrNiMo7-6 Carburizing", "uns": "", "din": "1.6587", "en": "18CrNiMo7-6",
     "subtype": "din_equivalent", "C": (0.15, 0.18, 0.21), "Cr": (1.50, 1.70, 1.80), "Ni": (1.40, 1.55, 1.70), "Mo": (0.25, 0.30, 0.35),
     "condition": "Carburized 61 HRC surface", "hb": 615, "hrc": 61, "tensile": 2070, "yield": 1950, "elong": 3,
     "kc11": 4350, "mc": 0.18, "mach": 11, "taylor_C": 46, "taylor_n": 0.08,
     "jc": {"A": 1780, "B": 995, "n": 0.20, "C": 0.006, "m": 1.18}, "thermal_k": 36.0,
     "note": "European premium gear steel - wind turbines"},

    # ══════════════════════════════════════════════════════════════════
    # COLD WORKED/STRAIN HARDENED CONDITIONS
    # ══════════════════════════════════════════════════════════════════
    {"id": "P-CS-346", "aisi": "1045", "name": "AISI 1045 Cold Drawn", "uns": "G10450", "din": "1.1191", "en": "C45",
     "subtype": "cold_worked", "C": (0.43, 0.46, 0.50), "Mn": (0.60, 0.75, 0.90),
     "condition": "Cold Drawn +5-10% area reduction", "hb": 225, "hrc": 20, "tensile": 765, "yield": 610, "elong": 12,
     "kc11": 2100, "mc": 0.23, "mach": 50, "taylor_C": 140, "taylor_n": 0.19,
     "jc": {"A": 660, "B": 790, "n": 0.38, "C": 0.018, "m": 1.0}, "thermal_k": 49.0,
     "note": "Cold drawn bar - improved straightness + yield"},
    {"id": "P-CS-347", "aisi": "12L14", "name": "12L14 Cold Drawn Free Cutting", "uns": "G12144", "din": "1.0718", "en": "11SMnPb30",
     "subtype": "cold_worked", "C": (0, 0.10, 0.15), "Mn": (0.85, 1.05, 1.15), "Pb": (0.15, 0.25, 0.35), "S": (0.26, 0.32, 0.35),
     "condition": "Cold Drawn", "hb": 165, "tensile": 540, "yield": 415, "elong": 18,
     "kc11": 1500, "mc": 0.26, "mach": 100, "taylor_C": 250, "taylor_n": 0.32,
     "jc": {"A": 380, "B": 580, "n": 0.55, "C": 0.050, "m": 0.82}, "thermal_k": 51.0,
     "note": "100% machinability reference - screw machine stock"},
    {"id": "P-CS-348", "aisi": "1018", "name": "AISI 1018 Cold Rolled Sheet", "uns": "G10180", "din": "1.0453", "en": "DC04",
     "subtype": "cold_worked", "C": (0.15, 0.18, 0.20), "Mn": (0.60, 0.75, 0.90),
     "condition": "Cold Rolled", "hb": 140, "tensile": 440, "yield": 370, "elong": 15,
     "kc11": 1580, "mc": 0.25, "mach": 65, "taylor_C": 175, "taylor_n": 0.24,
     "jc": {"A": 360, "B": 600, "n": 0.52, "C": 0.040, "m": 0.86}, "thermal_k": 51.0,
     "note": "Cold rolled sheet/strip - forming applications"},
    {"id": "P-CS-349", "aisi": "4140", "name": "AISI 4140 Cold Drawn Pre-turned", "uns": "G41400", "din": "1.7225", "en": "42CrMo4",
     "subtype": "cold_worked", "C": (0.38, 0.41, 0.43), "Cr": (0.80, 0.95, 1.10), "Mo": (0.15, 0.20, 0.25),
     "condition": "Cold Drawn + Stress Relieved", "hb": 260, "hrc": 26, "tensile": 900, "yield": 790, "elong": 14,
     "kc11": 2200, "mc": 0.22, "mach": 48, "taylor_C": 135, "taylor_n": 0.18,
     "jc": {"A": 740, "B": 840, "n": 0.36, "C": 0.016, "m": 1.02}, "thermal_k": 42.0,
     "note": "Precision ground bar stock - ready to machine"},
    {"id": "P-CS-350", "aisi": "8620", "name": "AISI 8620 Cold Drawn Case Hardening", "uns": "G86200", "din": "1.6523", "en": "21NiCrMo2",
     "subtype": "cold_worked", "C": (0.18, 0.20, 0.23), "Ni": (0.40, 0.55, 0.70), "Cr": (0.40, 0.50, 0.60), "Mo": (0.15, 0.20, 0.25),
     "condition": "Cold Drawn 185 HB", "hb": 185, "tensile": 630, "yield": 520, "elong": 16,
     "kc11": 1850, "mc": 0.24, "mach": 55, "taylor_C": 150, "taylor_n": 0.21,
     "jc": {"A": 500, "B": 720, "n": 0.44, "C": 0.026, "m": 0.94}, "thermal_k": 46.0,
     "note": "Cold drawn case hardening grade - gears before carburizing"}
]


def build_steel(s):
    C = s.get("C", (0.30, 0.40, 0.50)); Mn = s.get("Mn", (0.50, 0.75, 1.00)); Si = s.get("Si", (0.15, 0.25, 0.35))
    Cr = s.get("Cr", (0, 0, 0)); Mo = s.get("Mo", (0, 0, 0)); V = s.get("V", (0, 0, 0)); Ni = s.get("Ni", (0, 0, 0))
    W = s.get("W", (0, 0, 0)); Pb = s.get("Pb", (0, 0, 0)); S = s.get("S", (0, 0.02, 0.04))
    hb = s["hb"]; hrc = s.get("hrc"); tensile = s["tensile"]; yield_str = s["yield"]; elong = s.get("elong", 10)
    thermal_k = s.get("thermal_k", 40.0); subtype = s.get("subtype", "condition_variant"); jc = s["jc"]
    density = 7850 - (C[1] * 30) - (Cr[1] * 5) + (W[1] * 50)
    melting = 1500 - (C[1] * 80)
    
    return {
        "id": s["id"], "name": s["name"],
        "designation": {"aisi_sae": s.get("aisi", ""), "uns": s.get("uns", ""), "din": s.get("din", ""), "en": s.get("en", "")},
        "iso_group": "P" if (hrc is None or hrc < 45) else "H", 
        "material_class": f"Steel - {subtype.replace('_', ' ').title()}",
        "condition": s["condition"],
        "composition": {"carbon": {"min": C[0], "max": C[2], "typical": C[1]}, "chromium": {"min": Cr[0], "max": Cr[2], "typical": Cr[1]},
                       "molybdenum": {"min": Mo[0], "max": Mo[2], "typical": Mo[1]}, "vanadium": {"min": V[0], "max": V[2], "typical": V[1]},
                       "nickel": {"min": Ni[0], "max": Ni[2], "typical": Ni[1]}, "tungsten": {"min": W[0], "max": W[2], "typical": W[1]}},
        "physical": {"density": int(density), "melting_point": {"solidus": int(melting)}, "thermal_conductivity": thermal_k},
        "mechanical": {"hardness": {"brinell": hb, "rockwell_c": hrc, "vickers": int(hb * 1.05) if hb else None},
                      "tensile_strength": {"typical": tensile}, "yield_strength": {"typical": yield_str}, "elongation": {"typical": elong}},
        "kienzle": {"kc1_1": s["kc11"], "mc": s["mc"]},
        "johnson_cook": {"A": jc["A"], "B": jc["B"], "C": jc["C"], "n": jc["n"], "m": jc["m"]},
        "taylor": {"C": s["taylor_C"], "n": s["taylor_n"]},
        "machinability": {"aisi_rating": s["mach"], "relative_to_1212": s["mach"] / 100},
        "notes": s.get("note", "")
    }


def generate():
    header = f'''/**
 * PRISM MATERIALS DATABASE - Heat Treatment Condition Variants
 * File: steels_301_350.js - P-CS-301 to P-CS-350 (50 materials)
 * FOCUS: Complete condition matrices for critical machining grades
 * - 4340: 8 conditions (Annealed through 54 HRC)
 * - D2, H13, A2, O1, S7, M2: Annealed + Multiple hardened states
 * - P20, 420 Mold Steels: Multiple prehardened + hardened
 * - DIN/EN equivalents with European condition designations
 * - Cold worked/strain hardened variants
 * Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 */
const STEELS_301_350 = {{
  metadata: {{file: "steels_301_350.js", category: "P_STEELS", materialCount: {len(STEELS_301_350)}, 
             focus: "Heat treatment condition variants - critical for accurate cutting parameter selection"}},
  materials: {{
'''
    mats = [f'    "{s["id"]}": ' + json.dumps(build_steel(s), indent=6).replace('\n', '\n    ') for s in STEELS_301_350]
    footer = '\n  }\n};\nif (typeof module !== "undefined") module.exports = STEELS_301_350;\n'
    content = header + ',\n\n'.join(mats) + footer
    
    out = OUTPUT_DIR / "P_STEELS" / "steels_301_350.js"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f: f.write(content)
    print(f"[OK] Generated {len(STEELS_301_350)} materials\nOutput: {out}\nSize: {out.stat().st_size / 1024:.1f} KB")

if __name__ == "__main__":
    print("PRISM Steels 301-350 Generator - CONDITION VARIANTS")
    print("=" * 60)
    print("FOCUS: Multiple heat treatment states for same base alloy")
    print("- 4340: Annealed to 54 HRC (8 conditions)")
    print("- Tool Steels: Annealed to Maximum hardness")
    print("- International equivalents with condition codes")
    print("=" * 60)
    generate()
    print("\n[P_STEELS now at 350/400]")
