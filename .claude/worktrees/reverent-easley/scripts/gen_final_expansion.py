"""
PRISM PARALLEL GENERATOR - Remaining 340 Materials
X-RUBE (30) + Existing Category Expansions (310)
"""

import json
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

MATERIALS_DIR = Path(r"C:\PRISM\data\materials")
MATERIALS_DIR.mkdir(parents=True, exist_ok=True)
(MATERIALS_DIR / "X_SPECIALTY").mkdir(exist_ok=True)

def create_base(mat_id, name, category, subcategory, iso_class):
    """Universal base - 127+ parameters"""
    return {
        "id": mat_id, "name": name, "uns": "", "din": "", "jis": "", "iso": "",
        "aliases": [], "manufacturer_names": {},
        "description": f"{name} - {subcategory} material for precision machining",
        "typical_applications": [], "similar_materials": [], "image_url": "",
        "category": category, "family": subcategory, "group": subcategory,
        "iso_p_class": None, "iso_m_class": None, "iso_k_class": None,
        "iso_n_class": None, "iso_s_class": None, "iso_x_class": iso_class if iso_class.startswith("X") else None,
        "tensile_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.7},
        "yield_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.7},
        "elongation": {"value": 0, "unit": "%", "source": "estimated", "confidence": 0.6},
        "reduction_of_area": {"value": 0, "unit": "%", "source": "estimated", "confidence": 0.5},
        "hardness_hrc": {"value": None, "unit": "HRC", "source": "estimated", "confidence": 0.7},
        "hardness_hb": {"value": 0, "unit": "HB", "source": "estimated", "confidence": 0.7},
        "hardness_hv": {"value": 0, "unit": "HV", "source": "estimated", "confidence": 0.7},
        "elastic_modulus": {"value": 0, "unit": "GPa", "source": "estimated", "confidence": 0.8},
        "shear_modulus": {"value": 0, "unit": "GPa", "source": "estimated", "confidence": 0.7},
        "poisson_ratio": {"value": 0.3, "unit": "-", "source": "estimated", "confidence": 0.8},
        "fatigue_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.5},
        "impact_strength": {"value": 0, "unit": "J", "source": "estimated", "confidence": 0.5},
        "fracture_toughness": {"value": 0, "unit": "MPa*m^0.5", "source": "estimated", "confidence": 0.5},
        "compressive_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.7},
        "shear_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.6},
        "work_hardening_exp": {"value": 0, "unit": "-", "source": "estimated", "confidence": 0.5},
        "strength_coefficient": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.5},
        "strain_rate_sensitivity": {"value": 0.01, "unit": "-", "source": "estimated", "confidence": 0.5},
        "thermal_conductivity": {"value": 50, "unit": "W/m*K", "source": "estimated", "confidence": 0.8},
        "specific_heat": {"value": 500, "unit": "J/kg*K", "source": "estimated", "confidence": 0.8},
        "melting_point": {"value": 0, "unit": "C", "source": "estimated", "confidence": 0.9},
        "solidus_temp": {"value": 0, "unit": "C", "source": "estimated", "confidence": 0.7},
        "liquidus_temp": {"value": 0, "unit": "C", "source": "estimated", "confidence": 0.7},
        "thermal_expansion": {"value": 12, "unit": "um/m*K", "source": "estimated", "confidence": 0.8},
        "thermal_diffusivity": {"value": 10, "unit": "mm2/s", "source": "estimated", "confidence": 0.6},
        "emissivity": {"value": 0.5, "unit": "-", "source": "estimated", "confidence": 0.6},
        "max_service_temp": {"value": 0, "unit": "C", "source": "estimated", "confidence": 0.8},
        "annealing_temp": {"value": None, "unit": "C", "source": "estimated", "confidence": 0.5},
        "tempering_temp": {"value": None, "unit": "C", "source": "estimated", "confidence": 0.5},
        "austenitizing_temp": {"value": None, "unit": "C", "source": "estimated", "confidence": 0.5},
        "density": {"value": 0, "unit": "kg/m3", "source": "estimated", "confidence": 0.95},
        "crystal_structure": None,
        "magnetic": False,
        "electrical_resistivity": {"value": 0, "unit": "uOhm*cm", "source": "estimated", "confidence": 0.6},
        "corrosion_resistance": "GOOD",
        "weldability": "FAIR",
        "machinability_index": {"value": 50, "unit": "%", "source": "estimated", "confidence": 0.7},
        "reference_material": "AISI_1212",
        "chip_type": "SEGMENTED",
        "chip_breakability": "FAIR",
        "built_up_edge_tendency": "MEDIUM",
        "abrasiveness": "MEDIUM",
        "work_hardening_severity": "LOW",
        "cutting_temp_tendency": "MEDIUM",
        "surface_finish_quality": "GOOD",
        "tool_wear_mode": "FLANK",
        "recommended_tool_material": ["Carbide"],
        "recommended_coating": ["TiAlN"],
        "recommended_coolant": "FLOOD",
        "specific_cutting_energy": {"value": 2.0, "unit": "J/mm3", "source": "estimated", "confidence": 0.7},
        "cutting_speed_multiplier": {"value": 1.0, "unit": "-", "source": "estimated", "confidence": 0.7},
        "kc1_1": {"value": 1500, "unit": "N/mm2", "source": "estimated", "confidence": 0.7},
        "mc": {"value": 0.25, "unit": "-", "source": "estimated", "confidence": 0.6},
        "kc1_1_turning": {"value": 1500, "unit": "N/mm2", "source": "estimated", "confidence": 0.7},
        "kc1_1_milling": {"value": 1650, "unit": "N/mm2", "source": "estimated", "confidence": 0.7},
        "kc1_1_drilling": {"value": 1800, "unit": "N/mm2", "source": "estimated", "confidence": 0.7},
        "rake_angle_correction": {"value": 1.5, "unit": "%/deg", "source": "estimated", "confidence": 0.5},
        "wear_correction_factor": {"value": 1.1, "unit": "-", "source": "estimated", "confidence": 0.5},
        "speed_correction_factor": {"value": 1.0, "unit": "-", "source": "estimated", "confidence": 0.5},
        "coolant_correction_factor": {"value": 0.9, "unit": "-", "source": "estimated", "confidence": 0.5},
        "feed_force_ratio": {"value": 0.5, "unit": "-", "source": "estimated", "confidence": 0.5},
        "passive_force_ratio": {"value": 0.3, "unit": "-", "source": "estimated", "confidence": 0.5},
        "kc_source": "estimated",
        "jc_A": {"value": 400, "unit": "MPa", "source": "estimated", "confidence": 0.5},
        "jc_B": {"value": 500, "unit": "MPa", "source": "estimated", "confidence": 0.5},
        "jc_n": {"value": 0.3, "unit": "-", "source": "estimated", "confidence": 0.5},
        "jc_C": {"value": 0.01, "unit": "-", "source": "estimated", "confidence": 0.5},
        "jc_m": {"value": 1.0, "unit": "-", "source": "estimated", "confidence": 0.5},
        "jc_ref_strain_rate": {"value": 1.0, "unit": "1/s", "source": "literature", "confidence": 0.9},
        "jc_ref_temp": {"value": 20, "unit": "C", "source": "literature", "confidence": 0.9},
        "jc_source": "estimated",
        "taylor_C": {"value": 200, "unit": "m/min", "source": "estimated", "confidence": 0.6},
        "taylor_n": {"value": 0.25, "unit": "-", "source": "estimated", "confidence": 0.5},
        "taylor_C_turning": {"value": 200, "unit": "m/min", "source": "estimated", "confidence": 0.6},
        "taylor_C_milling": {"value": 180, "unit": "m/min", "source": "estimated", "confidence": 0.6},
        "taylor_C_drilling": {"value": 150, "unit": "m/min", "source": "estimated", "confidence": 0.6},
        "taylor_feed_exp": {"value": 0.15, "unit": "-", "source": "estimated", "confidence": 0.5},
        "taylor_doc_exp": {"value": 0.10, "unit": "-", "source": "estimated", "confidence": 0.5},
        "taylor_coolant_factor": {"value": 1.2, "unit": "-", "source": "estimated", "confidence": 0.5},
        "taylor_hardness_factor": {"value": 1.0, "unit": "-", "source": "estimated", "confidence": 0.5},
        "taylor_source": "estimated",
        "min_achievable_ra": {"value": 0.8, "unit": "um", "source": "estimated", "confidence": 0.7},
        "typical_ra_range": {"min": 0.8, "max": 6.3, "unit": "um"},
        "surface_integrity_sensitivity": "MEDIUM",
        "residual_stress_tendency": "COMPRESSIVE",
        "burr_formation_tendency": "MEDIUM",
        "surface_hardening_tendency": "LOW",
        "surface_chemistry_sensitivity": "LOW",
        "surface_source": "estimated",
        "coolant_compatibility": {
            "flood": {"compatible": True, "effectiveness": 0.9},
            "mist": {"compatible": True, "effectiveness": 0.7},
            "mql": {"compatible": True, "effectiveness": 0.8},
            "dry": {"compatible": True, "effectiveness": 0.5},
            "cryogenic": {"compatible": True, "effectiveness": 0.85},
            "high_pressure": {"compatible": True, "effectiveness": 0.95}
        },
        "coolant_primary_recommendation": "FLOOD",
        "coolant_secondary_recommendation": "MQL",
        "coolant_restrictions": [],
        "coolant_notes": "",
        "emulsion_concentration": {"min": 5, "max": 10, "unit": "%"},
        "coolant_pressure_recommendation": {"min": 20, "max": 70, "unit": "bar"},
        "coolant_source": "estimated",
        "data_quality_grade": "C",
        "primary_source": "estimated",
        "secondary_sources": [],
        "last_verified": datetime.now().strftime("%Y-%m-%d"),
        "created_date": datetime.now().strftime("%Y-%m-%d"),
        "created_by": "PRISM_EXPANSION_GENERATOR",
        "version": "1.0",
        "notes": "",
        "validation_status": "PENDING",
        "confidence_overall": 0.65
    }

# ============================================================================
# X-RUBE: RUBBER & ELASTOMERS (30 materials)
# ============================================================================
RUBBER_MATERIALS = [
    ("X-RUBE-001", "Natural Rubber NR 40", {"tensile": 25, "elongation": 600, "hardness": 40, "density": 930, "max_temp": 70, "kc1_1": 30}),
    ("X-RUBE-002", "Natural Rubber NR 50", {"tensile": 22, "elongation": 550, "hardness": 50, "density": 950, "max_temp": 70, "kc1_1": 35}),
    ("X-RUBE-003", "Natural Rubber NR 60", {"tensile": 20, "elongation": 500, "hardness": 60, "density": 970, "max_temp": 70, "kc1_1": 40}),
    ("X-RUBE-004", "Natural Rubber NR 70", {"tensile": 18, "elongation": 400, "hardness": 70, "density": 990, "max_temp": 70, "kc1_1": 50}),
    ("X-RUBE-005", "SBR 50 Shore A", {"tensile": 18, "elongation": 450, "hardness": 50, "density": 1000, "max_temp": 80, "kc1_1": 35}),
    ("X-RUBE-006", "SBR 70 Shore A", {"tensile": 15, "elongation": 350, "hardness": 70, "density": 1050, "max_temp": 80, "kc1_1": 45}),
    ("X-RUBE-007", "EPDM 50 Shore A", {"tensile": 15, "elongation": 400, "hardness": 50, "density": 1100, "max_temp": 130, "kc1_1": 35}),
    ("X-RUBE-008", "EPDM 70 Shore A", {"tensile": 12, "elongation": 300, "hardness": 70, "density": 1150, "max_temp": 130, "kc1_1": 45}),
    ("X-RUBE-009", "Neoprene CR 50", {"tensile": 20, "elongation": 400, "hardness": 50, "density": 1250, "max_temp": 100, "kc1_1": 40}),
    ("X-RUBE-010", "Neoprene CR 70", {"tensile": 18, "elongation": 300, "hardness": 70, "density": 1300, "max_temp": 100, "kc1_1": 55}),
    ("X-RUBE-011", "Nitrile NBR 50", {"tensile": 18, "elongation": 400, "hardness": 50, "density": 1200, "max_temp": 100, "kc1_1": 38}),
    ("X-RUBE-012", "Nitrile NBR 70", {"tensile": 15, "elongation": 300, "hardness": 70, "density": 1250, "max_temp": 100, "kc1_1": 50}),
    ("X-RUBE-013", "HNBR 70 Shore A", {"tensile": 22, "elongation": 350, "hardness": 70, "density": 1300, "max_temp": 150, "kc1_1": 55}),
    ("X-RUBE-014", "Silicone VMQ 50", {"tensile": 8, "elongation": 400, "hardness": 50, "density": 1100, "max_temp": 200, "kc1_1": 25}),
    ("X-RUBE-015", "Silicone VMQ 70", {"tensile": 7, "elongation": 300, "hardness": 70, "density": 1150, "max_temp": 200, "kc1_1": 35}),
    ("X-RUBE-016", "Fluorosilicone FVMQ", {"tensile": 9, "elongation": 300, "hardness": 60, "density": 1400, "max_temp": 175, "kc1_1": 40}),
    ("X-RUBE-017", "Viton FKM 70", {"tensile": 12, "elongation": 200, "hardness": 70, "density": 1850, "max_temp": 200, "kc1_1": 50}),
    ("X-RUBE-018", "Viton FKM 90", {"tensile": 10, "elongation": 150, "hardness": 90, "density": 1900, "max_temp": 200, "kc1_1": 70}),
    ("X-RUBE-019", "Aflas FEPM", {"tensile": 15, "elongation": 250, "hardness": 75, "density": 1950, "max_temp": 230, "kc1_1": 55}),
    ("X-RUBE-020", "Kalrez FFKM", {"tensile": 18, "elongation": 200, "hardness": 75, "density": 2000, "max_temp": 300, "kc1_1": 60}),
    ("X-RUBE-021", "Butyl IIR 50", {"tensile": 15, "elongation": 500, "hardness": 50, "density": 920, "max_temp": 100, "kc1_1": 30}),
    ("X-RUBE-022", "Chlorobutyl CIIR", {"tensile": 14, "elongation": 450, "hardness": 55, "density": 1100, "max_temp": 110, "kc1_1": 35}),
    ("X-RUBE-023", "Polyurethane AU 70", {"tensile": 35, "elongation": 500, "hardness": 70, "density": 1150, "max_temp": 80, "kc1_1": 60}),
    ("X-RUBE-024", "Polyurethane AU 90", {"tensile": 45, "elongation": 350, "hardness": 90, "density": 1200, "max_temp": 80, "kc1_1": 85}),
    ("X-RUBE-025", "Polyurethane EU 95A", {"tensile": 50, "elongation": 400, "hardness": 95, "density": 1220, "max_temp": 70, "kc1_1": 90}),
    ("X-RUBE-026", "Hypalon CSM", {"tensile": 15, "elongation": 350, "hardness": 60, "density": 1250, "max_temp": 120, "kc1_1": 45}),
    ("X-RUBE-027", "Epichlorohydrin ECO", {"tensile": 14, "elongation": 300, "hardness": 65, "density": 1350, "max_temp": 135, "kc1_1": 48}),
    ("X-RUBE-028", "Acrylate ACM", {"tensile": 12, "elongation": 250, "hardness": 60, "density": 1100, "max_temp": 150, "kc1_1": 42}),
    ("X-RUBE-029", "Ethylene Acrylic AEM", {"tensile": 15, "elongation": 300, "hardness": 70, "density": 1100, "max_temp": 150, "kc1_1": 48}),
    ("X-RUBE-030", "Perfluoroelastomer FFPM", {"tensile": 20, "elongation": 180, "hardness": 80, "density": 2100, "max_temp": 315, "kc1_1": 65}),
]

# ============================================================================
# P_STEELS EXPANSION (+51 materials)
# ============================================================================
P_STEELS_EXPANSION = [
    ("P-STEEL-EXP-001", "AISI 1006 Cold Rolled", {"tensile": 330, "yield": 280, "hardness": 95, "kc1_1": 1400}),
    ("P-STEEL-EXP-002", "AISI 1008 Hot Rolled", {"tensile": 340, "yield": 285, "hardness": 95, "kc1_1": 1420}),
    ("P-STEEL-EXP-003", "AISI 1010 Annealed", {"tensile": 365, "yield": 305, "hardness": 105, "kc1_1": 1450}),
    ("P-STEEL-EXP-004", "AISI 1015 Normalized", {"tensile": 385, "yield": 325, "hardness": 111, "kc1_1": 1480}),
    ("P-STEEL-EXP-005", "AISI 1018 Cold Drawn", {"tensile": 440, "yield": 370, "hardness": 126, "kc1_1": 1550}),
    ("P-STEEL-EXP-006", "AISI 1020 Hot Rolled", {"tensile": 420, "yield": 350, "hardness": 121, "kc1_1": 1520}),
    ("P-STEEL-EXP-007", "AISI 1025 Annealed", {"tensile": 450, "yield": 380, "hardness": 130, "kc1_1": 1580}),
    ("P-STEEL-EXP-008", "AISI 1030 Normalized", {"tensile": 525, "yield": 440, "hardness": 149, "kc1_1": 1680}),
    ("P-STEEL-EXP-009", "AISI 1035 Q&T 400F", {"tensile": 850, "yield": 700, "hardness": 248, "kc1_1": 2100}),
    ("P-STEEL-EXP-010", "AISI 1040 Q&T 800F", {"tensile": 750, "yield": 600, "hardness": 217, "kc1_1": 1950}),
    ("P-STEEL-EXP-011", "AISI 1045 Q&T 600F", {"tensile": 900, "yield": 750, "hardness": 262, "kc1_1": 2200}),
    ("P-STEEL-EXP-012", "AISI 1050 Normalized", {"tensile": 725, "yield": 420, "hardness": 217, "kc1_1": 1900}),
    ("P-STEEL-EXP-013", "AISI 1055 Q&T 800F", {"tensile": 800, "yield": 650, "hardness": 229, "kc1_1": 2000}),
    ("P-STEEL-EXP-014", "AISI 1060 Annealed", {"tensile": 625, "yield": 370, "hardness": 179, "kc1_1": 1750}),
    ("P-STEEL-EXP-015", "AISI 1065 Q&T 600F", {"tensile": 950, "yield": 800, "hardness": 277, "kc1_1": 2300}),
    ("P-STEEL-EXP-016", "AISI 1070 Normalized", {"tensile": 750, "yield": 450, "hardness": 217, "kc1_1": 1950}),
    ("P-STEEL-EXP-017", "AISI 1080 Annealed", {"tensile": 615, "yield": 375, "hardness": 174, "kc1_1": 1720}),
    ("P-STEEL-EXP-018", "AISI 1095 Q&T 400F", {"tensile": 1050, "yield": 900, "hardness": 302, "kc1_1": 2500}),
    ("P-STEEL-EXP-019", "AISI 11L17 Free Machining", {"tensile": 400, "yield": 330, "hardness": 116, "kc1_1": 1200}),
    ("P-STEEL-EXP-020", "AISI 12L14 Leaded", {"tensile": 540, "yield": 415, "hardness": 163, "kc1_1": 1100}),
    ("P-STEEL-EXP-021", "AISI 1117 Carburizing", {"tensile": 450, "yield": 380, "hardness": 131, "kc1_1": 1500}),
    ("P-STEEL-EXP-022", "AISI 1141 Q&T 400F", {"tensile": 900, "yield": 750, "hardness": 262, "kc1_1": 2150}),
    ("P-STEEL-EXP-023", "AISI 1144 Stress Proof", {"tensile": 860, "yield": 710, "hardness": 248, "kc1_1": 2050}),
    ("P-STEEL-EXP-024", "AISI 4130 Normalized", {"tensile": 670, "yield": 435, "hardness": 197, "kc1_1": 1850}),
    ("P-STEEL-EXP-025", "AISI 4130 Q&T 400F", {"tensile": 1280, "yield": 1190, "hardness": 375, "kc1_1": 2800}),
    ("P-STEEL-EXP-026", "AISI 4140 Annealed", {"tensile": 655, "yield": 420, "hardness": 197, "kc1_1": 1820}),
    ("P-STEEL-EXP-027", "AISI 4140 Q&T 600F", {"tensile": 1075, "yield": 985, "hardness": 311, "kc1_1": 2450}),
    ("P-STEEL-EXP-028", "AISI 4145 Q&T 800F", {"tensile": 930, "yield": 840, "hardness": 269, "kc1_1": 2250}),
    ("P-STEEL-EXP-029", "AISI 4150 Q&T 400F", {"tensile": 1380, "yield": 1280, "hardness": 401, "kc1_1": 3000}),
    ("P-STEEL-EXP-030", "AISI 4320 Carburized", {"tensile": 800, "yield": 600, "hardness": 235, "kc1_1": 2000}),
    ("P-STEEL-EXP-031", "AISI 4340 Annealed", {"tensile": 745, "yield": 470, "hardness": 217, "kc1_1": 1920}),
    ("P-STEEL-EXP-032", "AISI 4340 Q&T 400F", {"tensile": 1470, "yield": 1365, "hardness": 430, "kc1_1": 3200}),
    ("P-STEEL-EXP-033", "AISI 4620 Carburized", {"tensile": 750, "yield": 550, "hardness": 217, "kc1_1": 1950}),
    ("P-STEEL-EXP-034", "AISI 4820 Carburized", {"tensile": 850, "yield": 650, "hardness": 248, "kc1_1": 2100}),
    ("P-STEEL-EXP-035", "AISI 5120 Carburized", {"tensile": 700, "yield": 500, "hardness": 201, "kc1_1": 1880}),
    ("P-STEEL-EXP-036", "AISI 5140 Q&T 600F", {"tensile": 1000, "yield": 900, "hardness": 293, "kc1_1": 2350}),
    ("P-STEEL-EXP-037", "AISI 5160 Q&T 800F", {"tensile": 950, "yield": 850, "hardness": 277, "kc1_1": 2280}),
    ("P-STEEL-EXP-038", "AISI 6150 Q&T 400F", {"tensile": 1280, "yield": 1170, "hardness": 375, "kc1_1": 2800}),
    ("P-STEEL-EXP-039", "AISI 8620 Carburized", {"tensile": 750, "yield": 550, "hardness": 217, "kc1_1": 1950}),
    ("P-STEEL-EXP-040", "AISI 8640 Q&T 600F", {"tensile": 1050, "yield": 950, "hardness": 302, "kc1_1": 2400}),
    ("P-STEEL-EXP-041", "AISI 9310 Carburized", {"tensile": 900, "yield": 700, "hardness": 262, "kc1_1": 2150}),
    ("P-STEEL-EXP-042", "A36 Structural", {"tensile": 400, "yield": 250, "hardness": 119, "kc1_1": 1480}),
    ("P-STEEL-EXP-043", "A572 Grade 50", {"tensile": 450, "yield": 345, "hardness": 130, "kc1_1": 1600}),
    ("P-STEEL-EXP-044", "A514 Grade B", {"tensile": 760, "yield": 690, "hardness": 235, "kc1_1": 2050}),
    ("P-STEEL-EXP-045", "A588 Weathering", {"tensile": 485, "yield": 345, "hardness": 143, "kc1_1": 1680}),
    ("P-STEEL-EXP-046", "EN8 080M40", {"tensile": 700, "yield": 450, "hardness": 201, "kc1_1": 1880}),
    ("P-STEEL-EXP-047", "EN9 070M55", {"tensile": 770, "yield": 510, "hardness": 229, "kc1_1": 2000}),
    ("P-STEEL-EXP-048", "EN19 709M40", {"tensile": 850, "yield": 680, "hardness": 248, "kc1_1": 2100}),
    ("P-STEEL-EXP-049", "EN24 817M40", {"tensile": 1000, "yield": 850, "hardness": 293, "kc1_1": 2350}),
    ("P-STEEL-EXP-050", "S45C JIS", {"tensile": 690, "yield": 490, "hardness": 201, "kc1_1": 1850}),
    ("P-STEEL-EXP-051", "SCM440 JIS", {"tensile": 980, "yield": 830, "hardness": 285, "kc1_1": 2300}),
]

# ============================================================================
# M_STAINLESS EXPANSION (+59 materials)
# ============================================================================
M_STAINLESS_EXPANSION = [
    ("M-SS-EXP-001", "304 Annealed", {"tensile": 515, "yield": 205, "hardness": 201, "kc1_1": 2400}),
    ("M-SS-EXP-002", "304L Annealed", {"tensile": 485, "yield": 170, "hardness": 187, "kc1_1": 2350}),
    ("M-SS-EXP-003", "304H High Carbon", {"tensile": 550, "yield": 240, "hardness": 217, "kc1_1": 2500}),
    ("M-SS-EXP-004", "304N Nitrogen", {"tensile": 620, "yield": 330, "hardness": 241, "kc1_1": 2650}),
    ("M-SS-EXP-005", "316 Annealed", {"tensile": 515, "yield": 205, "hardness": 201, "kc1_1": 2450}),
    ("M-SS-EXP-006", "316L Annealed", {"tensile": 485, "yield": 170, "hardness": 187, "kc1_1": 2400}),
    ("M-SS-EXP-007", "316Ti Stabilized", {"tensile": 520, "yield": 215, "hardness": 207, "kc1_1": 2480}),
    ("M-SS-EXP-008", "316LN Nitrogen", {"tensile": 550, "yield": 260, "hardness": 217, "kc1_1": 2550}),
    ("M-SS-EXP-009", "317L Low Carbon", {"tensile": 515, "yield": 205, "hardness": 201, "kc1_1": 2500}),
    ("M-SS-EXP-010", "321 Stabilized", {"tensile": 515, "yield": 205, "hardness": 201, "kc1_1": 2420}),
    ("M-SS-EXP-011", "321H High Carbon", {"tensile": 550, "yield": 240, "hardness": 217, "kc1_1": 2520}),
    ("M-SS-EXP-012", "347 Stabilized", {"tensile": 515, "yield": 205, "hardness": 201, "kc1_1": 2450}),
    ("M-SS-EXP-013", "347H High Carbon", {"tensile": 550, "yield": 240, "hardness": 217, "kc1_1": 2550}),
    ("M-SS-EXP-014", "309 Heat Resistant", {"tensile": 515, "yield": 205, "hardness": 201, "kc1_1": 2500}),
    ("M-SS-EXP-015", "309S Low Carbon", {"tensile": 500, "yield": 195, "hardness": 195, "kc1_1": 2450}),
    ("M-SS-EXP-016", "310 Heat Resistant", {"tensile": 515, "yield": 205, "hardness": 201, "kc1_1": 2550}),
    ("M-SS-EXP-017", "310S Low Carbon", {"tensile": 500, "yield": 195, "hardness": 195, "kc1_1": 2500}),
    ("M-SS-EXP-018", "314 High Si", {"tensile": 550, "yield": 250, "hardness": 217, "kc1_1": 2600}),
    ("M-SS-EXP-019", "330 High Ni", {"tensile": 485, "yield": 215, "hardness": 187, "kc1_1": 2400}),
    ("M-SS-EXP-020", "201 Low Ni", {"tensile": 655, "yield": 310, "hardness": 241, "kc1_1": 2200}),
    ("M-SS-EXP-021", "202 Low Ni", {"tensile": 620, "yield": 275, "hardness": 229, "kc1_1": 2150}),
    ("M-SS-EXP-022", "301 High Work Hard", {"tensile": 760, "yield": 275, "hardness": 269, "kc1_1": 2600}),
    ("M-SS-EXP-023", "302 Standard", {"tensile": 620, "yield": 275, "hardness": 229, "kc1_1": 2350}),
    ("M-SS-EXP-024", "303 Free Machining", {"tensile": 620, "yield": 240, "hardness": 228, "kc1_1": 1900}),
    ("M-SS-EXP-025", "303Se Selenium", {"tensile": 600, "yield": 230, "hardness": 221, "kc1_1": 1850}),
    ("M-SS-EXP-026", "410 Martensitic", {"tensile": 485, "yield": 275, "hardness": 228, "kc1_1": 2100}),
    ("M-SS-EXP-027", "410S Low Carbon", {"tensile": 450, "yield": 240, "hardness": 207, "kc1_1": 2000}),
    ("M-SS-EXP-028", "416 Free Machining", {"tensile": 520, "yield": 310, "hardness": 228, "kc1_1": 1700}),
    ("M-SS-EXP-029", "420 Martensitic", {"tensile": 655, "yield": 345, "hardness": 241, "kc1_1": 2200}),
    ("M-SS-EXP-030", "420F Free Machining", {"tensile": 620, "yield": 330, "hardness": 235, "kc1_1": 1800}),
    ("M-SS-EXP-031", "431 High Cr", {"tensile": 860, "yield": 655, "hardness": 285, "kc1_1": 2400}),
    ("M-SS-EXP-032", "440A Martensitic", {"tensile": 725, "yield": 415, "hardness": 269, "kc1_1": 2300}),
    ("M-SS-EXP-033", "440B Martensitic", {"tensile": 740, "yield": 425, "hardness": 277, "kc1_1": 2350}),
    ("M-SS-EXP-034", "440C High Carbon", {"tensile": 760, "yield": 450, "hardness": 285, "kc1_1": 2400}),
    ("M-SS-EXP-035", "17-4PH H900", {"tensile": 1310, "yield": 1170, "hardness": 401, "kc1_1": 2800}),
    ("M-SS-EXP-036", "17-4PH H1025", {"tensile": 1070, "yield": 1000, "hardness": 331, "kc1_1": 2600}),
    ("M-SS-EXP-037", "17-4PH H1150", {"tensile": 930, "yield": 860, "hardness": 293, "kc1_1": 2450}),
    ("M-SS-EXP-038", "15-5PH H900", {"tensile": 1280, "yield": 1140, "hardness": 388, "kc1_1": 2750}),
    ("M-SS-EXP-039", "15-5PH H1025", {"tensile": 1035, "yield": 965, "hardness": 318, "kc1_1": 2550}),
    ("M-SS-EXP-040", "13-8Mo H950", {"tensile": 1520, "yield": 1410, "hardness": 444, "kc1_1": 3000}),
    ("M-SS-EXP-041", "A286 Aged", {"tensile": 1000, "yield": 690, "hardness": 293, "kc1_1": 2650}),
    ("M-SS-EXP-042", "2205 Duplex", {"tensile": 620, "yield": 450, "hardness": 293, "kc1_1": 2600}),
    ("M-SS-EXP-043", "2507 Super Duplex", {"tensile": 795, "yield": 550, "hardness": 310, "kc1_1": 2800}),
    ("M-SS-EXP-044", "2304 Lean Duplex", {"tensile": 600, "yield": 400, "hardness": 269, "kc1_1": 2500}),
    ("M-SS-EXP-045", "LDX 2101 Lean", {"tensile": 650, "yield": 450, "hardness": 277, "kc1_1": 2550}),
    ("M-SS-EXP-046", "254 SMO Super Aus", {"tensile": 650, "yield": 310, "hardness": 235, "kc1_1": 2700}),
    ("M-SS-EXP-047", "904L Super Aus", {"tensile": 490, "yield": 220, "hardness": 187, "kc1_1": 2600}),
    ("M-SS-EXP-048", "AL-6XN Super Aus", {"tensile": 655, "yield": 310, "hardness": 241, "kc1_1": 2750}),
    ("M-SS-EXP-049", "Nitronic 50", {"tensile": 827, "yield": 414, "hardness": 277, "kc1_1": 2650}),
    ("M-SS-EXP-050", "Nitronic 60", {"tensile": 690, "yield": 345, "hardness": 241, "kc1_1": 2500}),
    ("M-SS-EXP-051", "17-7PH RH950", {"tensile": 1310, "yield": 1170, "hardness": 401, "kc1_1": 2780}),
    ("M-SS-EXP-052", "PH 13-8Mo", {"tensile": 1380, "yield": 1280, "hardness": 415, "kc1_1": 2900}),
    ("M-SS-EXP-053", "Custom 450", {"tensile": 1000, "yield": 900, "hardness": 302, "kc1_1": 2600}),
    ("M-SS-EXP-054", "Custom 455", {"tensile": 1170, "yield": 1070, "hardness": 352, "kc1_1": 2750}),
    ("M-SS-EXP-055", "Custom 465", {"tensile": 1720, "yield": 1655, "hardness": 477, "kc1_1": 3100}),
    ("M-SS-EXP-056", "Ferralium 255", {"tensile": 760, "yield": 550, "hardness": 302, "kc1_1": 2700}),
    ("M-SS-EXP-057", "Zeron 100", {"tensile": 750, "yield": 550, "hardness": 310, "kc1_1": 2750}),
    ("M-SS-EXP-058", "SAF 2906", {"tensile": 800, "yield": 600, "hardness": 320, "kc1_1": 2850}),
    ("M-SS-EXP-059", "S32760 Super Duplex", {"tensile": 750, "yield": 550, "hardness": 302, "kc1_1": 2800}),
]

# ============================================================================
# K_CAST_IRON EXPANSION (+26 materials)
# ============================================================================
K_CAST_IRON_EXPANSION = [
    ("K-CI-EXP-001", "Gray Iron Class 20", {"tensile": 138, "hardness": 156, "kc1_1": 1100}),
    ("K-CI-EXP-002", "Gray Iron Class 25", {"tensile": 173, "hardness": 174, "kc1_1": 1150}),
    ("K-CI-EXP-003", "Gray Iron Class 30", {"tensile": 207, "hardness": 187, "kc1_1": 1200}),
    ("K-CI-EXP-004", "Gray Iron Class 35", {"tensile": 241, "hardness": 207, "kc1_1": 1280}),
    ("K-CI-EXP-005", "Gray Iron Class 40", {"tensile": 276, "hardness": 217, "kc1_1": 1350}),
    ("K-CI-EXP-006", "Gray Iron Class 45", {"tensile": 310, "hardness": 229, "kc1_1": 1420}),
    ("K-CI-EXP-007", "Gray Iron Class 50", {"tensile": 345, "hardness": 241, "kc1_1": 1500}),
    ("K-CI-EXP-008", "Gray Iron Class 55", {"tensile": 379, "hardness": 255, "kc1_1": 1580}),
    ("K-CI-EXP-009", "Gray Iron Class 60", {"tensile": 414, "hardness": 269, "kc1_1": 1650}),
    ("K-CI-EXP-010", "Ductile 60-40-18", {"tensile": 414, "hardness": 149, "kc1_1": 1400}),
    ("K-CI-EXP-011", "Ductile 65-45-12", {"tensile": 448, "hardness": 156, "kc1_1": 1480}),
    ("K-CI-EXP-012", "Ductile 80-55-06", {"tensile": 552, "hardness": 187, "kc1_1": 1650}),
    ("K-CI-EXP-013", "Ductile 100-70-03", {"tensile": 690, "hardness": 241, "kc1_1": 1900}),
    ("K-CI-EXP-014", "Ductile 120-90-02", {"tensile": 827, "hardness": 269, "kc1_1": 2100}),
    ("K-CI-EXP-015", "ADI Grade 1", {"tensile": 900, "hardness": 269, "kc1_1": 2200}),
    ("K-CI-EXP-016", "ADI Grade 2", {"tensile": 1050, "hardness": 302, "kc1_1": 2400}),
    ("K-CI-EXP-017", "ADI Grade 3", {"tensile": 1200, "hardness": 341, "kc1_1": 2600}),
    ("K-CI-EXP-018", "ADI Grade 4", {"tensile": 1400, "hardness": 375, "kc1_1": 2850}),
    ("K-CI-EXP-019", "ADI Grade 5", {"tensile": 1600, "hardness": 415, "kc1_1": 3100}),
    ("K-CI-EXP-020", "Compacted Graphite 300", {"tensile": 300, "hardness": 179, "kc1_1": 1350}),
    ("K-CI-EXP-021", "Compacted Graphite 350", {"tensile": 350, "hardness": 197, "kc1_1": 1450}),
    ("K-CI-EXP-022", "Compacted Graphite 400", {"tensile": 400, "hardness": 217, "kc1_1": 1550}),
    ("K-CI-EXP-023", "Compacted Graphite 450", {"tensile": 450, "hardness": 235, "kc1_1": 1650}),
    ("K-CI-EXP-024", "White Iron Ni-Hard 1", {"tensile": 275, "hardness": 550, "kc1_1": 3500}),
    ("K-CI-EXP-025", "White Iron Ni-Hard 4", {"tensile": 400, "hardness": 630, "kc1_1": 4000}),
    ("K-CI-EXP-026", "High Chrome White Iron", {"tensile": 350, "hardness": 600, "kc1_1": 4200}),
]

# ============================================================================
# N_NONFERROUS EXPANSION (+102 materials)
# ============================================================================
N_NONFERROUS_EXPANSION = [
    # Aluminum (40)
    ("N-AL-EXP-001", "1100-O", {"tensile": 90, "yield": 35, "hardness": 23, "kc1_1": 600}),
    ("N-AL-EXP-002", "1100-H14", {"tensile": 125, "yield": 115, "hardness": 32, "kc1_1": 650}),
    ("N-AL-EXP-003", "2011-T3", {"tensile": 380, "yield": 295, "hardness": 95, "kc1_1": 550}),
    ("N-AL-EXP-004", "2014-T6", {"tensile": 485, "yield": 415, "hardness": 135, "kc1_1": 750}),
    ("N-AL-EXP-005", "2017-T4", {"tensile": 425, "yield": 275, "hardness": 105, "kc1_1": 700}),
    ("N-AL-EXP-006", "2024-O", {"tensile": 185, "yield": 75, "hardness": 47, "kc1_1": 620}),
    ("N-AL-EXP-007", "2024-T3", {"tensile": 485, "yield": 345, "hardness": 120, "kc1_1": 750}),
    ("N-AL-EXP-008", "2024-T4", {"tensile": 470, "yield": 325, "hardness": 120, "kc1_1": 740}),
    ("N-AL-EXP-009", "2024-T351", {"tensile": 470, "yield": 325, "hardness": 120, "kc1_1": 740}),
    ("N-AL-EXP-010", "2219-T87", {"tensile": 475, "yield": 395, "hardness": 130, "kc1_1": 760}),
    ("N-AL-EXP-011", "3003-O", {"tensile": 110, "yield": 40, "hardness": 28, "kc1_1": 600}),
    ("N-AL-EXP-012", "3003-H14", {"tensile": 150, "yield": 145, "hardness": 40, "kc1_1": 640}),
    ("N-AL-EXP-013", "5052-O", {"tensile": 195, "yield": 90, "hardness": 47, "kc1_1": 650}),
    ("N-AL-EXP-014", "5052-H32", {"tensile": 230, "yield": 195, "hardness": 60, "kc1_1": 680}),
    ("N-AL-EXP-015", "5083-O", {"tensile": 290, "yield": 145, "hardness": 67, "kc1_1": 700}),
    ("N-AL-EXP-016", "5083-H116", {"tensile": 315, "yield": 230, "hardness": 75, "kc1_1": 720}),
    ("N-AL-EXP-017", "5086-O", {"tensile": 260, "yield": 115, "hardness": 60, "kc1_1": 680}),
    ("N-AL-EXP-018", "5086-H32", {"tensile": 290, "yield": 205, "hardness": 68, "kc1_1": 700}),
    ("N-AL-EXP-019", "5454-O", {"tensile": 250, "yield": 115, "hardness": 58, "kc1_1": 670}),
    ("N-AL-EXP-020", "5456-H116", {"tensile": 350, "yield": 255, "hardness": 90, "kc1_1": 740}),
    ("N-AL-EXP-021", "6061-O", {"tensile": 125, "yield": 55, "hardness": 30, "kc1_1": 620}),
    ("N-AL-EXP-022", "6061-T4", {"tensile": 240, "yield": 145, "hardness": 65, "kc1_1": 680}),
    ("N-AL-EXP-023", "6061-T6", {"tensile": 310, "yield": 275, "hardness": 95, "kc1_1": 720}),
    ("N-AL-EXP-024", "6061-T651", {"tensile": 310, "yield": 275, "hardness": 95, "kc1_1": 720}),
    ("N-AL-EXP-025", "6063-T5", {"tensile": 185, "yield": 145, "hardness": 60, "kc1_1": 660}),
    ("N-AL-EXP-026", "6063-T6", {"tensile": 240, "yield": 215, "hardness": 73, "kc1_1": 690}),
    ("N-AL-EXP-027", "6082-T6", {"tensile": 310, "yield": 260, "hardness": 90, "kc1_1": 720}),
    ("N-AL-EXP-028", "7050-T7451", {"tensile": 525, "yield": 470, "hardness": 142, "kc1_1": 800}),
    ("N-AL-EXP-029", "7075-O", {"tensile": 230, "yield": 105, "hardness": 60, "kc1_1": 680}),
    ("N-AL-EXP-030", "7075-T6", {"tensile": 570, "yield": 505, "hardness": 150, "kc1_1": 820}),
    ("N-AL-EXP-031", "7075-T651", {"tensile": 570, "yield": 505, "hardness": 150, "kc1_1": 820}),
    ("N-AL-EXP-032", "7075-T73", {"tensile": 500, "yield": 435, "hardness": 135, "kc1_1": 780}),
    ("N-AL-EXP-033", "7175-T7351", {"tensile": 525, "yield": 455, "hardness": 140, "kc1_1": 800}),
    ("N-AL-EXP-034", "7178-T6", {"tensile": 605, "yield": 540, "hardness": 160, "kc1_1": 840}),
    ("N-AL-EXP-035", "A356-T6 Cast", {"tensile": 260, "yield": 185, "hardness": 80, "kc1_1": 700}),
    ("N-AL-EXP-036", "A380 Die Cast", {"tensile": 320, "yield": 160, "hardness": 80, "kc1_1": 720}),
    ("N-AL-EXP-037", "Al-Li 2090-T83", {"tensile": 550, "yield": 520, "hardness": 145, "kc1_1": 780}),
    ("N-AL-EXP-038", "Al-Li 2195-T8", {"tensile": 590, "yield": 560, "hardness": 155, "kc1_1": 810}),
    ("N-AL-EXP-039", "MIC-6 Cast Plate", {"tensile": 170, "yield": 120, "hardness": 55, "kc1_1": 650}),
    ("N-AL-EXP-040", "ALCA5 Cast", {"tensile": 145, "yield": 70, "hardness": 45, "kc1_1": 620}),
    
    # Copper (30)
    ("N-CU-EXP-001", "C10100 OFHC", {"tensile": 220, "yield": 70, "hardness": 40, "kc1_1": 900}),
    ("N-CU-EXP-002", "C10200 OF", {"tensile": 220, "yield": 70, "hardness": 40, "kc1_1": 900}),
    ("N-CU-EXP-003", "C11000 ETP", {"tensile": 220, "yield": 70, "hardness": 40, "kc1_1": 900}),
    ("N-CU-EXP-004", "C11000 Half Hard", {"tensile": 290, "yield": 250, "hardness": 65, "kc1_1": 980}),
    ("N-CU-EXP-005", "C12200 DHP", {"tensile": 235, "yield": 80, "hardness": 45, "kc1_1": 920}),
    ("N-CU-EXP-006", "C14500 Te-Cu", {"tensile": 300, "yield": 250, "hardness": 65, "kc1_1": 850}),
    ("N-CU-EXP-007", "C17200 BeCu A", {"tensile": 1380, "yield": 1210, "hardness": 380, "kc1_1": 1400}),
    ("N-CU-EXP-008", "C17500 BeCo", {"tensile": 760, "yield": 620, "hardness": 235, "kc1_1": 1200}),
    ("N-CU-EXP-009", "C18200 CrCu", {"tensile": 450, "yield": 380, "hardness": 95, "kc1_1": 1050}),
    ("N-CU-EXP-010", "C18150 CrZrCu", {"tensile": 500, "yield": 420, "hardness": 105, "kc1_1": 1100}),
    ("N-CU-EXP-011", "C23000 Red Brass", {"tensile": 270, "yield": 70, "hardness": 55, "kc1_1": 950}),
    ("N-CU-EXP-012", "C26000 Cartridge", {"tensile": 340, "yield": 100, "hardness": 65, "kc1_1": 900}),
    ("N-CU-EXP-013", "C27000 Yellow Brass", {"tensile": 340, "yield": 105, "hardness": 65, "kc1_1": 880}),
    ("N-CU-EXP-014", "C28000 Muntz", {"tensile": 370, "yield": 145, "hardness": 75, "kc1_1": 920}),
    ("N-CU-EXP-015", "C36000 Free Cut", {"tensile": 340, "yield": 125, "hardness": 78, "kc1_1": 700}),
    ("N-CU-EXP-016", "C46400 Naval Brass", {"tensile": 380, "yield": 170, "hardness": 80, "kc1_1": 950}),
    ("N-CU-EXP-017", "C51000 Phos Bronze A", {"tensile": 340, "yield": 130, "hardness": 75, "kc1_1": 1000}),
    ("N-CU-EXP-018", "C52100 Phos Bronze C", {"tensile": 380, "yield": 160, "hardness": 85, "kc1_1": 1050}),
    ("N-CU-EXP-019", "C54400 Phos Bronze Pb", {"tensile": 305, "yield": 150, "hardness": 65, "kc1_1": 850}),
    ("N-CU-EXP-020", "C61400 Al Bronze D", {"tensile": 525, "yield": 230, "hardness": 135, "kc1_1": 1100}),
    ("N-CU-EXP-021", "C63000 Al Bronze", {"tensile": 620, "yield": 330, "hardness": 180, "kc1_1": 1200}),
    ("N-CU-EXP-022", "C65500 Hi-Si Bronze", {"tensile": 390, "yield": 170, "hardness": 95, "kc1_1": 1000}),
    ("N-CU-EXP-023", "C70600 Cu-Ni 10%", {"tensile": 340, "yield": 125, "hardness": 75, "kc1_1": 1050}),
    ("N-CU-EXP-024", "C71500 Cu-Ni 30%", {"tensile": 380, "yield": 170, "hardness": 85, "kc1_1": 1150}),
    ("N-CU-EXP-025", "C86300 Mn Bronze", {"tensile": 795, "yield": 450, "hardness": 180, "kc1_1": 1250}),
    ("N-CU-EXP-026", "C90300 Tin Bronze", {"tensile": 310, "yield": 150, "hardness": 75, "kc1_1": 950}),
    ("N-CU-EXP-027", "C93200 Bearing Bronze", {"tensile": 240, "yield": 125, "hardness": 65, "kc1_1": 850}),
    ("N-CU-EXP-028", "C95400 Al Bronze Cast", {"tensile": 585, "yield": 240, "hardness": 170, "kc1_1": 1150}),
    ("N-CU-EXP-029", "C95500 Ni-Al Bronze", {"tensile": 690, "yield": 310, "hardness": 195, "kc1_1": 1250}),
    ("N-CU-EXP-030", "C97600 Ni-Silv Cast", {"tensile": 350, "yield": 170, "hardness": 95, "kc1_1": 1100}),
    
    # Titanium & Other (32)
    ("N-TI-EXP-001", "CP Ti Grade 1", {"tensile": 240, "yield": 170, "hardness": 120, "kc1_1": 1350}),
    ("N-TI-EXP-002", "CP Ti Grade 2", {"tensile": 345, "yield": 275, "hardness": 160, "kc1_1": 1450}),
    ("N-TI-EXP-003", "CP Ti Grade 3", {"tensile": 450, "yield": 380, "hardness": 200, "kc1_1": 1550}),
    ("N-TI-EXP-004", "CP Ti Grade 4", {"tensile": 550, "yield": 480, "hardness": 250, "kc1_1": 1650}),
    ("N-TI-EXP-005", "Ti-6Al-4V Annealed", {"tensile": 895, "yield": 825, "hardness": 334, "kc1_1": 1800}),
    ("N-TI-EXP-006", "Ti-6Al-4V STA", {"tensile": 1100, "yield": 1000, "hardness": 380, "kc1_1": 2000}),
    ("N-TI-EXP-007", "Ti-6Al-4V ELI", {"tensile": 860, "yield": 795, "hardness": 320, "kc1_1": 1750}),
    ("N-TI-EXP-008", "Ti-6Al-2Sn-4Zr-2Mo", {"tensile": 1000, "yield": 930, "hardness": 350, "kc1_1": 1900}),
    ("N-TI-EXP-009", "Ti-5Al-2.5Sn", {"tensile": 795, "yield": 760, "hardness": 300, "kc1_1": 1700}),
    ("N-TI-EXP-010", "Ti-3Al-2.5V", {"tensile": 620, "yield": 520, "hardness": 270, "kc1_1": 1600}),
    ("N-TI-EXP-011", "Ti-6Al-6V-2Sn", {"tensile": 1100, "yield": 1000, "hardness": 380, "kc1_1": 2000}),
    ("N-TI-EXP-012", "Ti-10V-2Fe-3Al", {"tensile": 1170, "yield": 1100, "hardness": 400, "kc1_1": 2100}),
    ("N-TI-EXP-013", "Ti-15V-3Cr-3Al-3Sn", {"tensile": 1000, "yield": 960, "hardness": 360, "kc1_1": 1950}),
    ("N-TI-EXP-014", "Ti-15Mo-3Nb-3Al-0.2Si", {"tensile": 1030, "yield": 970, "hardness": 355, "kc1_1": 1920}),
    ("N-TI-EXP-015", "Beta-C Ti-3Al-8V-6Cr", {"tensile": 900, "yield": 830, "hardness": 320, "kc1_1": 1800}),
    ("N-TI-EXP-016", "Zirconium 702", {"tensile": 380, "yield": 205, "hardness": 160, "kc1_1": 1400}),
    ("N-TI-EXP-017", "Zirconium 705", {"tensile": 550, "yield": 380, "hardness": 210, "kc1_1": 1550}),
    ("N-TI-EXP-018", "Zircaloy-2", {"tensile": 480, "yield": 380, "hardness": 180, "kc1_1": 1500}),
    ("N-TI-EXP-019", "Zircaloy-4", {"tensile": 510, "yield": 400, "hardness": 190, "kc1_1": 1520}),
    ("N-TI-EXP-020", "Pure Zinc", {"tensile": 37, "yield": 30, "hardness": 30, "kc1_1": 400}),
    ("N-TI-EXP-021", "Zamak 3", {"tensile": 280, "yield": 220, "hardness": 82, "kc1_1": 550}),
    ("N-TI-EXP-022", "Zamak 5", {"tensile": 330, "yield": 260, "hardness": 91, "kc1_1": 580}),
    ("N-TI-EXP-023", "Pure Magnesium", {"tensile": 90, "yield": 21, "hardness": 30, "kc1_1": 450}),
    ("N-TI-EXP-024", "AZ31B-H24", {"tensile": 290, "yield": 220, "hardness": 73, "kc1_1": 550}),
    ("N-TI-EXP-025", "AZ61A-F", {"tensile": 310, "yield": 230, "hardness": 60, "kc1_1": 570}),
    ("N-TI-EXP-026", "AZ80A-T5", {"tensile": 380, "yield": 275, "hardness": 82, "kc1_1": 620}),
    ("N-TI-EXP-027", "AZ91D Die Cast", {"tensile": 230, "yield": 160, "hardness": 63, "kc1_1": 550}),
    ("N-TI-EXP-028", "ZK60A-T5", {"tensile": 365, "yield": 305, "hardness": 88, "kc1_1": 600}),
    ("N-TI-EXP-029", "AM60B Die Cast", {"tensile": 225, "yield": 130, "hardness": 62, "kc1_1": 530}),
    ("N-TI-EXP-030", "WE43-T6", {"tensile": 280, "yield": 195, "hardness": 85, "kc1_1": 620}),
    ("N-TI-EXP-031", "Elektron 21", {"tensile": 290, "yield": 200, "hardness": 90, "kc1_1": 630}),
    ("N-TI-EXP-032", "Pure Lead", {"tensile": 18, "yield": 7, "hardness": 5, "kc1_1": 200}),
]

# ============================================================================
# S_SUPERALLOYS EXPANSION (+32 materials)
# ============================================================================
S_SUPERALLOYS_EXPANSION = [
    ("S-SA-EXP-001", "Inconel 600", {"tensile": 655, "yield": 240, "hardness": 180, "kc1_1": 2600}),
    ("S-SA-EXP-002", "Inconel 601", {"tensile": 690, "yield": 310, "hardness": 200, "kc1_1": 2700}),
    ("S-SA-EXP-003", "Inconel 617", {"tensile": 740, "yield": 295, "hardness": 210, "kc1_1": 2800}),
    ("S-SA-EXP-004", "Inconel 625 Ann", {"tensile": 830, "yield": 415, "hardness": 230, "kc1_1": 2900}),
    ("S-SA-EXP-005", "Inconel 690", {"tensile": 690, "yield": 310, "hardness": 195, "kc1_1": 2650}),
    ("S-SA-EXP-006", "Inconel 718 Ann", {"tensile": 965, "yield": 550, "hardness": 260, "kc1_1": 3000}),
    ("S-SA-EXP-007", "Inconel 718 Aged", {"tensile": 1375, "yield": 1170, "hardness": 405, "kc1_1": 3400}),
    ("S-SA-EXP-008", "Inconel 725", {"tensile": 1035, "yield": 725, "hardness": 310, "kc1_1": 3100}),
    ("S-SA-EXP-009", "Inconel 751", {"tensile": 1170, "yield": 830, "hardness": 345, "kc1_1": 3200}),
    ("S-SA-EXP-010", "Inconel X-750", {"tensile": 1170, "yield": 830, "hardness": 345, "kc1_1": 3200}),
    ("S-SA-EXP-011", "Waspaloy", {"tensile": 1275, "yield": 795, "hardness": 370, "kc1_1": 3300}),
    ("S-SA-EXP-012", "Rene 41", {"tensile": 1380, "yield": 965, "hardness": 400, "kc1_1": 3450}),
    ("S-SA-EXP-013", "Rene 80", {"tensile": 1100, "yield": 900, "hardness": 350, "kc1_1": 3200}),
    ("S-SA-EXP-014", "Rene 95", {"tensile": 1550, "yield": 1170, "hardness": 440, "kc1_1": 3600}),
    ("S-SA-EXP-015", "Astroloy", {"tensile": 1380, "yield": 1035, "hardness": 400, "kc1_1": 3400}),
    ("S-SA-EXP-016", "Udimet 500", {"tensile": 1170, "yield": 795, "hardness": 350, "kc1_1": 3200}),
    ("S-SA-EXP-017", "Udimet 520", {"tensile": 1240, "yield": 860, "hardness": 365, "kc1_1": 3280}),
    ("S-SA-EXP-018", "Udimet 700", {"tensile": 1310, "yield": 930, "hardness": 385, "kc1_1": 3350}),
    ("S-SA-EXP-019", "Udimet 720", {"tensile": 1380, "yield": 1000, "hardness": 400, "kc1_1": 3400}),
    ("S-SA-EXP-020", "Haynes 188", {"tensile": 965, "yield": 450, "hardness": 290, "kc1_1": 3000}),
    ("S-SA-EXP-021", "Haynes 214", {"tensile": 895, "yield": 400, "hardness": 265, "kc1_1": 2900}),
    ("S-SA-EXP-022", "Haynes 230", {"tensile": 860, "yield": 380, "hardness": 255, "kc1_1": 2850}),
    ("S-SA-EXP-023", "Haynes 242", {"tensile": 1380, "yield": 900, "hardness": 400, "kc1_1": 3350}),
    ("S-SA-EXP-024", "Haynes 263", {"tensile": 1035, "yield": 620, "hardness": 310, "kc1_1": 3100}),
    ("S-SA-EXP-025", "Haynes 282", {"tensile": 1200, "yield": 830, "hardness": 360, "kc1_1": 3250}),
    ("S-SA-EXP-026", "Hastelloy B-3", {"tensile": 795, "yield": 380, "hardness": 235, "kc1_1": 2700}),
    ("S-SA-EXP-027", "Hastelloy C-22", {"tensile": 785, "yield": 360, "hardness": 230, "kc1_1": 2750}),
    ("S-SA-EXP-028", "Hastelloy C-276", {"tensile": 785, "yield": 355, "hardness": 225, "kc1_1": 2700}),
    ("S-SA-EXP-029", "Hastelloy G-30", {"tensile": 690, "yield": 310, "hardness": 200, "kc1_1": 2600}),
    ("S-SA-EXP-030", "Hastelloy X", {"tensile": 785, "yield": 355, "hardness": 225, "kc1_1": 2750}),
    ("S-SA-EXP-031", "MAR-M 247", {"tensile": 1000, "yield": 850, "hardness": 340, "kc1_1": 3200}),
    ("S-SA-EXP-032", "CMSX-4 Single Crystal", {"tensile": 1100, "yield": 950, "hardness": 360, "kc1_1": 3400}),
]

# ============================================================================
# H_HARDENED EXPANSION (+40 materials)
# ============================================================================
H_HARDENED_EXPANSION = [
    ("H-HARD-EXP-001", "A2 Tool 58 HRC", {"tensile": 2200, "hrc": 58, "kc1_1": 4200}),
    ("H-HARD-EXP-002", "A2 Tool 60 HRC", {"tensile": 2350, "hrc": 60, "kc1_1": 4400}),
    ("H-HARD-EXP-003", "D2 Tool 58 HRC", {"tensile": 2200, "hrc": 58, "kc1_1": 4300}),
    ("H-HARD-EXP-004", "D2 Tool 60 HRC", {"tensile": 2400, "hrc": 60, "kc1_1": 4500}),
    ("H-HARD-EXP-005", "D2 Tool 62 HRC", {"tensile": 2550, "hrc": 62, "kc1_1": 4700}),
    ("H-HARD-EXP-006", "O1 Tool 58 HRC", {"tensile": 2100, "hrc": 58, "kc1_1": 4100}),
    ("H-HARD-EXP-007", "O1 Tool 60 HRC", {"tensile": 2250, "hrc": 60, "kc1_1": 4300}),
    ("H-HARD-EXP-008", "M2 HSS 62 HRC", {"tensile": 2600, "hrc": 62, "kc1_1": 4800}),
    ("H-HARD-EXP-009", "M2 HSS 64 HRC", {"tensile": 2800, "hrc": 64, "kc1_1": 5000}),
    ("H-HARD-EXP-010", "M42 HSS 65 HRC", {"tensile": 2900, "hrc": 65, "kc1_1": 5200}),
    ("H-HARD-EXP-011", "M42 HSS 67 HRC", {"tensile": 3100, "hrc": 67, "kc1_1": 5500}),
    ("H-HARD-EXP-012", "T1 HSS 63 HRC", {"tensile": 2700, "hrc": 63, "kc1_1": 4900}),
    ("H-HARD-EXP-013", "T15 HSS 66 HRC", {"tensile": 3000, "hrc": 66, "kc1_1": 5400}),
    ("H-HARD-EXP-014", "H13 50 HRC", {"tensile": 1800, "hrc": 50, "kc1_1": 3600}),
    ("H-HARD-EXP-015", "H13 52 HRC", {"tensile": 1950, "hrc": 52, "kc1_1": 3800}),
    ("H-HARD-EXP-016", "H13 54 HRC", {"tensile": 2100, "hrc": 54, "kc1_1": 4000}),
    ("H-HARD-EXP-017", "S7 54 HRC", {"tensile": 2100, "hrc": 54, "kc1_1": 4000}),
    ("H-HARD-EXP-018", "S7 56 HRC", {"tensile": 2250, "hrc": 56, "kc1_1": 4200}),
    ("H-HARD-EXP-019", "P20 28 HRC", {"tensile": 1000, "hrc": 28, "kc1_1": 2400}),
    ("H-HARD-EXP-020", "P20 32 HRC", {"tensile": 1100, "hrc": 32, "kc1_1": 2600}),
    ("H-HARD-EXP-021", "P20+Ni 35 HRC", {"tensile": 1200, "hrc": 35, "kc1_1": 2800}),
    ("H-HARD-EXP-022", "420SS 50 HRC", {"tensile": 1800, "hrc": 50, "kc1_1": 3700}),
    ("H-HARD-EXP-023", "420SS 52 HRC", {"tensile": 1950, "hrc": 52, "kc1_1": 3900}),
    ("H-HARD-EXP-024", "440C 58 HRC", {"tensile": 2200, "hrc": 58, "kc1_1": 4400}),
    ("H-HARD-EXP-025", "440C 60 HRC", {"tensile": 2400, "hrc": 60, "kc1_1": 4600}),
    ("H-HARD-EXP-026", "4140 50 HRC", {"tensile": 1700, "hrc": 50, "kc1_1": 3500}),
    ("H-HARD-EXP-027", "4140 52 HRC", {"tensile": 1850, "hrc": 52, "kc1_1": 3700}),
    ("H-HARD-EXP-028", "4340 50 HRC", {"tensile": 1750, "hrc": 50, "kc1_1": 3550}),
    ("H-HARD-EXP-029", "4340 54 HRC", {"tensile": 2000, "hrc": 54, "kc1_1": 3900}),
    ("H-HARD-EXP-030", "4340 56 HRC", {"tensile": 2150, "hrc": 56, "kc1_1": 4100}),
    ("H-HARD-EXP-031", "52100 60 HRC", {"tensile": 2400, "hrc": 60, "kc1_1": 4500}),
    ("H-HARD-EXP-032", "52100 62 HRC", {"tensile": 2600, "hrc": 62, "kc1_1": 4700}),
    ("H-HARD-EXP-033", "CPM 10V 62 HRC", {"tensile": 2600, "hrc": 62, "kc1_1": 5000}),
    ("H-HARD-EXP-034", "CPM 10V 64 HRC", {"tensile": 2800, "hrc": 64, "kc1_1": 5300}),
    ("H-HARD-EXP-035", "CPM S90V 59 HRC", {"tensile": 2300, "hrc": 59, "kc1_1": 4800}),
    ("H-HARD-EXP-036", "CPM 3V 60 HRC", {"tensile": 2400, "hrc": 60, "kc1_1": 4600}),
    ("H-HARD-EXP-037", "Vanadis 4E 62 HRC", {"tensile": 2600, "hrc": 62, "kc1_1": 5100}),
    ("H-HARD-EXP-038", "Elmax 60 HRC", {"tensile": 2400, "hrc": 60, "kc1_1": 4700}),
    ("H-HARD-EXP-039", "Bohler K340 60 HRC", {"tensile": 2350, "hrc": 60, "kc1_1": 4600}),
    ("H-HARD-EXP-040", "Caldie 62 HRC", {"tensile": 2500, "hrc": 62, "kc1_1": 4850}),
]

# ============================================================================
# GENERATOR FUNCTIONS
# ============================================================================

def save_category(name, materials, folder, subcategory):
    """Save category to JSON"""
    output_dir = MATERIALS_DIR / folder if folder else MATERIALS_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{name}.json"
    with open(output_path, 'w') as f:
        json.dump({
            "category": folder.upper() if folder else subcategory,
            "subcategory": subcategory,
            "version": "1.0",
            "generated": datetime.now().isoformat(),
            "material_count": len(materials),
            "materials": materials
        }, f, indent=2)
    return len(materials), str(output_path)

def gen_rubber():
    mats = []
    for mat_id, name, props in RUBBER_MATERIALS:
        mat = create_base(mat_id, name, "RUBBER", "ELASTOMER", "X-RUBE")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["elongation"]["value"] = props["elongation"]
        mat["hardness_hb"]["value"] = props["hardness"]
        mat["density"]["value"] = props["density"]
        mat["max_service_temp"]["value"] = props["max_temp"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["chip_type"] = "CONTINUOUS"
        mat["recommended_coolant"] = "DRY"
        mat["rubber_specific"] = {"shore_a_hardness": props["hardness"], "compression_set": "LOW", "oil_resistance": "VARIES"}
        mats.append(mat)
    return save_category("rubber_elastomers", mats, "X_SPECIALTY", "RUBBER_ELASTOMERS")

def gen_p_steel_exp():
    mats = []
    for mat_id, name, props in P_STEELS_EXPANSION:
        mat = create_base(mat_id, name, "STEEL", "CARBON_ALLOY", "P1")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["yield_strength"]["value"] = props.get("yield", int(props["tensile"]*0.8))
        mat["hardness_hb"]["value"] = props["hardness"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["iso_p_class"] = "P1" if props["kc1_1"] < 1800 else "P2" if props["kc1_1"] < 2200 else "P3"
        mats.append(mat)
    return save_category("p_steels_expansion", mats, "P_STEELS", "CARBON_ALLOY_EXPANSION")

def gen_m_stainless_exp():
    mats = []
    for mat_id, name, props in M_STAINLESS_EXPANSION:
        mat = create_base(mat_id, name, "STAINLESS", "STAINLESS", "M1")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["yield_strength"]["value"] = props["yield"]
        mat["hardness_hb"]["value"] = props["hardness"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["iso_m_class"] = "M1" if "304" in name or "316" in name else "M2" if "410" in name or "420" in name else "M3"
        mats.append(mat)
    return save_category("m_stainless_expansion", mats, "M_STAINLESS", "STAINLESS_EXPANSION")

def gen_k_cast_exp():
    mats = []
    for mat_id, name, props in K_CAST_IRON_EXPANSION:
        mat = create_base(mat_id, name, "CAST_IRON", "CAST_IRON", "K1")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["hardness_hb"]["value"] = props["hardness"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["iso_k_class"] = "K1" if "Gray" in name else "K2" if "Ductile" in name else "K3"
        mats.append(mat)
    return save_category("k_cast_iron_expansion", mats, "K_CAST_IRON", "CAST_IRON_EXPANSION")

def gen_n_nonferrous_exp():
    mats = []
    for mat_id, name, props in N_NONFERROUS_EXPANSION:
        mat = create_base(mat_id, name, "NONFERROUS", "NONFERROUS", "N1")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["yield_strength"]["value"] = props["yield"]
        mat["hardness_hb"]["value"] = props["hardness"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["iso_n_class"] = "N1" if "-AL-" in mat_id else "N2" if "-CU-" in mat_id else "N3"
        mats.append(mat)
    return save_category("n_nonferrous_expansion", mats, "N_NONFERROUS", "NONFERROUS_EXPANSION")

def gen_s_superalloy_exp():
    mats = []
    for mat_id, name, props in S_SUPERALLOYS_EXPANSION:
        mat = create_base(mat_id, name, "SUPERALLOY", "SUPERALLOY", "S1")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["yield_strength"]["value"] = props["yield"]
        mat["hardness_hb"]["value"] = props["hardness"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["iso_s_class"] = "S1" if "Inconel" in name else "S2" if "Hastelloy" in name else "S3"
        mats.append(mat)
    return save_category("s_superalloys_expansion", mats, "S_SUPERALLOYS", "SUPERALLOY_EXPANSION")

def gen_h_hardened_exp():
    mats = []
    for mat_id, name, props in H_HARDENED_EXPANSION:
        mat = create_base(mat_id, name, "HARDENED", "HARDENED", "H1")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["hardness_hrc"]["value"] = props["hrc"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["iso_x_class"] = "H1" if props["hrc"] < 55 else "H2" if props["hrc"] < 60 else "H3"
        mat["recommended_tool_material"] = ["CBN", "Ceramic"]
        mats.append(mat)
    return save_category("h_hardened_expansion", mats, "H_HARDENED", "HARDENED_EXPANSION")

# ============================================================================
# MAIN PARALLEL EXECUTION
# ============================================================================

def main():
    print(f"\n{'='*70}")
    print("PRISM FINAL EXPANSION - 340 Materials (7 Categories in Parallel)")
    print(f"{'='*70}")
    print(f"Started: {datetime.now().isoformat()}")
    
    start = time.time()
    
    generators = [
        ("X-RUBE Rubber", gen_rubber),
        ("P_STEELS +51", gen_p_steel_exp),
        ("M_STAINLESS +59", gen_m_stainless_exp),
        ("K_CAST_IRON +26", gen_k_cast_exp),
        ("N_NONFERROUS +102", gen_n_nonferrous_exp),
        ("S_SUPERALLOYS +32", gen_s_superalloy_exp),
        ("H_HARDENED +40", gen_h_hardened_exp),
    ]
    
    results = {}
    
    with ThreadPoolExecutor(max_workers=7) as executor:
        futures = {executor.submit(gen_func): name for name, gen_func in generators}
        for future in as_completed(futures):
            name = futures[future]
            try:
                count, path = future.result()
                results[name] = {"count": count, "path": path, "status": "OK"}
                print(f"[OK] {name}: {count} materials")
            except Exception as e:
                results[name] = {"error": str(e), "status": "FAILED"}
                print(f"[FAIL] {name}: {e}")
    
    elapsed = time.time() - start
    total = sum(r.get("count", 0) for r in results.values())
    
    print(f"\n{'='*70}")
    print(f"COMPLETE: {total} materials in {elapsed:.2f} seconds")
    print(f"{'='*70}\n")
    
    return results

if __name__ == "__main__":
    main()
