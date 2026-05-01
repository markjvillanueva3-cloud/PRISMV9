#!/usr/bin/env python3
"""
PRISM Materials Deep Accuracy Pass v1
Replaces group-level defaults with alloy-specific and subcategory-specific data.
Resolution cascade: exact alloy -> subcategory -> parametric model -> keep existing.
"""

import json
import os
import re
import math
import logging
import sys
from pathlib import Path
from datetime import datetime
from copy import deepcopy

# ── Configuration ──────────────────────────────────────────────────────────────

MATERIALS_ROOT = Path(r"C:\PRISM\data\materials")
MASTER_INDEX = MATERIALS_ROOT / "MATERIALS_MASTER.json"
LOG_DIR = Path(r"C:\PRISM\state\logs")
LOG_FILE = LOG_DIR / "deep_accuracy_log.json"

CATEGORY_DIRS = [
    "P_STEELS", "M_STAINLESS", "K_CAST_IRON",
    "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"
]

SKIP_FILES = {"index.json", "MATERIALS_MASTER.json"}

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("deep_accuracy")

# ── REFERENCE TABLE 1: Johnson-Cook Parameters ────────────────────────────────
# Format: {alloy_key: (A_MPa, B_MPa, n, C, m, source)}
# A=yield, B=hardening modulus, n=hardening exp, C=strain rate sens, m=thermal softening

JC_ALLOYS = {
    # ── Low Carbon Steels ──
    "1006":  (350, 275, 0.36, 0.022, 1.00, "Johnson_Cook_1983"),
    "1008":  (360, 290, 0.35, 0.022, 1.00, "Interpolated_1006_1010"),
    "1010":  (370, 310, 0.34, 0.022, 1.00, "Lee_Lin_1998"),
    "1015":  (385, 340, 0.32, 0.020, 1.00, "Jaspers_Dautzenberg_2002"),
    "1018":  (310, 525, 0.26, 0.022, 1.00, "Johnson_Cook_1983"),
    "1019":  (315, 530, 0.26, 0.022, 1.00, "Interpolated_1018_1020"),
    "1020":  (320, 540, 0.26, 0.022, 1.00, "Johnson_Cook_1983"),
    "1025":  (345, 560, 0.25, 0.020, 1.00, "Interpolated_1020_1030"),
    "1030":  (370, 580, 0.24, 0.020, 1.05, "Interpolated_series"),
    # ── Medium Carbon Steels ──
    "1035":  (400, 600, 0.23, 0.018, 1.05, "Interpolated_series"),
    "1040":  (430, 620, 0.22, 0.018, 1.05, "Lesuer_2000"),
    "1045":  (553, 601, 0.234, 0.013, 1.00, "Jaspers_Dautzenberg_2002"),
    "1050":  (580, 620, 0.22, 0.012, 1.00, "Interpolated_1045_1060"),
    "1055":  (610, 640, 0.21, 0.012, 1.00, "Interpolated_series"),
    "1060":  (640, 660, 0.20, 0.011, 1.00, "Interpolated_series"),
    # ── High Carbon Steels ──
    "1070":  (680, 700, 0.19, 0.010, 1.00, "Interpolated_series"),
    "1074":  (700, 720, 0.18, 0.010, 1.00, "Interpolated_series"),
    "1080":  (720, 750, 0.17, 0.010, 1.00, "Brar_2009"),
    "1090":  (750, 780, 0.16, 0.009, 1.00, "Interpolated_series"),
    "1095":  (780, 800, 0.15, 0.009, 1.00, "Brar_2009"),
    # ── Free Machining Steels ──
    "1117":  (350, 480, 0.28, 0.020, 1.00, "Interpolated_free_machining"),
    "1137":  (420, 560, 0.24, 0.018, 1.00, "Interpolated_free_machining"),
    "1141":  (450, 580, 0.23, 0.016, 1.00, "Interpolated_free_machining"),
    "1144":  (470, 600, 0.22, 0.016, 1.00, "Interpolated_free_machining"),
    "1212":  (300, 450, 0.30, 0.025, 1.00, "Reference_machinability"),
    "1215":  (290, 440, 0.30, 0.025, 1.00, "Reference_machinability"),
    # ── Alloy Steels - Chromoly ──
    "4130":  (595, 580, 0.23, 0.017, 1.00, "Lee_Lin_1998"),
    "4135":  (620, 600, 0.22, 0.016, 1.00, "Interpolated_4130_4140"),
    "4140":  (595, 580, 0.23, 0.017, 1.03, "Johnson_Cook_1983"),
    "4142":  (610, 590, 0.22, 0.017, 1.03, "Interpolated_4140_4150"),
    "4145":  (640, 610, 0.21, 0.016, 1.03, "Interpolated_4140_4150"),
    "4150":  (680, 640, 0.20, 0.015, 1.03, "Interpolated_series"),
    # ── Alloy Steels - NiCrMo ──
    "4320":  (560, 560, 0.24, 0.018, 1.05, "Interpolated_43xx"),
    "4330":  (610, 600, 0.22, 0.016, 1.05, "Interpolated_43xx"),
    "4340":  (792, 510, 0.26, 0.014, 1.03, "Johnson_Cook_1983"),
    "4340H": (810, 520, 0.25, 0.014, 1.03, "Derived_4340"),
    # ── Alloy Steels - Other ──
    "5120":  (480, 520, 0.25, 0.018, 1.00, "Interpolated_51xx"),
    "5140":  (560, 570, 0.23, 0.016, 1.02, "Interpolated_51xx"),
    "5160":  (650, 630, 0.20, 0.014, 1.02, "Interpolated_51xx"),
    "8620":  (510, 540, 0.24, 0.018, 1.03, "Lesuer_2000"),
    "8640":  (600, 590, 0.22, 0.016, 1.03, "Interpolated_86xx"),
    "9260":  (620, 610, 0.21, 0.015, 1.00, "Interpolated_series"),
    "52100": (620, 650, 0.18, 0.012, 1.00, "Umbrello_2007"),
    "300M":  (1280, 1100, 0.18, 0.010, 1.00, "Brar_2009"),
    # ── Tool Steels ──
    "A2":    (1150, 750, 0.15, 0.010, 0.90, "Umbrello_2007"),
    "D2":    (1350, 600, 0.12, 0.008, 0.85, "Umbrello_2007"),
    "H13":   (908, 650, 0.18, 0.012, 1.05, "Shatla_2001"),
    "H11":   (880, 640, 0.18, 0.012, 1.05, "Derived_H13"),
    "M2":    (1400, 550, 0.10, 0.008, 0.80, "Interpolated_tool"),
    "M4":    (1450, 560, 0.10, 0.008, 0.80, "Interpolated_tool"),
    "O1":    (950, 680, 0.16, 0.010, 0.90, "Interpolated_tool"),
    "S7":    (1050, 720, 0.15, 0.010, 0.95, "Interpolated_tool"),
    "W1":    (880, 700, 0.17, 0.012, 0.95, "Interpolated_tool"),
    "P20":   (750, 600, 0.20, 0.014, 1.00, "Interpolated_mold"),
    # ── Stainless Steels - Austenitic ──
    "304":   (310, 1000, 0.65, 0.07, 1.00, "Lee_Lin_1998"),
    "304L":  (280, 950, 0.65, 0.07, 1.00, "Derived_304"),
    "316":   (305, 1080, 0.62, 0.06, 1.00, "Chandrasekaran_2004"),
    "316L":  (290, 1050, 0.62, 0.06, 1.00, "Chandrasekaran_2004"),
    "301":   (340, 1050, 0.64, 0.06, 1.00, "Interpolated_austenitic"),
    "303":   (300, 980, 0.65, 0.07, 1.00, "Interpolated_austenitic"),
    "309":   (290, 1020, 0.63, 0.06, 1.00, "Interpolated_austenitic"),
    "310":   (285, 1010, 0.63, 0.06, 1.00, "Interpolated_austenitic"),
    "321":   (310, 1000, 0.64, 0.07, 1.00, "Interpolated_austenitic"),
    "347":   (315, 1010, 0.64, 0.07, 1.00, "Interpolated_austenitic"),
    "904L":  (270, 980, 0.60, 0.05, 1.00, "Interpolated_super_austenitic"),
    "254SMO":(290, 1020, 0.58, 0.05, 1.00, "Interpolated_super_austenitic"),
    "AL6XN": (280, 1000, 0.59, 0.05, 1.00, "Interpolated_super_austenitic"),
    # ── Stainless Steels - Martensitic ──
    "410":   (600, 650, 0.22, 0.015, 1.00, "Interpolated_martensitic"),
    "420":   (700, 700, 0.20, 0.012, 1.00, "Interpolated_martensitic"),
    "440C":  (850, 750, 0.16, 0.010, 0.95, "Interpolated_martensitic"),
    # ── Stainless Steels - Ferritic ──
    "430":   (420, 550, 0.28, 0.020, 1.00, "Interpolated_ferritic"),
    "434":   (440, 560, 0.27, 0.020, 1.00, "Interpolated_ferritic"),
    "446":   (450, 570, 0.27, 0.018, 1.00, "Interpolated_ferritic"),
    # ── Stainless Steels - Duplex ──
    "2205":  (550, 850, 0.45, 0.04, 1.00, "Iturbe_2017"),
    "2507":  (600, 900, 0.42, 0.04, 1.00, "Derived_2205"),
    "2304":  (520, 830, 0.46, 0.04, 1.00, "Derived_2205"),
    # ── Stainless Steels - PH ──
    "17-4PH":(1100, 680, 0.16, 0.009, 1.00, "Iturbe_2017"),
    "15-5PH":(1050, 650, 0.17, 0.010, 1.00, "Derived_17_4PH"),
    "17-7PH":(1000, 700, 0.18, 0.010, 1.00, "Derived_17_4PH"),
    "PH13-8":(1150, 700, 0.15, 0.009, 1.00, "Derived_17_4PH"),
    # ── Aluminum Alloys ──
    "1100":  (28, 85, 0.40, 0.010, 1.00, "Lesuer_2000"),
    "2014":  (290, 425, 0.34, 0.015, 1.00, "Interpolated_2xxx"),
    "2017":  (280, 410, 0.35, 0.015, 1.00, "Interpolated_2xxx"),
    "2024":  (265, 426, 0.34, 0.015, 1.00, "Lesuer_2000"),
    "2219":  (250, 400, 0.35, 0.015, 1.00, "Interpolated_2xxx"),
    "3003":  (65, 150, 0.38, 0.012, 1.00, "Interpolated_3xxx"),
    "5052":  (135, 310, 0.34, 0.010, 1.00, "Interpolated_5xxx"),
    "5083":  (167, 350, 0.32, 0.010, 1.00, "Lesuer_2000"),
    "5086":  (160, 340, 0.33, 0.010, 1.00, "Interpolated_5xxx"),
    "6061":  (270, 155, 0.20, 0.015, 1.34, "Lesuer_2000"),
    "6063":  (180, 120, 0.25, 0.015, 1.30, "Interpolated_6xxx"),
    "6082":  (260, 150, 0.21, 0.015, 1.32, "Interpolated_6xxx"),
    "7050":  (460, 370, 0.24, 0.010, 1.00, "Interpolated_7xxx"),
    "7075":  (520, 477, 0.25, 0.010, 1.61, "Lesuer_2000"),
    "7178":  (540, 490, 0.24, 0.010, 1.60, "Interpolated_7xxx"),
    "A356":  (200, 250, 0.28, 0.012, 1.00, "Tounsi_2002"),
    "A380":  (170, 220, 0.30, 0.015, 1.00, "Interpolated_cast_al"),
    "A390":  (220, 280, 0.25, 0.012, 1.00, "Interpolated_cast_al"),
    # ── Titanium ──
    "TI6AL4V":   (862, 331, 0.34, 0.012, 0.80, "Lee_Lin_1998"),
    "TI6AL4VELI":(840, 320, 0.34, 0.012, 0.80, "Derived_Ti64"),
    "TI6AL2SN":  (820, 310, 0.35, 0.013, 0.82, "Interpolated_Ti"),
    "TICP2":     (390, 260, 0.36, 0.020, 0.80, "Nemat_Nasser_2001"),
    "TICP4":     (480, 290, 0.34, 0.018, 0.80, "Interpolated_TiCP"),
    "TI6246":    (950, 380, 0.30, 0.010, 0.78, "Interpolated_Ti"),
    "TI5553":    (1050, 400, 0.28, 0.009, 0.76, "Interpolated_Ti"),
    "TI17":      (980, 390, 0.29, 0.010, 0.78, "Interpolated_Ti"),
    # ── Nickel Superalloys ──
    "IN718":  (1200, 1284, 0.54, 0.006, 1.20, "Iturbe_2017"),
    "IN625":  (780, 1050, 0.50, 0.008, 1.15, "Iturbe_2017"),
    "IN600":  (550, 800, 0.55, 0.010, 1.10, "Interpolated_Ni"),
    "IN825":  (480, 750, 0.52, 0.012, 1.10, "Interpolated_Ni"),
    "WASPALOY":(900, 1100, 0.48, 0.007, 1.15, "Iturbe_2017"),
    "RENE41": (950, 1150, 0.46, 0.006, 1.18, "Interpolated_Ni"),
    "HASTELLOY_X": (520, 850, 0.50, 0.010, 1.10, "Interpolated_Ni"),
    "HASTELLOY_C276": (550, 880, 0.48, 0.009, 1.12, "Interpolated_Ni"),
    "NIMONIC80A": (800, 1050, 0.45, 0.007, 1.15, "Interpolated_Ni"),
    "NIMONIC90":  (850, 1100, 0.44, 0.007, 1.15, "Interpolated_Ni"),
    "UDIMET720": (1000, 1200, 0.42, 0.006, 1.20, "Interpolated_Ni"),
    "HAYNES230":  (480, 850, 0.52, 0.010, 1.10, "Interpolated_Ni"),
    "HAYNES282":  (750, 1000, 0.46, 0.007, 1.15, "Interpolated_Ni"),
    "MAR_M247":   (1050, 1250, 0.40, 0.005, 1.22, "Interpolated_Ni"),
    # ── Cobalt Alloys ──
    "STELLITE6": (750, 800, 0.35, 0.008, 0.90, "Interpolated_Co"),
    "STELLITE21":(600, 700, 0.38, 0.010, 0.90, "Interpolated_Co"),
    "L605":      (520, 750, 0.45, 0.010, 1.00, "Interpolated_Co"),
    "MP35N":     (850, 950, 0.40, 0.008, 1.00, "Interpolated_Co"),
    # ── Copper Alloys ──
    "C11000": (70, 250, 0.42, 0.025, 1.00, "Interpolated_Cu"),
    "C17200": (900, 350, 0.18, 0.012, 0.90, "Interpolated_CuBe"),
    "C26000": (200, 420, 0.40, 0.020, 1.00, "Interpolated_brass"),
    "C36000": (280, 380, 0.35, 0.020, 1.00, "Interpolated_brass"),
    "C51000": (350, 480, 0.38, 0.015, 1.00, "Interpolated_bronze"),
    "C93200": (150, 300, 0.35, 0.018, 1.00, "Interpolated_bronze"),
    # ── Specialty ──
    "MARAGING250": (1350, 450, 0.12, 0.008, 0.80, "Brar_2009"),
    "MARAGING300": (1500, 480, 0.11, 0.007, 0.78, "Derived_maraging"),
    "MARAGING350": (1650, 500, 0.10, 0.007, 0.76, "Derived_maraging"),
}

# ── Subcategory J-C Defaults (when no exact alloy match) ──
JC_SUBCATEGORY = {
    "low_carbon_steel":    (350, 310, 0.34, 0.022, 1.00, "Subcategory_low_C"),
    "carbon_steels":       (350, 310, 0.34, 0.022, 1.00, "Subcategory_low_C"),
    "medium_carbon_steel": (530, 600, 0.23, 0.015, 1.00, "Subcategory_med_C"),
    "high_carbon_steel":   (720, 750, 0.17, 0.010, 1.00, "Subcategory_high_C"),
    "general_steels":      (500, 560, 0.24, 0.017, 1.00, "Subcategory_gen_steel"),
    "chromoly":            (600, 580, 0.23, 0.017, 1.02, "Subcategory_chromoly"),
    "nickel_chromoly":     (700, 550, 0.24, 0.015, 1.03, "Subcategory_NiCrMo"),
    "alloy_steel":         (560, 560, 0.24, 0.017, 1.02, "Subcategory_alloy"),
    "free_machining":      (380, 500, 0.27, 0.022, 1.00, "Subcategory_free_mach"),
    "spring_steel":        (640, 620, 0.20, 0.014, 1.02, "Subcategory_spring"),
    "spring_steels":       (640, 620, 0.20, 0.014, 1.02, "Subcategory_spring"),
    "structural_steel":    (400, 530, 0.25, 0.018, 1.00, "Subcategory_structural"),
    "bearing_steel":       (620, 650, 0.18, 0.012, 1.00, "Subcategory_bearing"),
    "case_hardening":      (550, 560, 0.24, 0.018, 1.02, "Subcategory_case"),
    "mold_steel":          (750, 600, 0.20, 0.014, 1.00, "Subcategory_mold"),
    "cold_work":           (1100, 700, 0.14, 0.010, 0.90, "Subcategory_cw_tool"),
    "cold_work_tool":      (1100, 700, 0.14, 0.010, 0.90, "Subcategory_cw_tool"),
    "hot_work":            (900, 650, 0.18, 0.012, 1.05, "Subcategory_hw_tool"),
    "hot_work_tool":       (900, 650, 0.18, 0.012, 1.05, "Subcategory_hw_tool"),
    "high_speed":          (1400, 550, 0.10, 0.008, 0.80, "Subcategory_hss"),
    "shock_resistant":     (1050, 720, 0.15, 0.010, 0.95, "Subcategory_shock"),
    "tool_steel_hardened": (1200, 700, 0.14, 0.009, 0.90, "Subcategory_tool_hard"),
    "pm_tool":             (1350, 580, 0.11, 0.008, 0.82, "Subcategory_pm_tool"),
    "austenitic":          (310, 1000, 0.65, 0.070, 1.00, "Subcategory_austenitic"),
    "super_austenitic":    (280, 1000, 0.59, 0.050, 1.00, "Subcategory_super_aus"),
    "martensitic":         (650, 680, 0.21, 0.013, 1.00, "Subcategory_martensitic"),
    "ferritic":            (420, 550, 0.28, 0.020, 1.00, "Subcategory_ferritic"),
    "duplex":              (550, 850, 0.45, 0.040, 1.00, "Subcategory_duplex"),
    "precipitation_hardening": (1100, 680, 0.16, 0.009, 1.00, "Subcategory_PH"),
    "free_machining_austenitic": (300, 950, 0.62, 0.060, 1.00, "Subcategory_fm_aus"),
    "general_stainless":   (400, 750, 0.40, 0.030, 1.00, "Subcategory_gen_ss"),
    "stainless":           (400, 750, 0.40, 0.030, 1.00, "Subcategory_gen_ss"),
    "gray_iron":           (250, 400, 0.25, 0.015, 0.80, "Subcategory_gray_CI"),
    "ductile_iron":        (400, 500, 0.25, 0.015, 0.90, "Subcategory_ductile_CI"),
    "compacted_graphite":  (350, 450, 0.25, 0.015, 0.85, "Subcategory_CGI"),
    "wrought_aluminum":    (250, 250, 0.30, 0.013, 1.20, "Subcategory_wr_Al"),
    "aluminum":            (250, 250, 0.30, 0.013, 1.20, "Subcategory_Al"),
    "aluminum_cast":       (190, 240, 0.28, 0.013, 1.00, "Subcategory_cast_Al"),
    "titanium":            (860, 330, 0.34, 0.012, 0.80, "Subcategory_Ti"),
    "nickel_base":         (800, 1050, 0.48, 0.007, 1.15, "Subcategory_Ni"),
    "cobalt_base":         (650, 750, 0.38, 0.009, 0.95, "Subcategory_Co"),
    "hardened_steels":     (1200, 700, 0.14, 0.009, 0.90, "Subcategory_hardened"),
    "additive_manufacturing": (500, 600, 0.25, 0.015, 1.00, "Subcategory_AM"),
    "composites":          (300, 200, 0.15, 0.005, 0.50, "Subcategory_composite"),
    "graphite":            (40, 20, 0.10, 0.005, 0.50, "Subcategory_graphite"),
    "polymers":            (50, 40, 0.30, 0.020, 1.50, "Subcategory_polymer"),
    "honeycomb_sandwich":  (30, 15, 0.15, 0.005, 0.50, "Subcategory_honeycomb"),
    "wood":                (40, 25, 0.20, 0.010, 0.80, "Subcategory_wood"),
    "rubber":              (5, 10, 0.50, 0.030, 2.00, "Subcategory_rubber"),
    "general":             (500, 560, 0.24, 0.017, 1.00, "Subcategory_general"),
    "general_specialty":   (400, 450, 0.22, 0.015, 0.90, "Subcategory_gen_spec"),
    "general_nonferrous":  (250, 250, 0.30, 0.013, 1.20, "Subcategory_gen_NF"),
}

# ── REFERENCE TABLE 2: Kienzle Specific Cutting Force ─────────────────────────
# Format: {subcategory: (kc11_ref_MPa, mc, hb_ref, hb_exponent)}
# kc11_actual = kc11_ref * (HB_actual / HB_ref) ^ hb_exp

KIENZLE_PROFILES = {
    # ── P Steels ──
    "low_carbon_steel":    (1350, 0.25, 130, 0.40),
    "carbon_steels":       (1350, 0.25, 130, 0.40),
    "medium_carbon_steel": (1700, 0.25, 200, 0.40),
    "high_carbon_steel":   (2000, 0.25, 280, 0.40),
    "general_steels":      (1680, 0.25, 200, 0.40),
    "chromoly":            (1780, 0.25, 220, 0.38),
    "nickel_chromoly":     (1900, 0.25, 260, 0.38),
    "alloy_steel":         (1750, 0.25, 220, 0.38),
    "free_machining":      (1200, 0.22, 170, 0.35),
    "spring_steel":        (1850, 0.25, 280, 0.38),
    "spring_steels":       (1850, 0.25, 280, 0.38),
    "structural_steel":    (1500, 0.25, 160, 0.40),
    "bearing_steel":       (1900, 0.25, 240, 0.38),
    "case_hardening":      (1700, 0.25, 200, 0.38),
    "mold_steel":          (1750, 0.25, 220, 0.38),
    # ── P Tool Steels ──
    "cold_work":           (2200, 0.26, 250, 0.35),
    "cold_work_tool":      (2200, 0.26, 250, 0.35),
    "hot_work":            (2000, 0.26, 220, 0.38),
    "hot_work_tool":       (2000, 0.26, 220, 0.38),
    "high_speed":          (2400, 0.27, 280, 0.35),
    "shock_resistant":     (2100, 0.26, 240, 0.38),
    "tool_steel_hardened": (2300, 0.26, 300, 0.35),
    "pm_tool":             (2350, 0.27, 260, 0.35),
    # ── M Stainless ──
    "austenitic":          (2100, 0.26, 180, 0.30),
    "super_austenitic":    (2300, 0.26, 200, 0.28),
    "martensitic":         (1800, 0.25, 220, 0.38),
    "ferritic":            (1600, 0.24, 175, 0.35),
    "duplex":              (2300, 0.27, 260, 0.30),
    "precipitation_hardening": (2200, 0.26, 350, 0.32),
    "free_machining_austenitic": (1900, 0.25, 175, 0.30),
    "general_stainless":   (2000, 0.25, 200, 0.32),
    "stainless":           (2000, 0.25, 200, 0.32),
    # ── K Cast Iron ──
    "gray_iron":           (1100, 0.24, 200, 0.30),
    "ductile_iron":        (1350, 0.25, 220, 0.32),
    "compacted_graphite":  (1250, 0.25, 230, 0.30),
    # ── N Non-Ferrous ──
    "wrought_aluminum":    (700, 0.23, 95, 0.25),
    "aluminum":            (700, 0.23, 95, 0.25),
    "aluminum_cast":       (650, 0.22, 80, 0.25),
    "titanium":            (1400, 0.23, 340, 0.20),
    # ── S Superalloys ──
    "nickel_base":         (2800, 0.28, 350, 0.25),
    "cobalt_base":         (2600, 0.27, 350, 0.25),
    # ── H Hardened ──
    "hardened_steels":     (3200, 0.28, 550, 0.35),
    # ── X Specialty ──
    "additive_manufacturing": (1800, 0.25, 200, 0.35),
    "composites":          (500, 0.20, 0, 0.00),
    "graphite":            (200, 0.18, 0, 0.00),
    "polymers":            (150, 0.15, 0, 0.00),
    "honeycomb_sandwich":  (100, 0.15, 0, 0.00),
    "wood":                (180, 0.18, 0, 0.00),
    "rubber":              (80, 0.12, 0, 0.00),
    "specialty_alloy":     (1800, 0.25, 200, 0.35),
    "general":             (1700, 0.25, 200, 0.38),
    "general_specialty":   (1500, 0.24, 200, 0.35),
    "general_nonferrous":  (800, 0.23, 100, 0.25),
}

# ── REFERENCE TABLE 3: Chip Formation Profiles ────────────────────────────────
# Format: {subcategory: (chip_type, chip_breaking, bue_tendency, work_hardening,
#           shear_angle_deg, compression_ratio)}

CHIP_PROFILES = {
    "low_carbon_steel":    ("continuous", "poor", "high", "moderate", 28, 2.2),
    "carbon_steels":       ("continuous", "poor", "high", "moderate", 28, 2.2),
    "medium_carbon_steel": ("continuous", "moderate", "moderate", "low", 30, 2.0),
    "high_carbon_steel":   ("continuous", "good", "low", "low", 32, 1.8),
    "general_steels":      ("continuous", "moderate", "moderate", "moderate", 30, 2.0),
    "chromoly":            ("continuous", "moderate", "low", "low", 31, 1.9),
    "nickel_chromoly":     ("continuous", "moderate", "low", "low", 30, 2.0),
    "alloy_steel":         ("continuous", "moderate", "low", "low", 30, 2.0),
    "free_machining":      ("short_breaking", "excellent", "low", "low", 33, 1.6),
    "spring_steel":        ("continuous", "moderate", "low", "low", 29, 2.1),
    "spring_steels":       ("continuous", "moderate", "low", "low", 29, 2.1),
    "structural_steel":    ("continuous", "moderate", "moderate", "moderate", 29, 2.1),
    "bearing_steel":       ("continuous", "good", "low", "low", 31, 1.9),
    "austenitic":          ("continuous_snarling", "very_poor", "high", "severe", 22, 3.0),
    "super_austenitic":    ("continuous_snarling", "very_poor", "high", "severe", 20, 3.2),
    "martensitic":         ("continuous", "good", "moderate", "moderate", 30, 2.0),
    "ferritic":            ("continuous", "moderate", "moderate", "low", 28, 2.2),
    "duplex":              ("continuous_tough", "poor", "moderate", "high", 24, 2.6),
    "precipitation_hardening": ("segmented", "good", "low", "moderate", 28, 2.0),
    "general_stainless":   ("continuous", "poor", "moderate", "moderate", 25, 2.5),
    "stainless":           ("continuous", "poor", "moderate", "moderate", 25, 2.5),
    "gray_iron":           ("discontinuous", "excellent", "none", "none", 38, 1.2),
    "ductile_iron":        ("short_continuous", "good", "low", "low", 32, 1.7),
    "compacted_graphite":  ("short_continuous", "good", "none", "low", 35, 1.5),
    "wrought_aluminum":    ("continuous", "poor", "very_high", "low", 35, 1.6),
    "aluminum":            ("continuous", "poor", "very_high", "low", 35, 1.6),
    "aluminum_cast":       ("short_breaking", "good", "moderate", "low", 38, 1.3),
    "titanium":            ("segmented_saw", "good", "low", "moderate", 25, 2.5),
    "nickel_base":         ("continuous_abrasive", "very_poor", "low", "severe", 20, 3.5),
    "cobalt_base":         ("continuous_abrasive", "poor", "low", "high", 22, 3.2),
    "hardened_steels":     ("segmented", "excellent", "none", "none", 35, 1.5),
    "additive_manufacturing": ("continuous", "moderate", "moderate", "moderate", 28, 2.2),
    "composites":          ("dusty_fibrous", "N/A", "none", "none", 40, 1.0),
    "graphite":            ("dusty", "N/A", "none", "none", 45, 1.0),
    "polymers":            ("continuous_elastic", "poor", "none", "none", 40, 1.2),
    "cold_work":           ("segmented", "good", "low", "low", 28, 2.0),
    "cold_work_tool":      ("segmented", "good", "low", "low", 28, 2.0),
    "hot_work":            ("continuous", "moderate", "low", "moderate", 28, 2.1),
    "hot_work_tool":       ("continuous", "moderate", "low", "moderate", 28, 2.1),
    "high_speed":          ("segmented", "good", "none", "low", 26, 2.2),
    "tool_steel_hardened": ("segmented", "excellent", "none", "none", 30, 1.8),
    "pm_tool":             ("segmented", "good", "none", "low", 27, 2.1),
    "mold_steel":          ("continuous", "moderate", "low", "low", 29, 2.1),
    "shock_resistant":     ("continuous", "moderate", "low", "moderate", 28, 2.1),
    "general":             ("continuous", "moderate", "moderate", "moderate", 29, 2.1),
    "general_specialty":   ("continuous", "moderate", "low", "moderate", 28, 2.0),
    "general_nonferrous":  ("continuous", "poor", "high", "low", 34, 1.7),
}

# ── REFERENCE TABLE 4: Taylor Tool Life ───────────────────────────────────────
# Format: {subcategory: (C_carbide, n_carbide, C_hss, n_hss, C_ceramic, n_ceramic)}
# VT^n = C  ->  T = (C/V)^(1/n)

TAYLOR_PROFILES = {
    "low_carbon_steel":    (350, 0.25, 80, 0.12, 800, 0.40),
    "carbon_steels":       (350, 0.25, 80, 0.12, 800, 0.40),
    "medium_carbon_steel": (300, 0.25, 65, 0.12, 700, 0.38),
    "high_carbon_steel":   (250, 0.22, 50, 0.10, 600, 0.35),
    "general_steels":      (300, 0.25, 65, 0.12, 700, 0.38),
    "chromoly":            (270, 0.24, 55, 0.11, 650, 0.36),
    "nickel_chromoly":     (250, 0.23, 50, 0.10, 600, 0.35),
    "alloy_steel":         (280, 0.24, 60, 0.11, 680, 0.37),
    "free_machining":      (400, 0.28, 100, 0.14, 900, 0.42),
    "spring_steel":        (240, 0.22, 48, 0.10, 580, 0.34),
    "spring_steels":       (240, 0.22, 48, 0.10, 580, 0.34),
    "structural_steel":    (320, 0.25, 70, 0.12, 750, 0.38),
    "bearing_steel":       (220, 0.22, 45, 0.10, 550, 0.33),
    "austenitic":          (180, 0.22, 35, 0.10, 480, 0.35),
    "super_austenitic":    (150, 0.20, 28, 0.09, 400, 0.32),
    "martensitic":         (250, 0.23, 50, 0.10, 600, 0.35),
    "ferritic":            (280, 0.24, 60, 0.11, 650, 0.36),
    "duplex":              (160, 0.21, 30, 0.09, 420, 0.33),
    "precipitation_hardening": (200, 0.22, 40, 0.10, 500, 0.34),
    "general_stainless":   (220, 0.22, 45, 0.10, 550, 0.34),
    "stainless":           (220, 0.22, 45, 0.10, 550, 0.34),
    "gray_iron":           (250, 0.25, 50, 0.12, 600, 0.40),
    "ductile_iron":        (220, 0.23, 45, 0.11, 550, 0.36),
    "compacted_graphite":  (200, 0.22, 40, 0.10, 500, 0.35),
    "wrought_aluminum":    (900, 0.35, 250, 0.20, 0, 0),
    "aluminum":            (900, 0.35, 250, 0.20, 0, 0),
    "aluminum_cast":       (800, 0.33, 220, 0.18, 0, 0),
    "titanium":            (120, 0.20, 25, 0.08, 350, 0.30),
    "nickel_base":         (80, 0.18, 15, 0.07, 300, 0.28),
    "cobalt_base":         (90, 0.18, 18, 0.08, 320, 0.28),
    "hardened_steels":     (150, 0.20, 0, 0, 400, 0.32),
    "additive_manufacturing": (250, 0.23, 50, 0.10, 600, 0.35),
    "composites":          (600, 0.30, 0, 0, 0, 0),
    "graphite":            (800, 0.35, 0, 0, 0, 0),
    "cold_work":           (180, 0.20, 35, 0.09, 450, 0.32),
    "cold_work_tool":      (180, 0.20, 35, 0.09, 450, 0.32),
    "hot_work":            (200, 0.22, 40, 0.10, 500, 0.34),
    "hot_work_tool":       (200, 0.22, 40, 0.10, 500, 0.34),
    "high_speed":          (150, 0.18, 28, 0.08, 400, 0.30),
    "tool_steel_hardened": (160, 0.20, 30, 0.09, 420, 0.32),
    "pm_tool":             (170, 0.20, 32, 0.09, 430, 0.32),
    "mold_steel":          (230, 0.23, 48, 0.10, 560, 0.34),
    "shock_resistant":     (190, 0.21, 38, 0.09, 480, 0.33),
    "general":             (280, 0.24, 60, 0.11, 650, 0.36),
    "general_specialty":   (200, 0.22, 40, 0.10, 500, 0.34),
    "general_nonferrous":  (800, 0.33, 220, 0.18, 0, 0),
}

# ── REFERENCE TABLE 5: Cutting Speed Base Profiles ────────────────────────────
# Format: {subcategory: (V_base_roughing, V_base_finishing, feed_rough, feed_finish,
#           doc_rough, doc_finish)}  all in m/min, mm/rev, mm

CUTTING_PROFILES = {
    "low_carbon_steel":    (200, 350, 0.35, 0.15, 4.0, 0.5),
    "carbon_steels":       (200, 350, 0.35, 0.15, 4.0, 0.5),
    "medium_carbon_steel": (170, 300, 0.30, 0.12, 3.5, 0.4),
    "high_carbon_steel":   (130, 250, 0.25, 0.10, 3.0, 0.3),
    "general_steels":      (180, 310, 0.30, 0.12, 3.5, 0.4),
    "chromoly":            (160, 280, 0.28, 0.12, 3.5, 0.4),
    "nickel_chromoly":     (140, 250, 0.25, 0.10, 3.0, 0.3),
    "alloy_steel":         (160, 280, 0.28, 0.12, 3.5, 0.4),
    "free_machining":      (250, 400, 0.40, 0.18, 5.0, 0.6),
    "spring_steel":        (130, 240, 0.25, 0.10, 3.0, 0.3),
    "spring_steels":       (130, 240, 0.25, 0.10, 3.0, 0.3),
    "structural_steel":    (190, 330, 0.32, 0.14, 4.0, 0.5),
    "bearing_steel":       (120, 220, 0.22, 0.10, 2.5, 0.3),
    "case_hardening":      (170, 300, 0.28, 0.12, 3.5, 0.4),
    "mold_steel":          (150, 260, 0.28, 0.12, 3.0, 0.4),
    "austenitic":          (140, 250, 0.25, 0.10, 2.5, 0.3),
    "super_austenitic":    (100, 180, 0.20, 0.08, 2.0, 0.2),
    "martensitic":         (150, 270, 0.28, 0.12, 3.0, 0.4),
    "ferritic":            (170, 300, 0.30, 0.12, 3.5, 0.4),
    "duplex":              (100, 180, 0.20, 0.08, 2.0, 0.2),
    "precipitation_hardening": (110, 200, 0.20, 0.08, 2.0, 0.2),
    "general_stainless":   (130, 240, 0.25, 0.10, 2.5, 0.3),
    "stainless":           (130, 240, 0.25, 0.10, 2.5, 0.3),
    "gray_iron":           (200, 350, 0.30, 0.15, 4.0, 0.5),
    "ductile_iron":        (170, 300, 0.28, 0.12, 3.5, 0.4),
    "compacted_graphite":  (150, 260, 0.25, 0.10, 3.0, 0.3),
    "wrought_aluminum":    (500, 900, 0.30, 0.12, 5.0, 0.5),
    "aluminum":            (500, 900, 0.30, 0.12, 5.0, 0.5),
    "aluminum_cast":       (400, 700, 0.25, 0.10, 4.0, 0.4),
    "titanium":            (50, 90, 0.15, 0.06, 1.5, 0.2),
    "nickel_base":         (25, 50, 0.12, 0.05, 1.0, 0.15),
    "cobalt_base":         (30, 55, 0.12, 0.05, 1.0, 0.15),
    "hardened_steels":     (80, 150, 0.15, 0.06, 1.0, 0.15),
    "additive_manufacturing": (130, 240, 0.25, 0.10, 2.5, 0.3),
    "composites":          (200, 400, 0.10, 0.05, 2.0, 0.3),
    "graphite":            (300, 500, 0.15, 0.08, 3.0, 0.5),
    "polymers":            (300, 600, 0.20, 0.10, 3.0, 0.5),
    "cold_work":           (80, 150, 0.20, 0.08, 2.0, 0.2),
    "cold_work_tool":      (80, 150, 0.20, 0.08, 2.0, 0.2),
    "hot_work":            (100, 180, 0.22, 0.10, 2.5, 0.3),
    "hot_work_tool":       (100, 180, 0.22, 0.10, 2.5, 0.3),
    "high_speed":          (60, 120, 0.15, 0.06, 1.5, 0.2),
    "tool_steel_hardened": (70, 130, 0.15, 0.06, 1.0, 0.15),
    "pm_tool":             (70, 130, 0.15, 0.06, 1.5, 0.2),
    "shock_resistant":     (90, 170, 0.22, 0.10, 2.0, 0.25),
    "general":             (170, 300, 0.28, 0.12, 3.5, 0.4),
    "general_specialty":   (130, 240, 0.22, 0.10, 2.5, 0.3),
    "general_nonferrous":  (450, 750, 0.28, 0.12, 4.5, 0.5),
}

# ── REFERENCE TABLE 6: Tribology Profiles ─────────────────────────────────────
# Format: {subcategory: (friction_dry, friction_flood, friction_mql,
#           adhesion, abrasiveness, crater_wear_coeff, flank_wear_coeff)}

TRIBOLOGY_PROFILES = {
    "low_carbon_steel":    (0.55, 0.30, 0.22, "high", "low", 0.0008, 0.0012),
    "carbon_steels":       (0.55, 0.30, 0.22, "high", "low", 0.0008, 0.0012),
    "medium_carbon_steel": (0.50, 0.28, 0.20, "moderate", "low", 0.0010, 0.0015),
    "high_carbon_steel":   (0.45, 0.25, 0.18, "low", "moderate", 0.0015, 0.0020),
    "general_steels":      (0.50, 0.28, 0.20, "moderate", "low", 0.0010, 0.0015),
    "chromoly":            (0.48, 0.26, 0.19, "low", "moderate", 0.0012, 0.0018),
    "nickel_chromoly":     (0.48, 0.26, 0.19, "low", "moderate", 0.0014, 0.0020),
    "alloy_steel":         (0.48, 0.27, 0.19, "low", "moderate", 0.0012, 0.0018),
    "free_machining":      (0.40, 0.22, 0.16, "low", "low", 0.0006, 0.0008),
    "austenitic":          (0.60, 0.35, 0.28, "very_high", "low", 0.0020, 0.0015),
    "super_austenitic":    (0.65, 0.38, 0.30, "very_high", "moderate", 0.0025, 0.0018),
    "martensitic":         (0.48, 0.27, 0.19, "moderate", "moderate", 0.0012, 0.0018),
    "ferritic":            (0.52, 0.30, 0.22, "moderate", "low", 0.0010, 0.0014),
    "duplex":              (0.58, 0.34, 0.26, "high", "moderate", 0.0022, 0.0020),
    "precipitation_hardening": (0.50, 0.28, 0.20, "moderate", "moderate", 0.0018, 0.0020),
    "general_stainless":   (0.55, 0.32, 0.24, "high", "low", 0.0016, 0.0016),
    "stainless":           (0.55, 0.32, 0.24, "high", "low", 0.0016, 0.0016),
    "gray_iron":           (0.40, 0.22, 0.16, "none", "high", 0.0008, 0.0025),
    "ductile_iron":        (0.45, 0.25, 0.18, "low", "moderate", 0.0010, 0.0020),
    "compacted_graphite":  (0.42, 0.24, 0.17, "low", "moderate", 0.0009, 0.0022),
    "wrought_aluminum":    (0.65, 0.35, 0.28, "very_high", "none", 0.0005, 0.0004),
    "aluminum":            (0.65, 0.35, 0.28, "very_high", "none", 0.0005, 0.0004),
    "aluminum_cast":       (0.50, 0.28, 0.22, "high", "moderate", 0.0006, 0.0012),
    "titanium":            (0.55, 0.30, 0.25, "high", "low", 0.0030, 0.0025),
    "nickel_base":         (0.60, 0.35, 0.28, "high", "moderate", 0.0040, 0.0035),
    "cobalt_base":         (0.58, 0.34, 0.27, "moderate", "high", 0.0035, 0.0040),
    "hardened_steels":     (0.42, 0.24, 0.18, "none", "very_high", 0.0020, 0.0040),
    "additive_manufacturing": (0.50, 0.28, 0.20, "moderate", "moderate", 0.0015, 0.0020),
    "composites":          (0.35, 0.20, 0.15, "none", "very_high", 0.0005, 0.0050),
    "graphite":            (0.25, 0.15, 0.12, "none", "moderate", 0.0003, 0.0015),
    "general":             (0.50, 0.28, 0.20, "moderate", "moderate", 0.0012, 0.0016),
    "general_specialty":   (0.48, 0.27, 0.20, "moderate", "moderate", 0.0012, 0.0018),
    "general_nonferrous":  (0.58, 0.32, 0.25, "high", "low", 0.0006, 0.0008),
}

# ── REFERENCE TABLE 7: Surface Integrity Profiles ─────────────────────────────
# Format: {subcategory: (residual_stress, wh_depth_mm, white_layer_risk,
#           achievable_Ra, burr_tendency, min_uncut_chip_mm)}

SURFACE_PROFILES = {
    "low_carbon_steel":    ("tensile", 0.15, "low", 0.8, "high", 0.010),
    "carbon_steels":       ("tensile", 0.15, "low", 0.8, "high", 0.010),
    "medium_carbon_steel": ("neutral", 0.12, "low", 0.6, "moderate", 0.008),
    "high_carbon_steel":   ("compressive", 0.08, "moderate", 0.4, "low", 0.006),
    "general_steels":      ("neutral", 0.12, "low", 0.6, "moderate", 0.008),
    "chromoly":            ("neutral", 0.10, "low", 0.5, "moderate", 0.007),
    "nickel_chromoly":     ("neutral", 0.10, "low", 0.5, "moderate", 0.007),
    "alloy_steel":         ("neutral", 0.10, "low", 0.5, "moderate", 0.007),
    "free_machining":      ("tensile", 0.08, "low", 0.6, "low", 0.006),
    "austenitic":          ("tensile", 0.35, "low", 1.0, "very_high", 0.015),
    "super_austenitic":    ("tensile", 0.40, "low", 1.2, "very_high", 0.018),
    "martensitic":         ("neutral", 0.12, "moderate", 0.5, "moderate", 0.008),
    "ferritic":            ("neutral", 0.15, "low", 0.7, "high", 0.010),
    "duplex":              ("tensile", 0.30, "low", 0.9, "high", 0.014),
    "precipitation_hardening": ("compressive", 0.10, "moderate", 0.5, "moderate", 0.008),
    "general_stainless":   ("tensile", 0.20, "low", 0.8, "high", 0.012),
    "stainless":           ("tensile", 0.20, "low", 0.8, "high", 0.012),
    "gray_iron":           ("neutral", 0.05, "none", 0.5, "none", 0.004),
    "ductile_iron":        ("neutral", 0.08, "low", 0.6, "low", 0.006),
    "compacted_graphite":  ("neutral", 0.06, "low", 0.5, "none", 0.005),
    "wrought_aluminum":    ("tensile", 0.05, "none", 0.4, "very_high", 0.003),
    "aluminum":            ("tensile", 0.05, "none", 0.4, "very_high", 0.003),
    "aluminum_cast":       ("neutral", 0.04, "none", 0.6, "moderate", 0.004),
    "titanium":            ("compressive", 0.10, "high", 0.8, "moderate", 0.008),
    "nickel_base":         ("tensile", 0.15, "high", 1.0, "moderate", 0.010),
    "cobalt_base":         ("tensile", 0.12, "high", 0.9, "moderate", 0.010),
    "hardened_steels":     ("compressive", 0.03, "very_high", 0.2, "none", 0.003),
    "additive_manufacturing": ("tensile", 0.15, "moderate", 0.8, "moderate", 0.010),
    "composites":          ("neutral", 0.02, "none", 0.5, "delamination", 0.005),
    "graphite":            ("neutral", 0.01, "none", 0.3, "chipping", 0.002),
    "general":             ("neutral", 0.12, "low", 0.6, "moderate", 0.008),
    "general_specialty":   ("neutral", 0.10, "low", 0.7, "moderate", 0.008),
    "general_nonferrous":  ("tensile", 0.05, "none", 0.5, "high", 0.004),
}

# ── REFERENCE TABLE 8: Thermal Machining Profiles ─────────────────────────────
# Format: {subcategory: (heat_partition_chip, heat_partition_tool,
#           max_cutting_temp_C, thermal_softening_onset_C, emissivity)}

THERMAL_PROFILES = {
    "low_carbon_steel":    (0.72, 0.08, 750, 500, 0.30),
    "carbon_steels":       (0.72, 0.08, 750, 500, 0.30),
    "medium_carbon_steel": (0.70, 0.09, 800, 520, 0.30),
    "high_carbon_steel":   (0.68, 0.10, 850, 540, 0.32),
    "general_steels":      (0.70, 0.09, 800, 520, 0.30),
    "chromoly":            (0.68, 0.10, 850, 540, 0.32),
    "nickel_chromoly":     (0.66, 0.11, 880, 550, 0.32),
    "alloy_steel":         (0.68, 0.10, 850, 540, 0.32),
    "free_machining":      (0.75, 0.07, 700, 480, 0.28),
    "austenitic":          (0.55, 0.15, 950, 600, 0.35),
    "super_austenitic":    (0.52, 0.17, 1000, 620, 0.38),
    "martensitic":         (0.65, 0.12, 850, 540, 0.32),
    "ferritic":            (0.68, 0.10, 800, 520, 0.30),
    "duplex":              (0.55, 0.16, 980, 610, 0.36),
    "precipitation_hardening": (0.60, 0.14, 920, 580, 0.34),
    "general_stainless":   (0.60, 0.13, 900, 570, 0.33),
    "stainless":           (0.60, 0.13, 900, 570, 0.33),
    "gray_iron":           (0.78, 0.06, 700, 480, 0.40),
    "ductile_iron":        (0.75, 0.07, 750, 500, 0.38),
    "compacted_graphite":  (0.76, 0.07, 730, 490, 0.39),
    "wrought_aluminum":    (0.80, 0.05, 450, 200, 0.08),
    "aluminum":            (0.80, 0.05, 450, 200, 0.08),
    "aluminum_cast":       (0.78, 0.06, 480, 220, 0.10),
    "titanium":            (0.45, 0.20, 1050, 500, 0.30),
    "nickel_base":         (0.40, 0.22, 1100, 650, 0.40),
    "cobalt_base":         (0.42, 0.21, 1080, 640, 0.38),
    "hardened_steels":     (0.60, 0.15, 1000, 600, 0.35),
    "additive_manufacturing": (0.65, 0.12, 850, 540, 0.32),
    "composites":          (0.85, 0.03, 250, 150, 0.70),
    "graphite":            (0.90, 0.02, 500, 400, 0.85),
    "general":             (0.68, 0.10, 820, 520, 0.30),
    "general_specialty":   (0.65, 0.12, 850, 540, 0.32),
    "general_nonferrous":  (0.78, 0.06, 460, 210, 0.10),
}

# ── REFERENCE TABLE 9: Thermal Conductivity from Composition ──────────────────
# k_steel = k_iron * prod(1 - alpha_i * wt%_i)
# k_iron ~= 80 W/mK for pure iron at room temperature

K_IRON = 80.0  # W/mK
THERMAL_ALPHA = {  # reduction coefficients per wt%
    "C": 0.065, "Mn": 0.015, "Si": 0.012, "Cr": 0.018,
    "Ni": 0.012, "Mo": 0.020, "W": 0.022, "V": 0.015,
    "Co": 0.010, "Cu": 0.008, "Ti": 0.025, "Nb": 0.020,
    "Al": 0.010, "N": 0.040, "S": 0.005, "P": 0.005,
}


# ══════════════════════════════════════════════════════════════════════════════
# ALLOY NAME PARSER
# ══════════════════════════════════════════════════════════════════════════════

def normalize_alloy_key(name: str) -> str:
    """Extract a canonical alloy key from material name for J-C lookup."""
    if not name:
        return ""
    n = name.upper().strip()

    # Remove common prefixes
    for pfx in ["AISI ", "SAE ", "UNS ", "EN ", "DIN ", "JIS ", "AA ", "AMS ", "ASTM "]:
        if n.startswith(pfx):
            n = n[len(pfx):]

    # Titanium special handling
    ti_m = re.match(r"TI[- ]?(\d+AL[- ]?\d+V.*)", n)
    if ti_m:
        cleaned = re.sub(r"[\s\-]", "", ti_m.group(0))
        cleaned = re.sub(r"(ANNEALED|AGED|STA|MILL|ELI|SLM|EBM|DMLS|CAST).*", "", cleaned).strip()
        if "ELI" in n:
            return "TI6AL4VELI"
        return cleaned

    if re.match(r"^(CP\s*)?TI\s*(GRADE\s*)?\d", n):
        grade = re.search(r"(\d+)", n)
        if grade:
            g = int(grade.group(1))
            if g <= 2:
                return "TICP2"
            return "TICP4"

    # Inconel / Hastelloy / named superalloys
    for prefix_map in [
        ("INCONEL", "IN"), ("INCO", "IN"), ("ALLOY", "IN"),
        ("HASTELLOY", "HASTELLOY_"), ("HAYNES", "HAYNES"),
        ("NIMONIC", "NIMONIC"), ("WASPALOY", "WASPALOY"),
        ("STELLITE", "STELLITE"), ("RENE", "RENE"),
        ("UDIMET", "UDIMET"), ("MAR-M", "MAR_M"), ("MAR M", "MAR_M"),
    ]:
        if n.startswith(prefix_map[0]):
            rest = n[len(prefix_map[0]):].strip().lstrip("-").strip()
            num = re.match(r"(\d+[A-Z]?)", rest)
            if num:
                return prefix_map[1] + num.group(1)
            if prefix_map[0] == "WASPALOY":
                return "WASPALOY"

    # PH stainless
    ph_m = re.match(r"(\d+)[- ]?(\d+)\s*PH", n)
    if ph_m:
        return f"{ph_m.group(1)}-{ph_m.group(2)}PH"
    ph_m2 = re.match(r"PH\s*(\d+)[- ]?(\d+)", n)
    if ph_m2:
        return f"PH{ph_m2.group(1)}-{ph_m2.group(2)}"

    # Duplex grades
    if "2205" in n:
        return "2205"
    if "2507" in n:
        return "2507"
    if "2304" in n:
        return "2304"
    if "254SMO" in n or "254 SMO" in n:
        return "254SMO"
    if "AL-6XN" in n or "AL6XN" in n:
        return "AL6XN"
    if "904L" in n:
        return "904L"

    # Copper alloys (C-prefix)
    cu_m = re.match(r"C(\d{5})", n)
    if cu_m:
        return f"C{cu_m.group(1)}"

    # Maraging steels
    mar_m = re.match(r"MARAGING\s*(STEEL\s*)?(MS\d|C?\d+|[23]\d{2})", n)
    if mar_m:
        val = mar_m.group(2).replace("MS1", "300")
        return f"MARAGING{val}"

    # 300M
    if n.startswith("300M") or n.startswith("300 M"):
        return "300M"

    # Standard AISI 4-5 digit steels
    steel_m = re.match(r"(\d{4,5})\b", n)
    if steel_m:
        return steel_m.group(1)

    # 3-digit stainless
    ss_m = re.match(r"(\d{3}[A-Z]?)\b", n)
    if ss_m:
        candidate = ss_m.group(1)
        if candidate.rstrip("LHNS") in {"301","302","303","304","309","310","316",
                                         "317","321","347","410","416","420","430",
                                         "434","440","446","17"}:
            return candidate

    # Tool steels (letter + digit)
    tool_m = re.match(r"([ADHMOSWT]\d+)\b", n)
    if tool_m:
        return tool_m.group(1)
    # P20 mold steel
    if n.startswith("P20"):
        return "P20"

    # Aluminum 4-digit
    al_m = re.match(r"(\d{4})", n)
    if al_m:
        code = al_m.group(1)
        if code[0] in "12356789":
            return code

    # Cast aluminum (A3xx)
    al_cast = re.match(r"(A\d{3})", n)
    if al_cast:
        return al_cast.group(1)

    # MP35N, L605
    if "MP35N" in n:
        return "MP35N"
    if "L605" in n or "L-605" in n:
        return "L605"

    return ""


def resolve_subcategory(mat: dict) -> str:
    """Resolve the best subcategory for a material, normalizing variants."""
    sc = mat.get("subcategory", "general")
    if not sc or sc == "general":
        # Try to infer from name or other fields
        name = mat.get("name", "").upper()
        iso = mat.get("iso_group", "")
        mat_type = mat.get("material_type", "")

        if iso == "P" or mat_type == "steel":
            if any(x in name for x in ["1006","1008","1010","1012","1015","1018","1020"]):
                return "low_carbon_steel"
            if any(x in name for x in ["1040","1045","1050","1055"]):
                return "medium_carbon_steel"
            if any(x in name for x in ["1060","1070","1080","1090","1095"]):
                return "high_carbon_steel"
            if any(x in name for x in ["4130","4135","4140","4142","4145","4150"]):
                return "chromoly"
            if any(x in name for x in ["4320","4330","4340","8620","8640"]):
                return "nickel_chromoly"
            if any(x in name for x in ["5160","9260","SPRING"]):
                return "spring_steel"
            if any(x in name for x in ["1117","1137","1141","1144","1212","1215","FREE"]):
                return "free_machining"
            if any(x in name for x in ["52100","BEARING"]):
                return "bearing_steel"
            if any(x in name for x in ["A2 ","D2 ","O1 ","S7 ","W1 ","M2 ","M4 ","H13","H11","P20"]):
                return "tool_steel_hardened"
        elif iso == "M":
            if any(x in name for x in ["304","301","303","309","310","316","321","347","AUSTENITIC"]):
                return "austenitic"
            if any(x in name for x in ["410","416","420","440","MARTENSITIC"]):
                return "martensitic"
            if any(x in name for x in ["430","434","446","FERRITIC"]):
                return "ferritic"
            if any(x in name for x in ["2205","2507","2304","DUPLEX"]):
                return "duplex"
            if any(x in name for x in ["17-4","15-5","17-7","PH13","PH "]):
                return "precipitation_hardening"
        elif iso == "K":
            if any(x in name for x in ["GRAY","GG","CLASS 20","CLASS 25","CLASS 30","CLASS 35","CLASS 40","GJL"]):
                return "gray_iron"
            if any(x in name for x in ["DUCTILE","GGG","GJS","NODULAR","SPHEROIDAL"]):
                return "ductile_iron"
            if any(x in name for x in ["CGI","COMPACTED","GJV","VERMICULAR"]):
                return "compacted_graphite"
        elif iso == "N":
            if any(x in name for x in ["ALUMINUM","ALUMINIUM","AL ","AA ","A356","A380"]):
                return "wrought_aluminum"
            if "CAST" in name and "AL" in name:
                return "aluminum_cast"
            if "TI" in name or "TITANIUM" in name:
                return "titanium"

    return sc


def get_hardness_brinell(mat: dict) -> float:
    """Extract Brinell hardness from material data."""
    mech = mat.get("mechanical", {})
    h = mech.get("hardness", {})
    if isinstance(h, dict):
        bhn = h.get("brinell", 0)
        if bhn and bhn > 0:
            return float(bhn)
        # Convert from Vickers or Rockwell C if available
        hv = h.get("vickers", 0)
        if hv and hv > 0:
            return float(hv) * 0.95  # approximate
        hrc = h.get("rockwell_c", 0)
        if hrc and hrc > 0:
            return 2.172 * hrc * hrc * 0.01 + 4.318 * hrc + 98.3  # approx conversion
    return 0.0


def get_thermal_conductivity(mat: dict) -> float:
    """Extract thermal conductivity from physical properties."""
    phys = mat.get("physical", {})
    k = phys.get("thermal_conductivity", 0)
    if isinstance(k, (int, float)) and k > 0:
        return float(k)
    return 0.0


def get_tensile_strength(mat: dict) -> float:
    """Extract tensile strength in MPa."""
    mech = mat.get("mechanical", {})
    ts = mech.get("tensile_strength", {})
    if isinstance(ts, dict):
        for key in ("typical", "min", "max"):
            v = ts.get(key, 0)
            if v and v > 0:
                return float(v)
    elif isinstance(ts, (int, float)) and ts > 0:
        return float(ts)
    return 0.0


def get_composition(mat: dict) -> dict:
    """Extract composition as {element: wt%} using typical values."""
    comp = mat.get("composition", {})
    if not isinstance(comp, dict):
        return {}
    result = {}
    for elem, val in comp.items():
        if elem in ("note", "base", "other", "balance"):
            continue
        if isinstance(val, dict):
            wt = val.get("typical", val.get("max", val.get("min", 0)))
            if wt and wt > 0:
                result[elem] = float(wt)
        elif isinstance(val, (int, float)) and val > 0:
            result[elem] = float(val)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# PIPELINE STAGES
# ══════════════════════════════════════════════════════════════════════════════

def stage1_alloy_resolution(mat: dict, acc: dict):
    """Stage 1: Parse name -> extract alloy key -> resolve subcategory."""
    name = mat.get("name", "")
    alloy_key = normalize_alloy_key(name)
    subcategory = resolve_subcategory(mat)

    acc["alloy_key"] = alloy_key
    acc["subcategory_resolved"] = subcategory

    if alloy_key and alloy_key in JC_ALLOYS:
        acc["match_method"] = "exact_alloy"
        acc["match_quality"] = 1.0
        acc["alloy_match"] = alloy_key
    elif alloy_key:
        acc["match_method"] = "name_parse_subcategory"
        acc["match_quality"] = 0.7
        acc["alloy_match"] = alloy_key
    else:
        acc["match_method"] = "subcategory_only"
        acc["match_quality"] = 0.5
        acc["alloy_match"] = "none"

    # Update the material's subcategory if we resolved a better one
    if subcategory != mat.get("subcategory", "general"):
        mat["subcategory"] = subcategory


def stage2_physical_properties(mat: dict, acc: dict):
    """Stage 2: Refine thermal conductivity from composition."""
    comp = get_composition(mat)
    sc = acc.get("subcategory_resolved", "general")
    phys = mat.setdefault("physical", {})

    if comp and mat.get("iso_group", "") in ("P", "M", "H"):
        # Calculate k from composition for steels/stainless
        k_calc = K_IRON
        for elem, wt_pct in comp.items():
            alpha = THERMAL_ALPHA.get(elem, 0)
            k_calc *= (1.0 - alpha * min(wt_pct, 30))  # cap at 30% to avoid negative
        k_calc = max(k_calc, 5.0)  # minimum physical bound

        existing_k = get_thermal_conductivity(mat)
        if existing_k <= 0 or abs(existing_k - k_calc) / max(k_calc, 1) > 0.3:
            phys["thermal_conductivity"] = round(k_calc, 2)
            acc["thermal_conductivity"] = {"confidence": "MEDIUM", "source": "composition_model"}
        else:
            acc["thermal_conductivity"] = {"confidence": "MEDIUM_HIGH", "source": "existing_validated"}
    else:
        existing_k = get_thermal_conductivity(mat)
        if existing_k > 0:
            acc["thermal_conductivity"] = {"confidence": "MEDIUM", "source": "existing"}
        else:
            acc["thermal_conductivity"] = {"confidence": "LOW", "source": "group_default"}


def stage3_kienzle(mat: dict, acc: dict):
    """Stage 3: Subcategory-specific Kienzle with hardness scaling."""
    sc = acc.get("subcategory_resolved", "general")
    hb = get_hardness_brinell(mat)

    profile = KIENZLE_PROFILES.get(sc)
    if not profile:
        # Fallback to general profiles by ISO group
        iso = mat.get("iso_group", "P")
        fallbacks = {"P": "general_steels", "M": "general_stainless", "K": "gray_iron",
                     "N": "aluminum", "S": "nickel_base", "H": "hardened_steels",
                     "X": "composites"}
        profile = KIENZLE_PROFILES.get(fallbacks.get(iso, "general_steels"))
    if not profile:
        acc["kienzle"] = {"confidence": "LOW", "source": "no_profile"}
        return

    kc11_ref, mc, hb_ref, hb_exp = profile

    # Scale by hardness if available and applicable
    if hb > 0 and hb_ref > 0 and hb_exp > 0:
        kc11 = kc11_ref * (hb / hb_ref) ** hb_exp
        confidence = "MEDIUM_HIGH"
        source = f"VDI3323_{sc}_HB_scaled"
    else:
        kc11 = kc11_ref
        # If we matched a specific subcategory profile, it's MEDIUM_HIGH;
        # if we fell back to ISO group default, it's MEDIUM (not LOW)
        if sc in KIENZLE_PROFILES:
            confidence = "MEDIUM_HIGH"
        else:
            confidence = "MEDIUM"
        source = f"VDI3323_{sc}"

    kz = mat.setdefault("kienzle", {})
    kz["kc1_1"] = round(kc11, 1)
    kz["mc"] = mc
    # Operation-specific variants (typical ratios)
    kz["kc1_1_milling"] = round(kc11 * 1.05, 1)
    kz["mc_milling"] = round(mc * 1.02, 4)
    kz["kc1_1_drilling"] = round(kc11 * 1.15, 1)
    kz["mc_drilling"] = round(mc * 1.05, 4)
    kz["kc1_1_boring"] = round(kc11 * 1.02, 1)
    kz["mc_boring"] = mc
    kz["kc1_1_reaming"] = round(kc11 * 1.08, 1)
    kz["mc_reaming"] = round(mc * 1.03, 4)

    acc["kienzle"] = {"confidence": confidence, "source": source}


def stage4_johnson_cook(mat: dict, acc: dict):
    """Stage 4: Published J-C for exact alloys, subcategory defaults for others."""
    alloy_key = acc.get("alloy_key", "")
    sc = acc.get("subcategory_resolved", "general")

    jc_data = None
    confidence = "LOW"
    source = "group_default"

    # Level 1: Exact alloy match
    if alloy_key and alloy_key in JC_ALLOYS:
        jc_data = JC_ALLOYS[alloy_key]
        confidence = "HIGH"
        source = jc_data[5]
    else:
        # Level 2: Subcategory default
        if sc in JC_SUBCATEGORY:
            jc_data = JC_SUBCATEGORY[sc]
            confidence = "MEDIUM_HIGH"
            source = jc_data[5]
        else:
            # Level 3: ISO group fallback
            iso = mat.get("iso_group", "P")
            iso_defaults = {
                "P": "general_steels", "M": "general_stainless", "K": "gray_iron",
                "N": "aluminum", "S": "nickel_base", "H": "hardened_steels",
                "X": "composites"
            }
            fb = iso_defaults.get(iso, "general_steels")
            if fb in JC_SUBCATEGORY:
                jc_data = JC_SUBCATEGORY[fb]
                confidence = "MEDIUM"
                source = jc_data[5]

    if jc_data:
        A, B, n_val, C, m, _ = jc_data
        hb = get_hardness_brinell(mat)
        ts = get_tensile_strength(mat)

        # Hardness-based scaling for subcategory/group defaults
        if confidence in ("MEDIUM_HIGH", "MEDIUM") and hb > 0:
            profile = KIENZLE_PROFILES.get(sc, KIENZLE_PROFILES.get("general_steels"))
            if profile and profile[2] > 0:
                hb_ratio = hb / profile[2]
                A = A * (hb_ratio ** 0.6)
                B = B * (hb_ratio ** 0.4)

        # Tensile strength cross-check for steels
        if ts > 0 and confidence != "HIGH" and mat.get("iso_group", "") in ("P", "M", "H"):
            # Approximate: A ~ 0.6 * UTS for annealed steels
            a_est = ts * 0.6
            if A > 0 and abs(A - a_est) / A > 0.5:
                A = a_est  # override with estimate

        jc = mat.setdefault("johnson_cook", {})
        jc["A"] = round(A, 1)
        jc["B"] = round(B, 1)
        jc["n"] = round(n_val, 4)
        jc["C"] = round(C, 4)
        jc["m"] = round(m, 2)
        jc["T_melt"] = mat.get("physical", {}).get("melting_point",
                       mat.get("physical", {}).get("solidus_temperature", 1500))
        jc["T_ref"] = 25
        jc["epsilon_dot_ref"] = 1.0

    acc["johnson_cook"] = {"confidence": confidence, "source": source}


def stage5_taylor(mat: dict, acc: dict):
    """Stage 5: Taylor tool life from subcategory profiles."""
    sc = acc.get("subcategory_resolved", "general")
    hb = get_hardness_brinell(mat)

    profile = TAYLOR_PROFILES.get(sc)
    if not profile:
        iso = mat.get("iso_group", "P")
        fallbacks = {"P": "general_steels", "M": "general_stainless", "K": "gray_iron",
                     "N": "aluminum", "S": "nickel_base", "H": "hardened_steels",
                     "X": "composites"}
        profile = TAYLOR_PROFILES.get(fallbacks.get(iso, "general_steels"))
    if not profile:
        acc["taylor"] = {"confidence": "LOW", "source": "no_profile"}
        return

    C_carb, n_carb, C_hss, n_hss, C_cer, n_cer = profile

    # Hardness scaling: harder material -> lower C constant
    if hb > 0:
        kz_profile = KIENZLE_PROFILES.get(sc)
        if kz_profile and kz_profile[2] > 0:
            hb_ratio = hb / kz_profile[2]
            scale = (1.0 / hb_ratio) ** 0.8  # inverse relationship
            C_carb *= scale
            if C_hss > 0:
                C_hss *= scale
            if C_cer > 0:
                C_cer *= scale

    tay = mat.setdefault("taylor", {})
    tay["C"] = round(C_carb, 1)
    tay["n"] = round(n_carb, 3)
    tay["C_carbide"] = round(C_carb, 1)
    tay["n_carbide"] = round(n_carb, 3)
    if C_hss > 0:
        tay["C_hss"] = round(C_hss, 1)
        tay["n_hss"] = round(n_hss, 3)
    if C_cer > 0:
        tay["C_ceramic"] = round(C_cer, 1)
        tay["n_ceramic"] = round(n_cer, 3)

    alloy_key = acc.get("alloy_key", "")
    if alloy_key and alloy_key in JC_ALLOYS:
        acc["taylor"] = {"confidence": "MEDIUM_HIGH", "source": f"subcategory_{sc}_alloy_scaled"}
    elif sc in TAYLOR_PROFILES:
        acc["taylor"] = {"confidence": "MEDIUM_HIGH", "source": f"subcategory_{sc}"}
    else:
        acc["taylor"] = {"confidence": "MEDIUM", "source": "iso_group_default"}


def stage6_chip_formation(mat: dict, acc: dict):
    """Stage 6: Subcategory chip formation profile with hardness/elongation adjustment."""
    sc = acc.get("subcategory_resolved", "general")
    hb = get_hardness_brinell(mat)

    profile = CHIP_PROFILES.get(sc)
    if not profile:
        iso = mat.get("iso_group", "P")
        fallbacks = {"P": "general_steels", "M": "general_stainless", "K": "gray_iron",
                     "N": "aluminum", "S": "nickel_base", "H": "hardened_steels",
                     "X": "composites"}
        profile = CHIP_PROFILES.get(fallbacks.get(iso, "general_steels"))
    if not profile:
        acc["chip_formation"] = {"confidence": "LOW", "source": "no_profile"}
        return

    chip_type, chip_breaking, bue, wh, shear_angle, comp_ratio = profile

    # Adjust shear angle and compression ratio for hardness
    if hb > 0:
        kz = KIENZLE_PROFILES.get(sc)
        if kz and kz[2] > 0:
            hb_ratio = hb / kz[2]
            # Harder -> higher shear angle, lower compression ratio
            shear_angle = shear_angle + 3.0 * (hb_ratio - 1.0)
            comp_ratio = comp_ratio / (hb_ratio ** 0.3)

    # Adjust BUE tendency based on cutting speed context
    elong = mat.get("mechanical", {}).get("elongation", 0)
    if isinstance(elong, (int, float)) and elong > 30:
        if bue in ("moderate", "low"):
            bue = "high"  # very ductile materials tend to BUE

    cf = mat.setdefault("chip_formation", {})
    cf["chip_type"] = chip_type
    cf["chip_breaking"] = chip_breaking
    cf["built_up_edge_tendency"] = bue
    cf["shear_angle"] = round(max(15, min(50, shear_angle)), 1)
    cf["chip_compression_ratio"] = round(max(1.0, min(5.0, comp_ratio)), 2)

    # Min chip thickness from subcategory
    surf_profile = SURFACE_PROFILES.get(sc)
    if surf_profile:
        cf["min_chip_thickness"] = surf_profile[5]

    # Segmentation frequency for hard/titanium materials
    if chip_type in ("segmented", "segmented_saw"):
        cf["segmentation_frequency"] = "high"
    elif chip_type == "continuous_tough":
        cf["segmentation_frequency"] = "moderate"
    else:
        cf["segmentation_frequency"] = "low"

    # Edge radius sensitivity
    if sc in ("austenitic", "super_austenitic", "duplex", "titanium", "nickel_base"):
        cf["edge_radius_sensitivity"] = "high"
    elif sc in ("gray_iron", "composites", "graphite"):
        cf["edge_radius_sensitivity"] = "low"
    else:
        cf["edge_radius_sensitivity"] = "moderate"

    if sc in CHIP_PROFILES:
        acc["chip_formation"] = {"confidence": "MEDIUM_HIGH", "source": f"subcategory_{sc}"}
    else:
        acc["chip_formation"] = {"confidence": "MEDIUM", "source": "iso_group_fallback"}


def stage7_cutting_recommendations(mat: dict, acc: dict):
    """Stage 7: Multi-factor cutting speed model + subcategory feed/DOC."""
    sc = acc.get("subcategory_resolved", "general")
    hb = get_hardness_brinell(mat)
    k_thermal = get_thermal_conductivity(mat)

    profile = CUTTING_PROFILES.get(sc)
    if not profile:
        iso = mat.get("iso_group", "P")
        fallbacks = {"P": "general_steels", "M": "general_stainless", "K": "gray_iron",
                     "N": "aluminum", "S": "nickel_base", "H": "hardened_steels",
                     "X": "composites"}
        profile = CUTTING_PROFILES.get(fallbacks.get(iso, "general_steels"))
    if not profile:
        acc["cutting_recommendations"] = {"confidence": "LOW", "source": "no_profile"}
        return

    v_rough, v_finish, f_rough, f_finish, doc_rough, doc_finish = profile

    # Multi-factor speed adjustment
    # Factor 1: Hardness
    f_hb = 1.0
    if hb > 0:
        kz = KIENZLE_PROFILES.get(sc)
        if kz and kz[2] > 0:
            hb_ratio = hb / kz[2]
            f_hb = 1.0 / (hb_ratio ** 0.6)  # harder = slower

    # Factor 2: Thermal conductivity
    f_k = 1.0
    if k_thermal > 0:
        # Higher k -> can cut faster (heat dissipates)
        # Reference: ~50 W/mK for medium carbon steel
        iso = mat.get("iso_group", "")
        if iso in ("P", "M", "H"):
            f_k = (k_thermal / 50.0) ** 0.15
        elif iso == "N":
            f_k = (k_thermal / 150.0) ** 0.10
        elif iso == "S":
            f_k = (k_thermal / 12.0) ** 0.20

    # Factor 3: Work hardening (from chip profile)
    f_wh = 1.0
    chip_profile = CHIP_PROFILES.get(sc)
    if chip_profile:
        wh = chip_profile[3]
        wh_map = {"none": 1.10, "low": 1.00, "moderate": 0.90, "high": 0.80, "severe": 0.70}
        f_wh = wh_map.get(wh, 1.0)

    combined_factor = f_hb * f_k * f_wh
    combined_factor = max(0.3, min(2.0, combined_factor))  # clamp

    v_rough_adj = v_rough * combined_factor
    v_finish_adj = v_finish * combined_factor

    cr = mat.setdefault("cutting_recommendations", {})

    # Turning
    turn = cr.setdefault("turning", {})
    turn["speed_roughing"] = round(v_rough_adj, 1)
    turn["speed_finishing"] = round(v_finish_adj, 1)
    turn["feed_roughing"] = f_rough
    turn["feed_finishing"] = f_finish
    turn["doc_roughing"] = doc_rough
    turn["doc_finishing"] = doc_finish

    # Milling (typically 10-20% faster than turning)
    mill = cr.setdefault("milling", {})
    mill["speed_roughing"] = round(v_rough_adj * 1.15, 1)
    mill["speed_finishing"] = round(v_finish_adj * 1.15, 1)
    mill["feed_per_tooth_roughing"] = round(f_rough * 0.35, 4)
    mill["feed_per_tooth_finishing"] = round(f_finish * 0.35, 4)
    mill["doc_roughing"] = round(doc_rough * 0.8, 2)
    mill["doc_finishing"] = round(doc_finish * 0.8, 2)
    mill["woc_roughing"] = round(doc_rough * 0.4, 2)
    mill["woc_finishing"] = round(doc_finish * 0.4, 2)

    # Drilling (typically 60-70% of turning speed)
    drill = cr.setdefault("drilling", {})
    drill["speed"] = round(v_rough_adj * 0.65, 1)
    drill["feed_per_rev"] = round(f_rough * 0.35, 4)
    drill["peck_depth_ratio"] = 1.0 if sc in ("gray_iron", "aluminum", "wrought_aluminum") else 0.5

    # Tool material recommendations by subcategory
    tool = cr.setdefault("tool_material", {})
    if sc in ("hardened_steels", "tool_steel_hardened"):
        tool["recommended_grade"] = "CBN"
        tool["coating_recommendation"] = "None"
        tool["geometry_recommendation"] = "Negative rake"
    elif sc in ("nickel_base", "cobalt_base", "titanium"):
        tool["recommended_grade"] = "Coated carbide"
        tool["coating_recommendation"] = "TiAlN"
        tool["geometry_recommendation"] = "Positive sharp"
    elif sc in ("austenitic", "super_austenitic", "duplex"):
        tool["recommended_grade"] = "Coated carbide"
        tool["coating_recommendation"] = "TiAlN"
        tool["geometry_recommendation"] = "Positive"
    elif sc in ("gray_iron", "ductile_iron"):
        tool["recommended_grade"] = "Coated carbide"
        tool["coating_recommendation"] = "Al2O3-TiCN"
        tool["geometry_recommendation"] = "Neutral"
    elif sc in ("aluminum", "wrought_aluminum", "aluminum_cast"):
        tool["recommended_grade"] = "PCD or uncoated carbide"
        tool["coating_recommendation"] = "DLC or none"
        tool["geometry_recommendation"] = "Positive, polished"
    elif sc in ("composites",):
        tool["recommended_grade"] = "PCD"
        tool["coating_recommendation"] = "Diamond"
        tool["geometry_recommendation"] = "Positive sharp"
    else:
        tool["recommended_grade"] = "Coated carbide"
        tool["coating_recommendation"] = "TiAlN"
        tool["geometry_recommendation"] = "Neutral"

    # Coolant recommendations
    cool = cr.setdefault("coolant", {})
    if sc in ("aluminum", "wrought_aluminum", "aluminum_cast", "gray_iron"):
        cool["type"] = "Flood emulsion"
        cool["pressure"] = 30
        cool["flow_rate"] = 40
    elif sc in ("nickel_base", "titanium", "cobalt_base"):
        cool["type"] = "High-pressure coolant"
        cool["pressure"] = 80
        cool["flow_rate"] = 60
    elif sc in ("austenitic", "super_austenitic", "duplex"):
        cool["type"] = "Flood emulsion"
        cool["pressure"] = 60
        cool["flow_rate"] = 50
    elif sc in ("composites", "graphite"):
        cool["type"] = "Dry or vacuum"
        cool["pressure"] = 0
        cool["flow_rate"] = 0
    else:
        cool["type"] = "Flood emulsion"
        cool["pressure"] = 40
        cool["flow_rate"] = 45

    if sc in CUTTING_PROFILES:
        acc["cutting_recommendations"] = {"confidence": "MEDIUM_HIGH", "source": f"multi_factor_{sc}"}
    else:
        acc["cutting_recommendations"] = {"confidence": "MEDIUM", "source": "iso_group_default"}


def stage8_tribology_surface_thermal(mat: dict, acc: dict):
    """Stage 8: Tribology + Surface Integrity + Thermal from subcategory profiles."""
    sc = acc.get("subcategory_resolved", "general")
    hb = get_hardness_brinell(mat)

    # ── Tribology ──
    trib_profile = TRIBOLOGY_PROFILES.get(sc)
    if not trib_profile:
        iso = mat.get("iso_group", "P")
        fallbacks = {"P": "general_steels", "M": "general_stainless", "K": "gray_iron",
                     "N": "aluminum", "S": "nickel_base", "H": "hardened_steels",
                     "X": "composites"}
        trib_profile = TRIBOLOGY_PROFILES.get(fallbacks.get(iso, "general_steels"))

    if trib_profile:
        f_dry, f_flood, f_mql, adhesion, abrasive, crater_c, flank_c = trib_profile
        # Hardness adjustment: harder -> lower friction, higher abrasiveness
        if hb > 0:
            kz = KIENZLE_PROFILES.get(sc)
            if kz and kz[2] > 0:
                hb_ratio = hb / kz[2]
                f_dry *= (1.0 / hb_ratio) ** 0.15
                f_flood *= (1.0 / hb_ratio) ** 0.15
                f_mql *= (1.0 / hb_ratio) ** 0.15
                flank_c *= hb_ratio ** 0.5

        trib = mat.setdefault("tribology", {})
        trib["friction_coefficient"] = round(f_dry, 3)
        trib["friction_coefficient_dry"] = round(f_dry, 3)
        trib["friction_coefficient_flood"] = round(f_flood, 3)
        trib["friction_coefficient_mql"] = round(f_mql, 3)
        trib["adhesion_tendency"] = adhesion
        trib["abrasiveness"] = abrasive
        trib["crater_wear_coefficient"] = round(crater_c, 5)
        trib["flank_wear_coefficient"] = round(flank_c, 5)
        trib["wear_coefficient"] = round((crater_c + flank_c) / 2, 5)
        trib["galling_tendency"] = "high" if adhesion in ("high", "very_high") else "low"
        acc["tribology"] = {"confidence": "MEDIUM_HIGH", "source": f"subcategory_{sc}"}
    else:
        acc["tribology"] = {"confidence": "LOW", "source": "no_profile"}

    # ── Surface Integrity ──
    surf_profile = SURFACE_PROFILES.get(sc)
    if not surf_profile:
        iso = mat.get("iso_group", "P")
        fallbacks = {"P": "general_steels", "M": "general_stainless", "K": "gray_iron",
                     "N": "aluminum", "S": "nickel_base", "H": "hardened_steels",
                     "X": "composites"}
        surf_profile = SURFACE_PROFILES.get(fallbacks.get(iso, "general_steels"))

    if surf_profile:
        resid, wh_depth, wl_risk, ra, burr, min_uct = surf_profile
        si = mat.setdefault("surface_integrity", {})
        si["residual_stress_tendency"] = resid
        si["work_hardening_depth"] = wh_depth
        si["white_layer_risk"] = wl_risk
        si["surface_roughness_achievable"] = ra
        si["burr_formation_tendency"] = burr
        si["minimum_uncut_chip_thickness"] = min_uct
        si["ploughing_force_coefficient"] = round(min_uct * 50, 3)  # approximate
        si["microstructure_sensitivity"] = "high" if sc in (
            "titanium", "nickel_base", "hardened_steels", "precipitation_hardening"
        ) else "moderate"

        # Also update surface block
        surf = mat.setdefault("surface", {})
        surf["achievable_ra_turning"] = ra
        surf["achievable_ra_milling"] = round(ra * 2.0, 2)
        surf["achievable_ra_grinding"] = round(ra * 0.25, 3)
        surf["surface_integrity_sensitivity"] = si["microstructure_sensitivity"]
        surf["white_layer_risk"] = wl_risk

        acc["surface_integrity"] = {"confidence": "MEDIUM_HIGH", "source": f"subcategory_{sc}"}
    else:
        acc["surface_integrity"] = {"confidence": "LOW", "source": "no_profile"}

    # ── Thermal Machining ──
    therm_profile = THERMAL_PROFILES.get(sc)
    if not therm_profile:
        iso = mat.get("iso_group", "P")
        fallbacks = {"P": "general_steels", "M": "general_stainless", "K": "gray_iron",
                     "N": "aluminum", "S": "nickel_base", "H": "hardened_steels",
                     "X": "composites"}
        therm_profile = THERMAL_PROFILES.get(fallbacks.get(iso, "general_steels"))

    if therm_profile:
        hp_chip, hp_tool, max_temp, softening, emissivity = therm_profile
        k = get_thermal_conductivity(mat)
        # Adjust heat partition based on actual thermal conductivity
        if k > 0:
            if mat.get("iso_group", "") in ("P", "M", "H"):
                k_ref = 50.0
            elif mat.get("iso_group", "") == "N":
                k_ref = 150.0
            else:
                k_ref = 30.0
            k_ratio = k / k_ref
            # Higher k -> more heat to chip, less to tool
            hp_chip = min(0.92, hp_chip * (k_ratio ** 0.1))
            hp_tool = max(0.02, hp_tool / (k_ratio ** 0.15))

        tm = mat.setdefault("thermal_machining", {})
        tm["heat_partition_coefficient"] = round(hp_chip, 3)
        tm["maximum_cutting_temperature"] = max_temp
        tm["recrystallization_temperature"] = round(max_temp * 0.6, 0)
        tm["emissivity"] = emissivity
        tm["heat_transfer_coefficient"] = round(5000 + 20000 * hp_chip, 1)
        tm["thermal_diffusivity"] = round(k / (mat.get("physical", {}).get("density", 7800) *
                                    mat.get("physical", {}).get("specific_heat", 500)) * 1e6, 3)
        tm["critical_temperature"] = max_temp
        tm["phase_transformation_temperature"] = round(softening * 1.2, 0)

        # Also update thermal block
        therm = mat.setdefault("thermal", {})
        therm["cutting_temperature_factor"] = round(1.0 / hp_chip, 2)
        therm["heat_partition_ratio"] = round(1.0 - hp_chip, 3)
        therm["thermal_softening_onset"] = softening
        therm["hot_hardness_retention"] = "high" if sc in (
            "nickel_base", "cobalt_base", "hardened_steels", "titanium"
        ) else "moderate" if sc in (
            "alloy_steel", "chromoly", "tool_steel_hardened"
        ) else "low"
        therm["cryogenic_machinability"] = "excellent" if sc in (
            "titanium", "nickel_base"
        ) else "good" if sc in (
            "austenitic", "duplex"
        ) else "moderate"

        acc["thermal_machining"] = {"confidence": "MEDIUM_HIGH", "source": f"subcategory_{sc}"}
    else:
        acc["thermal_machining"] = {"confidence": "LOW", "source": "no_profile"}


def stage9_confidence_tagging(mat: dict, acc: dict):
    """Stage 9: Write _accuracy metadata with source and confidence per property."""
    accuracy = {
        "pass": "deep_accuracy_v1",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "alloy_match": acc.get("alloy_match", "none"),
        "match_method": acc.get("match_method", "unknown"),
        "match_quality": acc.get("match_quality", 0),
        "subcategory_resolved": acc.get("subcategory_resolved", "unknown"),
    }

    # Per-property confidence
    for prop in ["johnson_cook", "kienzle", "taylor", "chip_formation",
                 "cutting_recommendations", "tribology", "surface_integrity",
                 "thermal_machining", "thermal_conductivity"]:
        if prop in acc and isinstance(acc[prop], dict):
            accuracy[prop] = acc[prop]

    # Overall confidence score
    confidences = []
    conf_score = {"HIGH": 4, "MEDIUM_HIGH": 3, "MEDIUM": 2, "LOW": 1}
    for prop in ["johnson_cook", "kienzle", "taylor", "chip_formation",
                 "cutting_recommendations", "tribology", "surface_integrity",
                 "thermal_machining"]:
        if prop in acc and isinstance(acc[prop], dict):
            c = acc[prop].get("confidence", "LOW")
            confidences.append(conf_score.get(c, 1))
    if confidences:
        avg = sum(confidences) / len(confidences)
        if avg >= 3.5:
            accuracy["overall_confidence"] = "HIGH"
        elif avg >= 2.5:
            accuracy["overall_confidence"] = "MEDIUM_HIGH"
        elif avg >= 1.5:
            accuracy["overall_confidence"] = "MEDIUM"
        else:
            accuracy["overall_confidence"] = "LOW"
    else:
        accuracy["overall_confidence"] = "LOW"

    mat["_accuracy"] = accuracy

    # Update data_quality and data_sources
    overall = accuracy["overall_confidence"]
    if overall in ("HIGH", "MEDIUM_HIGH"):
        mat["data_quality"] = "reference"
    elif overall == "MEDIUM":
        mat["data_quality"] = "calculated"
    else:
        mat["data_quality"] = "estimated"

    sources = mat.get("data_sources", [])
    if not isinstance(sources, list):
        sources = []
    if "deep_accuracy_v1" not in sources:
        sources.append("deep_accuracy_v1")
    mat["data_sources"] = sources


# ══════════════════════════════════════════════════════════════════════════════
# PIPELINE RUNNER
# ══════════════════════════════════════════════════════════════════════════════

PIPELINE = [
    ("alloy_resolution", stage1_alloy_resolution),
    ("physical_properties", stage2_physical_properties),
    ("kienzle", stage3_kienzle),
    ("johnson_cook", stage4_johnson_cook),
    ("taylor", stage5_taylor),
    ("chip_formation", stage6_chip_formation),
    ("cutting_recommendations", stage7_cutting_recommendations),
    ("tribology_surface_thermal", stage8_tribology_surface_thermal),
    ("confidence_tagging", stage9_confidence_tagging),
]


def process_material(mat: dict) -> dict:
    """Run all pipeline stages on a single material."""
    acc = {}  # accuracy accumulator
    for stage_name, stage_fn in PIPELINE:
        try:
            stage_fn(mat, acc)
        except Exception as e:
            log.warning(f"Stage {stage_name} failed for {mat.get('name', '?')}: {e}")
            acc[stage_name] = {"confidence": "LOW", "source": f"error: {str(e)[:80]}"}
    return acc


def process_file(filepath: Path) -> dict:
    """Process all materials in a single JSON file."""
    result = {"file": str(filepath), "materials": 0, "enhanced": 0, "errors": []}

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        result["errors"].append(f"Failed to read: {e}")
        return result

    materials = data.get("materials", [])
    if not materials or not isinstance(materials, list):
        return result

    result["materials"] = len(materials)
    enhanced = 0

    for mat in materials:
        if not isinstance(mat, dict):
            continue
        try:
            process_material(mat)
            enhanced += 1
        except Exception as e:
            result["errors"].append(f"{mat.get('name', '?')}: {e}")

    result["enhanced"] = enhanced

    # Write back
    try:
        # Atomic write: write to temp, then rename
        tmp_path = filepath.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        tmp_path.replace(filepath)
    except Exception as e:
        result["errors"].append(f"Failed to write: {e}")

    return result


def update_master_index():
    """Update MASTER_INDEX.json version to 10.1."""
    if not MASTER_INDEX.exists():
        log.warning("MASTER_INDEX.json not found")
        return

    try:
        with open(MASTER_INDEX, "r", encoding="utf-8") as f:
            data = json.load(f)

        meta = data.setdefault("metadata", {})
        meta["version"] = "10.1"
        meta["deep_accuracy_pass"] = datetime.now().isoformat()
        meta["deep_accuracy_version"] = "v1"

        tmp = MASTER_INDEX.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        tmp.replace(MASTER_INDEX)

        log.info("Updated MASTER_INDEX.json to version 10.1")
    except Exception as e:
        log.error(f"Failed to update MASTER_INDEX: {e}")


def main():
    """Main entry point: process all materials across all categories."""
    log.info("=" * 60)
    log.info("PRISM Materials Deep Accuracy Pass v1")
    log.info("=" * 60)
    start = datetime.now()

    # Collect all JSON files
    json_files = []
    for cat_dir in CATEGORY_DIRS:
        cat_path = MATERIALS_ROOT / cat_dir
        if not cat_path.exists():
            log.warning(f"Category dir not found: {cat_path}")
            continue
        for f in cat_path.iterdir():
            if f.suffix == ".json" and f.name not in SKIP_FILES:
                json_files.append(f)

    log.info(f"Found {len(json_files)} JSON files to process")

    # Process all files
    results = []
    total_materials = 0
    total_enhanced = 0
    total_errors = 0

    for i, filepath in enumerate(sorted(json_files)):
        log.info(f"[{i+1}/{len(json_files)}] {filepath.parent.name}/{filepath.name}")
        result = process_file(filepath)
        results.append(result)
        total_materials += result["materials"]
        total_enhanced += result["enhanced"]
        total_errors += len(result["errors"])
        if result["errors"]:
            for err in result["errors"][:3]:
                log.warning(f"  Error: {err}")

    # Update master index
    update_master_index()

    elapsed = (datetime.now() - start).total_seconds()

    # Summary
    log.info("")
    log.info("=" * 60)
    log.info("SUMMARY")
    log.info("=" * 60)
    log.info(f"Files processed:    {len(json_files)}")
    log.info(f"Materials found:    {total_materials}")
    log.info(f"Materials enhanced: {total_enhanced}")
    log.info(f"Errors:             {total_errors}")
    log.info(f"Elapsed:            {elapsed:.1f}s")

    # Confidence distribution
    conf_dist = {"HIGH": 0, "MEDIUM_HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for filepath in sorted(json_files):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            for mat in data.get("materials", []):
                acc = mat.get("_accuracy", {})
                oc = acc.get("overall_confidence", "LOW")
                conf_dist[oc] = conf_dist.get(oc, 0) + 1
        except (json.JSONDecodeError, OSError) as e:
            log.warning(f"Could not re-read {filepath.name} for stats: {e}")

    log.info("")
    log.info("Confidence Distribution:")
    for level in ["HIGH", "MEDIUM_HIGH", "MEDIUM", "LOW"]:
        count = conf_dist.get(level, 0)
        pct = (count / max(total_materials, 1)) * 100
        log.info(f"  {level:15s}: {count:5d} ({pct:5.1f}%)")

    # Write log
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "version": "deep_accuracy_v1",
        "total_files": len(json_files),
        "total_materials": total_materials,
        "total_enhanced": total_enhanced,
        "total_errors": total_errors,
        "elapsed_seconds": elapsed,
        "confidence_distribution": conf_dist,
        "files": results,
    }
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        log.info(f"\nLog written to: {LOG_FILE}")
    except Exception as e:
        log.error(f"Failed to write log: {e}")

    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
