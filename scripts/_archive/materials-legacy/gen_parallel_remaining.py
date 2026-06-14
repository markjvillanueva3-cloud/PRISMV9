"""
PRISM PARALLEL MATERIAL GENERATOR - All Remaining X_SPECIALTY Categories
Uses ThreadPoolExecutor for TRUE parallel generation
"""

import json
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

MATERIALS_DIR = Path(r"C:\PRISM\data\materials\X_SPECIALTY")
MATERIALS_DIR.mkdir(parents=True, exist_ok=True)

def create_base(mat_id, name, category, subcategory, iso_class):
    """Universal base material template - 127 parameters"""
    return {
        "id": mat_id, "name": name, "uns": "", "din": "", "jis": "", "iso": "",
        "aliases": [], "manufacturer_names": {},
        "description": f"{name} - {subcategory} material",
        "typical_applications": [], "similar_materials": [], "image_url": "",
        "category": category, "family": subcategory, "group": subcategory,
        "iso_p_class": None, "iso_m_class": None, "iso_k_class": None,
        "iso_n_class": None, "iso_s_class": None, "iso_x_class": iso_class,
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
        "created_by": "PRISM_PARALLEL_GENERATOR",
        "version": "1.0",
        "notes": "",
        "validation_status": "PENDING",
        "confidence_overall": 0.65
    }

# ============================================================================
# ADDITIVE MANUFACTURING (60 materials)
# ============================================================================
AM_MATERIALS = [
    # Metal AM (30)
    ("X-AM-001", "Ti-6Al-4V ELI SLM", {"tensile": 1100, "yield": 1000, "modulus": 114, "density": 4430, "Tm": 1660, "kc1_1": 1800, "tool": ["Carbide", "CBN"]}),
    ("X-AM-002", "Ti-6Al-4V Standard SLM", {"tensile": 1050, "yield": 950, "modulus": 114, "density": 4430, "Tm": 1660, "kc1_1": 1750, "tool": ["Carbide", "CBN"]}),
    ("X-AM-003", "CP Ti Grade 2 EBM", {"tensile": 450, "yield": 380, "modulus": 105, "density": 4510, "Tm": 1668, "kc1_1": 1400, "tool": ["Carbide"]}),
    ("X-AM-004", "Inconel 718 SLM", {"tensile": 1350, "yield": 1100, "modulus": 200, "density": 8190, "Tm": 1336, "kc1_1": 3200, "tool": ["Ceramic", "CBN"]}),
    ("X-AM-005", "Inconel 625 SLM", {"tensile": 900, "yield": 550, "modulus": 208, "density": 8440, "Tm": 1350, "kc1_1": 2800, "tool": ["Ceramic", "CBN"]}),
    ("X-AM-006", "CoCr Dental SLM", {"tensile": 1200, "yield": 900, "modulus": 210, "density": 8300, "Tm": 1400, "kc1_1": 2600, "tool": ["Carbide", "CBN"]}),
    ("X-AM-007", "CoCr Medical EBM", {"tensile": 1100, "yield": 850, "modulus": 210, "density": 8300, "Tm": 1400, "kc1_1": 2500, "tool": ["Carbide", "CBN"]}),
    ("X-AM-008", "Maraging Steel MS1", {"tensile": 2050, "yield": 1990, "modulus": 180, "density": 8100, "Tm": 1413, "kc1_1": 2200, "tool": ["Carbide", "CBN"]}),
    ("X-AM-009", "SS 316L SLM", {"tensile": 640, "yield": 530, "modulus": 193, "density": 7990, "Tm": 1400, "kc1_1": 2400, "tool": ["Carbide"]}),
    ("X-AM-010", "SS 17-4PH SLM", {"tensile": 1100, "yield": 1000, "modulus": 196, "density": 7780, "Tm": 1440, "kc1_1": 2300, "tool": ["Carbide"]}),
    ("X-AM-011", "SS 15-5PH SLM", {"tensile": 1070, "yield": 970, "modulus": 196, "density": 7800, "Tm": 1440, "kc1_1": 2250, "tool": ["Carbide"]}),
    ("X-AM-012", "Tool Steel H13 SLM", {"tensile": 1800, "yield": 1500, "modulus": 210, "density": 7800, "Tm": 1427, "kc1_1": 2600, "tool": ["CBN"]}),
    ("X-AM-013", "Tool Steel M2 SLM", {"tensile": 1900, "yield": 1600, "modulus": 210, "density": 8100, "Tm": 1430, "kc1_1": 2800, "tool": ["CBN"]}),
    ("X-AM-014", "AlSi10Mg SLM", {"tensile": 450, "yield": 270, "modulus": 70, "density": 2680, "Tm": 570, "kc1_1": 700, "tool": ["Carbide", "PCD"]}),
    ("X-AM-015", "AlSi12 SLM", {"tensile": 400, "yield": 250, "modulus": 70, "density": 2660, "Tm": 577, "kc1_1": 680, "tool": ["Carbide", "PCD"]}),
    ("X-AM-016", "Al6061-RAM2 SLM", {"tensile": 350, "yield": 280, "modulus": 69, "density": 2700, "Tm": 582, "kc1_1": 650, "tool": ["Carbide", "PCD"]}),
    ("X-AM-017", "Scalmalloy SLM", {"tensile": 520, "yield": 480, "modulus": 70, "density": 2670, "Tm": 590, "kc1_1": 750, "tool": ["Carbide", "PCD"]}),
    ("X-AM-018", "CuCrZr SLM", {"tensile": 350, "yield": 280, "modulus": 130, "density": 8900, "Tm": 1075, "kc1_1": 1100, "tool": ["Carbide"]}),
    ("X-AM-019", "Pure Cu SLM", {"tensile": 250, "yield": 100, "modulus": 117, "density": 8960, "Tm": 1085, "kc1_1": 900, "tool": ["Carbide"]}),
    ("X-AM-020", "Bronze CuSn10 SLM", {"tensile": 400, "yield": 250, "modulus": 110, "density": 8800, "Tm": 1000, "kc1_1": 1000, "tool": ["Carbide"]}),
    ("X-AM-021", "Pure W SLM", {"tensile": 500, "yield": 400, "modulus": 400, "density": 19250, "Tm": 3422, "kc1_1": 3500, "tool": ["Carbide", "CBN"]}),
    ("X-AM-022", "Pure Ta SLM", {"tensile": 300, "yield": 200, "modulus": 186, "density": 16600, "Tm": 3017, "kc1_1": 2000, "tool": ["Carbide"]}),
    ("X-AM-023", "NiTi SLM", {"tensile": 900, "yield": 500, "modulus": 75, "density": 6450, "Tm": 1310, "kc1_1": 1600, "tool": ["Carbide"]}),
    ("X-AM-024", "Hastelloy X SLM", {"tensile": 800, "yield": 450, "modulus": 205, "density": 8220, "Tm": 1355, "kc1_1": 2900, "tool": ["Ceramic", "CBN"]}),
    ("X-AM-025", "Haynes 230 SLM", {"tensile": 850, "yield": 400, "modulus": 211, "density": 8970, "Tm": 1375, "kc1_1": 3000, "tool": ["Ceramic", "CBN"]}),
    ("X-AM-026", "Rene 80 EBM", {"tensile": 1100, "yield": 900, "modulus": 210, "density": 8160, "Tm": 1340, "kc1_1": 3100, "tool": ["Ceramic", "CBN"]}),
    ("X-AM-027", "Pt AM Jewelry", {"tensile": 300, "yield": 150, "modulus": 168, "density": 21450, "Tm": 1768, "kc1_1": 1200, "tool": ["Carbide"]}),
    ("X-AM-028", "Au AM Jewelry", {"tensile": 200, "yield": 100, "modulus": 78, "density": 19300, "Tm": 1064, "kc1_1": 600, "tool": ["Carbide"]}),
    ("X-AM-029", "Ag AM Jewelry", {"tensile": 180, "yield": 80, "modulus": 83, "density": 10490, "Tm": 962, "kc1_1": 500, "tool": ["Carbide"]}),
    ("X-AM-030", "HEA CoCrFeNiMn SLM", {"tensile": 700, "yield": 500, "modulus": 200, "density": 8000, "Tm": 1350, "kc1_1": 2400, "tool": ["Carbide", "CBN"]}),
    
    # Polymer AM (20)
    ("X-AM-031", "PA12 SLS", {"tensile": 48, "yield": 40, "modulus": 1.7, "density": 1010, "Tm": 178, "kc1_1": 150, "tool": ["Carbide", "HSS"]}),
    ("X-AM-032", "PA11 SLS", {"tensile": 50, "yield": 42, "modulus": 1.6, "density": 1030, "Tm": 186, "kc1_1": 145, "tool": ["Carbide", "HSS"]}),
    ("X-AM-033", "PA12 GF SLS", {"tensile": 70, "yield": 60, "modulus": 4.0, "density": 1200, "Tm": 178, "kc1_1": 220, "tool": ["Carbide"]}),
    ("X-AM-034", "PA12 MJF", {"tensile": 48, "yield": 40, "modulus": 1.8, "density": 1010, "Tm": 178, "kc1_1": 155, "tool": ["Carbide", "HSS"]}),
    ("X-AM-035", "PA12 GF MJF", {"tensile": 65, "yield": 55, "modulus": 3.5, "density": 1150, "Tm": 178, "kc1_1": 210, "tool": ["Carbide"]}),
    ("X-AM-036", "TPU SLS", {"tensile": 35, "yield": 20, "modulus": 0.08, "density": 1150, "Tm": 180, "kc1_1": 60, "tool": ["Carbide"]}),
    ("X-AM-037", "PP SLS", {"tensile": 30, "yield": 25, "modulus": 1.2, "density": 900, "Tm": 165, "kc1_1": 100, "tool": ["Carbide", "HSS"]}),
    ("X-AM-038", "PEEK SLS", {"tensile": 90, "yield": 80, "modulus": 3.5, "density": 1300, "Tm": 343, "kc1_1": 180, "tool": ["Carbide"]}),
    ("X-AM-039", "PEKK SLS", {"tensile": 85, "yield": 75, "modulus": 3.2, "density": 1280, "Tm": 330, "kc1_1": 175, "tool": ["Carbide"]}),
    ("X-AM-040", "SLA Standard Resin", {"tensile": 65, "yield": 50, "modulus": 2.8, "density": 1200, "Tm": None, "kc1_1": 170, "tool": ["Carbide"]}),
    ("X-AM-041", "SLA Tough Resin", {"tensile": 55, "yield": 40, "modulus": 2.2, "density": 1150, "Tm": None, "kc1_1": 150, "tool": ["Carbide"]}),
    ("X-AM-042", "SLA Flexible Resin", {"tensile": 8, "yield": 5, "modulus": 0.01, "density": 1100, "Tm": None, "kc1_1": 30, "tool": ["Carbide"]}),
    ("X-AM-043", "SLA Dental Resin", {"tensile": 75, "yield": 60, "modulus": 3.0, "density": 1200, "Tm": None, "kc1_1": 180, "tool": ["Carbide"]}),
    ("X-AM-044", "SLA Castable Resin", {"tensile": 40, "yield": 30, "modulus": 1.5, "density": 1100, "Tm": None, "kc1_1": 120, "tool": ["Carbide"]}),
    ("X-AM-045", "SLA High Temp Resin", {"tensile": 70, "yield": 55, "modulus": 3.2, "density": 1250, "Tm": None, "kc1_1": 185, "tool": ["Carbide"]}),
    ("X-AM-046", "SLA Ceramic Resin", {"tensile": 50, "yield": 40, "modulus": 10, "density": 1500, "Tm": None, "kc1_1": 350, "tool": ["Diamond"]}),
    ("X-AM-047", "FDM ABS", {"tensile": 35, "yield": 30, "modulus": 2.0, "density": 1050, "Tm": None, "kc1_1": 130, "tool": ["Carbide", "HSS"]}),
    ("X-AM-048", "FDM PC", {"tensile": 60, "yield": 50, "modulus": 2.3, "density": 1200, "Tm": None, "kc1_1": 160, "tool": ["Carbide"]}),
    ("X-AM-049", "FDM ULTEM 9085", {"tensile": 70, "yield": 60, "modulus": 2.5, "density": 1340, "Tm": None, "kc1_1": 175, "tool": ["Carbide"]}),
    ("X-AM-050", "FDM CF Nylon", {"tensile": 80, "yield": 70, "modulus": 5.0, "density": 1200, "Tm": 220, "kc1_1": 250, "tool": ["Carbide"]}),
    
    # Ceramic AM (10)
    ("X-AM-051", "Alumina AM", {"tensile": 250, "yield": 200, "modulus": 350, "density": 3800, "Tm": 2050, "kc1_1": 5500, "tool": ["Diamond"]}),
    ("X-AM-052", "Zirconia AM", {"tensile": 800, "yield": 600, "modulus": 200, "density": 6000, "Tm": 2700, "kc1_1": 4500, "tool": ["Diamond"]}),
    ("X-AM-053", "SiC AM", {"tensile": 350, "yield": 300, "modulus": 400, "density": 3100, "Tm": 2730, "kc1_1": 7500, "tool": ["Diamond"]}),
    ("X-AM-054", "Si3N4 AM", {"tensile": 700, "yield": 550, "modulus": 300, "density": 3200, "Tm": 1900, "kc1_1": 5200, "tool": ["Diamond"]}),
    ("X-AM-055", "Hydroxyapatite AM", {"tensile": 50, "yield": 40, "modulus": 80, "density": 3100, "Tm": 1100, "kc1_1": 2000, "tool": ["Diamond"]}),
    ("X-AM-056", "Sand Casting Core", {"tensile": 5, "yield": 3, "modulus": 5, "density": 1500, "Tm": 1700, "kc1_1": 500, "tool": ["Carbide"]}),
    ("X-AM-057", "Investment Core", {"tensile": 10, "yield": 8, "modulus": 10, "density": 1800, "Tm": 1500, "kc1_1": 800, "tool": ["Carbide"]}),
    ("X-AM-058", "3D Printed Concrete", {"tensile": 5, "yield": 3, "modulus": 30, "density": 2300, "Tm": None, "kc1_1": 1500, "tool": ["Carbide"]}),
    ("X-AM-059", "Glass AM", {"tensile": 50, "yield": 40, "modulus": 70, "density": 2500, "Tm": 1500, "kc1_1": 2500, "tool": ["Diamond"]}),
    ("X-AM-060", "Multi-Material AM", {"tensile": 100, "yield": 80, "modulus": 50, "density": 2000, "Tm": None, "kc1_1": 1200, "tool": ["Carbide"]}),
]

# ============================================================================
# WOOD & NATURAL (60 materials)
# ============================================================================
WOOD_MATERIALS = [
    # Hardwoods (25)
    ("X-WOOD-001", "Red Oak", {"density": 705, "modulus": 12.5, "hardness": 1290, "tensile": 100}),
    ("X-WOOD-002", "White Oak", {"density": 755, "modulus": 12.3, "hardness": 1360, "tensile": 105}),
    ("X-WOOD-003", "Hard Maple", {"density": 705, "modulus": 12.6, "hardness": 1450, "tensile": 110}),
    ("X-WOOD-004", "Soft Maple", {"density": 545, "modulus": 10.0, "hardness": 950, "tensile": 85}),
    ("X-WOOD-005", "Black Walnut", {"density": 610, "modulus": 11.6, "hardness": 1010, "tensile": 100}),
    ("X-WOOD-006", "Cherry", {"density": 560, "modulus": 10.3, "hardness": 950, "tensile": 85}),
    ("X-WOOD-007", "White Ash", {"density": 670, "modulus": 12.0, "hardness": 1320, "tensile": 95}),
    ("X-WOOD-008", "Hickory", {"density": 815, "modulus": 14.9, "hardness": 1820, "tensile": 140}),
    ("X-WOOD-009", "American Beech", {"density": 720, "modulus": 11.9, "hardness": 1300, "tensile": 100}),
    ("X-WOOD-010", "Yellow Birch", {"density": 690, "modulus": 13.9, "hardness": 1260, "tensile": 115}),
    ("X-WOOD-011", "Yellow Poplar", {"density": 455, "modulus": 10.9, "hardness": 540, "tensile": 70}),
    ("X-WOOD-012", "Red Alder", {"density": 435, "modulus": 9.5, "hardness": 590, "tensile": 65}),
    ("X-WOOD-013", "Genuine Mahogany", {"density": 545, "modulus": 10.1, "hardness": 800, "tensile": 80}),
    ("X-WOOD-014", "Teak", {"density": 655, "modulus": 12.3, "hardness": 1070, "tensile": 95}),
    ("X-WOOD-015", "Ebony", {"density": 1050, "modulus": 16.9, "hardness": 3220, "tensile": 160}),
    ("X-WOOD-016", "Rosewood", {"density": 850, "modulus": 13.9, "hardness": 2440, "tensile": 125}),
    ("X-WOOD-017", "Padauk", {"density": 745, "modulus": 11.7, "hardness": 1725, "tensile": 100}),
    ("X-WOOD-018", "Purpleheart", {"density": 880, "modulus": 17.4, "hardness": 2520, "tensile": 135}),
    ("X-WOOD-019", "Ipe", {"density": 1070, "modulus": 21.6, "hardness": 3510, "tensile": 175}),
    ("X-WOOD-020", "Bubinga", {"density": 890, "modulus": 17.1, "hardness": 2410, "tensile": 130}),
    ("X-WOOD-021", "Wenge", {"density": 870, "modulus": 17.6, "hardness": 1930, "tensile": 125}),
    ("X-WOOD-022", "Zebrawood", {"density": 785, "modulus": 15.2, "hardness": 1575, "tensile": 115}),
    ("X-WOOD-023", "Sapele", {"density": 640, "modulus": 11.4, "hardness": 1410, "tensile": 95}),
    ("X-WOOD-024", "Balsa", {"density": 160, "modulus": 3.4, "hardness": 70, "tensile": 20}),
    ("X-WOOD-025", "Basswood", {"density": 415, "modulus": 10.1, "hardness": 410, "tensile": 60}),
    
    # Softwoods (15)
    ("X-WOOD-026", "Eastern White Pine", {"density": 385, "modulus": 8.5, "hardness": 380, "tensile": 60}),
    ("X-WOOD-027", "Ponderosa Pine", {"density": 455, "modulus": 8.9, "hardness": 460, "tensile": 65}),
    ("X-WOOD-028", "Southern Yellow Pine", {"density": 590, "modulus": 13.7, "hardness": 870, "tensile": 100}),
    ("X-WOOD-029", "Douglas Fir", {"density": 535, "modulus": 13.4, "hardness": 660, "tensile": 85}),
    ("X-WOOD-030", "Western Red Cedar", {"density": 370, "modulus": 7.7, "hardness": 350, "tensile": 45}),
    ("X-WOOD-031", "Alaska Yellow Cedar", {"density": 505, "modulus": 9.8, "hardness": 580, "tensile": 75}),
    ("X-WOOD-032", "Coast Redwood", {"density": 415, "modulus": 9.2, "hardness": 420, "tensile": 65}),
    ("X-WOOD-033", "Sitka Spruce", {"density": 430, "modulus": 10.8, "hardness": 510, "tensile": 70}),
    ("X-WOOD-034", "Norway Spruce", {"density": 430, "modulus": 11.0, "hardness": 510, "tensile": 70}),
    ("X-WOOD-035", "Eastern Hemlock", {"density": 450, "modulus": 8.5, "hardness": 500, "tensile": 60}),
    ("X-WOOD-036", "Bald Cypress", {"density": 510, "modulus": 9.9, "hardness": 510, "tensile": 65}),
    ("X-WOOD-037", "European Larch", {"density": 590, "modulus": 13.0, "hardness": 830, "tensile": 95}),
    ("X-WOOD-038", "Yew", {"density": 670, "modulus": 9.0, "hardness": 1520, "tensile": 80}),
    ("X-WOOD-039", "Juniper", {"density": 480, "modulus": 7.0, "hardness": 690, "tensile": 55}),
    ("X-WOOD-040", "Obeche", {"density": 385, "modulus": 5.9, "hardness": 320, "tensile": 45}),
    
    # Engineered Wood (20)
    ("X-WOOD-041", "MDF Standard", {"density": 750, "modulus": 3.5, "hardness": 200, "tensile": 25}),
    ("X-WOOD-042", "MDF Moisture Resist", {"density": 800, "modulus": 3.7, "hardness": 220, "tensile": 28}),
    ("X-WOOD-043", "MDF Ultralight", {"density": 550, "modulus": 2.5, "hardness": 150, "tensile": 18}),
    ("X-WOOD-044", "HDF", {"density": 900, "modulus": 4.5, "hardness": 280, "tensile": 35}),
    ("X-WOOD-045", "Particleboard", {"density": 650, "modulus": 2.5, "hardness": 120, "tensile": 15}),
    ("X-WOOD-046", "OSB", {"density": 640, "modulus": 5.5, "hardness": 150, "tensile": 25}),
    ("X-WOOD-047", "Baltic Birch Plywood", {"density": 680, "modulus": 12.5, "hardness": 350, "tensile": 80}),
    ("X-WOOD-048", "Marine Plywood", {"density": 600, "modulus": 10.5, "hardness": 300, "tensile": 70}),
    ("X-WOOD-049", "Hardwood Plywood", {"density": 550, "modulus": 9.5, "hardness": 280, "tensile": 60}),
    ("X-WOOD-050", "Softwood Plywood", {"density": 500, "modulus": 8.5, "hardness": 200, "tensile": 50}),
    ("X-WOOD-051", "LVL", {"density": 580, "modulus": 13.2, "hardness": 450, "tensile": 95}),
    ("X-WOOD-052", "LSL", {"density": 650, "modulus": 10.5, "hardness": 400, "tensile": 80}),
    ("X-WOOD-053", "PSL", {"density": 650, "modulus": 16.0, "hardness": 500, "tensile": 110}),
    ("X-WOOD-054", "CLT", {"density": 500, "modulus": 11.0, "hardness": 350, "tensile": 75}),
    ("X-WOOD-055", "Glulam", {"density": 500, "modulus": 12.4, "hardness": 400, "tensile": 85}),
    ("X-WOOD-056", "Bamboo Solid", {"density": 700, "modulus": 20.0, "hardness": 1380, "tensile": 120}),
    ("X-WOOD-057", "Bamboo Strand", {"density": 1100, "modulus": 25.0, "hardness": 2350, "tensile": 180}),
    ("X-WOOD-058", "Cork", {"density": 200, "modulus": 0.03, "hardness": 20, "tensile": 2}),
    ("X-WOOD-059", "Richlite", {"density": 1400, "modulus": 15.0, "hardness": 500, "tensile": 90}),
    ("X-WOOD-060", "Paperstone", {"density": 1350, "modulus": 14.0, "hardness": 450, "tensile": 85}),
]

# ============================================================================
# SPECIALTY ALLOYS (50 materials)
# ============================================================================
SPECIALTY_ALLOYS = [
    # Beryllium (8)
    ("X-SPEC-001", "Pure Be S-200F", {"tensile": 370, "yield": 250, "modulus": 303, "density": 1850, "Tm": 1287, "kc1_1": 800, "toxic": True}),
    ("X-SPEC-002", "Pure Be O-50", {"tensile": 320, "yield": 220, "modulus": 303, "density": 1850, "Tm": 1287, "kc1_1": 750, "toxic": True}),
    ("X-SPEC-003", "AlBeMet AM162", {"tensile": 330, "yield": 280, "modulus": 193, "density": 2100, "Tm": 1000, "kc1_1": 600, "toxic": True}),
    ("X-SPEC-004", "BeCu C17200", {"tensile": 1380, "yield": 1210, "modulus": 131, "density": 8250, "Tm": 1000, "kc1_1": 1400, "toxic": False}),
    ("X-SPEC-005", "BeCu C17500", {"tensile": 760, "yield": 620, "modulus": 140, "density": 8750, "Tm": 1050, "kc1_1": 1200, "toxic": False}),
    ("X-SPEC-006", "BeCu C17510", {"tensile": 690, "yield": 550, "modulus": 140, "density": 8800, "Tm": 1070, "kc1_1": 1150, "toxic": False}),
    ("X-SPEC-007", "BeNi 360", {"tensile": 550, "yield": 380, "modulus": 200, "density": 8000, "Tm": 1200, "kc1_1": 1300, "toxic": True}),
    ("X-SPEC-008", "Be-38Al", {"tensile": 300, "yield": 250, "modulus": 180, "density": 2200, "Tm": 950, "kc1_1": 550, "toxic": True}),
    
    # Low Expansion (10)
    ("X-SPEC-009", "Invar 36", {"tensile": 480, "yield": 280, "modulus": 141, "density": 8050, "Tm": 1427, "kc1_1": 1800, "cte": 1.2}),
    ("X-SPEC-010", "Super Invar", {"tensile": 520, "yield": 300, "modulus": 145, "density": 8100, "Tm": 1420, "kc1_1": 1850, "cte": 0.3}),
    ("X-SPEC-011", "Kovar F-15", {"tensile": 520, "yield": 350, "modulus": 131, "density": 8360, "Tm": 1450, "kc1_1": 1700, "cte": 5.5}),
    ("X-SPEC-012", "Alloy 42", {"tensile": 500, "yield": 300, "modulus": 148, "density": 8120, "Tm": 1425, "kc1_1": 1750, "cte": 4.3}),
    ("X-SPEC-013", "Alloy 48", {"tensile": 490, "yield": 290, "modulus": 148, "density": 8190, "Tm": 1450, "kc1_1": 1750, "cte": 8.5}),
    ("X-SPEC-014", "Alloy 52", {"tensile": 480, "yield": 280, "modulus": 155, "density": 8280, "Tm": 1450, "kc1_1": 1720, "cte": 10.3}),
    ("X-SPEC-015", "Rodar", {"tensile": 550, "yield": 380, "modulus": 130, "density": 8360, "Tm": 1450, "kc1_1": 1700, "cte": 5.0}),
    ("X-SPEC-016", "Nilo K", {"tensile": 500, "yield": 320, "modulus": 141, "density": 8050, "Tm": 1430, "kc1_1": 1780, "cte": 5.3}),
    ("X-SPEC-017", "Dilver P", {"tensile": 460, "yield": 260, "modulus": 140, "density": 8000, "Tm": 1425, "kc1_1": 1760, "cte": 4.5}),
    ("X-SPEC-018", "Inovar", {"tensile": 480, "yield": 280, "modulus": 142, "density": 8050, "Tm": 1427, "kc1_1": 1780, "cte": 1.0}),
    
    # Magnetic (12)
    ("X-SPEC-019", "Mu-Metal", {"tensile": 580, "yield": 240, "modulus": 186, "density": 8700, "Tm": 1450, "kc1_1": 1900, "perm": 100000}),
    ("X-SPEC-020", "Permalloy 80", {"tensile": 550, "yield": 230, "modulus": 180, "density": 8600, "Tm": 1440, "kc1_1": 1850, "perm": 80000}),
    ("X-SPEC-021", "Supermalloy", {"tensile": 600, "yield": 250, "modulus": 190, "density": 8800, "Tm": 1460, "kc1_1": 1950, "perm": 1000000}),
    ("X-SPEC-022", "HyMu 80", {"tensile": 560, "yield": 235, "modulus": 185, "density": 8700, "Tm": 1450, "kc1_1": 1880, "perm": 80000}),
    ("X-SPEC-023", "Hipernom", {"tensile": 620, "yield": 280, "modulus": 200, "density": 8200, "Tm": 1400, "kc1_1": 1920, "perm": 200000}),
    ("X-SPEC-024", "Permendur", {"tensile": 700, "yield": 350, "modulus": 207, "density": 8120, "Tm": 1430, "kc1_1": 2100, "perm": 5000}),
    ("X-SPEC-025", "Supermendur", {"tensile": 750, "yield": 380, "modulus": 210, "density": 8150, "Tm": 1440, "kc1_1": 2150, "perm": 10000}),
    ("X-SPEC-026", "Hiperco 50", {"tensile": 700, "yield": 340, "modulus": 207, "density": 8120, "Tm": 1430, "kc1_1": 2080, "perm": 6000}),
    ("X-SPEC-027", "Silicon Iron GO", {"tensile": 450, "yield": 300, "modulus": 185, "density": 7650, "Tm": 1500, "kc1_1": 2200, "perm": 40000}),
    ("X-SPEC-028", "Silicon Iron NGO", {"tensile": 480, "yield": 320, "modulus": 190, "density": 7700, "Tm": 1500, "kc1_1": 2250, "perm": 5000}),
    ("X-SPEC-029", "Alnico 5", {"tensile": 50, "yield": 30, "modulus": 150, "density": 7300, "Tm": 1300, "kc1_1": 3000, "perm": 3}),
    ("X-SPEC-030", "Alnico 8", {"tensile": 40, "yield": 25, "modulus": 150, "density": 7300, "Tm": 1300, "kc1_1": 3200, "perm": 2}),
    
    # Shape Memory & Advanced (10)
    ("X-SPEC-031", "Nitinol SE508", {"tensile": 1100, "yield": 500, "modulus": 75, "density": 6450, "Tm": 1310, "kc1_1": 1600}),
    ("X-SPEC-032", "Nitinol SM495", {"tensile": 1000, "yield": 450, "modulus": 70, "density": 6450, "Tm": 1310, "kc1_1": 1550}),
    ("X-SPEC-033", "Nitinol Medical", {"tensile": 1050, "yield": 480, "modulus": 72, "density": 6450, "Tm": 1310, "kc1_1": 1580}),
    ("X-SPEC-034", "Cu-Al-Ni SMA", {"tensile": 600, "yield": 300, "modulus": 80, "density": 7100, "Tm": 1050, "kc1_1": 1200}),
    ("X-SPEC-035", "Cu-Zn-Al SMA", {"tensile": 500, "yield": 250, "modulus": 75, "density": 7800, "Tm": 950, "kc1_1": 1100}),
    ("X-SPEC-036", "Vitreloy 1 BMG", {"tensile": 1900, "yield": 1800, "modulus": 96, "density": 6100, "Tm": 993, "kc1_1": 2400}),
    ("X-SPEC-037", "Liquidmetal", {"tensile": 1850, "yield": 1750, "modulus": 95, "density": 6200, "Tm": 985, "kc1_1": 2350}),
    ("X-SPEC-038", "HEA CoCrFeNiMn", {"tensile": 700, "yield": 450, "modulus": 200, "density": 8000, "Tm": 1350, "kc1_1": 2200}),
    ("X-SPEC-039", "HEA AlCoCrFeNi", {"tensile": 1200, "yield": 900, "modulus": 180, "density": 7200, "Tm": 1400, "kc1_1": 2500}),
    ("X-SPEC-040", "Fe-based BMG", {"tensile": 3000, "yield": 2800, "modulus": 180, "density": 7200, "Tm": 1100, "kc1_1": 2800}),
    
    # Electrical/Thermal (10)
    ("X-SPEC-041", "OFHC Copper C10100", {"tensile": 220, "yield": 70, "modulus": 117, "density": 8960, "Tm": 1085, "kc1_1": 900}),
    ("X-SPEC-042", "ETP Copper C11000", {"tensile": 230, "yield": 75, "modulus": 117, "density": 8940, "Tm": 1083, "kc1_1": 920}),
    ("X-SPEC-043", "DHP Copper C12200", {"tensile": 235, "yield": 80, "modulus": 117, "density": 8940, "Tm": 1083, "kc1_1": 930}),
    ("X-SPEC-044", "Pure Silver 999", {"tensile": 170, "yield": 55, "modulus": 83, "density": 10490, "Tm": 962, "kc1_1": 500}),
    ("X-SPEC-045", "AgCu Eutectic", {"tensile": 250, "yield": 150, "modulus": 100, "density": 10000, "Tm": 780, "kc1_1": 700}),
    ("X-SPEC-046", "AgCdO Contact", {"tensile": 280, "yield": 180, "modulus": 95, "density": 10200, "Tm": 900, "kc1_1": 800}),
    ("X-SPEC-047", "W-Cu 80/20", {"tensile": 500, "yield": 400, "modulus": 280, "density": 15700, "Tm": 1083, "kc1_1": 2000}),
    ("X-SPEC-048", "W-Cu 70/30", {"tensile": 450, "yield": 350, "modulus": 250, "density": 14500, "Tm": 1083, "kc1_1": 1800}),
    ("X-SPEC-049", "Mo-Cu 70/30", {"tensile": 380, "yield": 280, "modulus": 220, "density": 9800, "Tm": 1083, "kc1_1": 1600}),
    ("X-SPEC-050", "Cu-Diamond", {"tensile": 350, "yield": 250, "modulus": 400, "density": 5800, "Tm": 1083, "kc1_1": 2500}),
]

# ============================================================================
# PRECIOUS METALS (25 materials)
# ============================================================================
PRECIOUS_METALS = [
    # Gold (8)
    ("X-PREC-001", "24K Gold", {"tensile": 130, "yield": 30, "modulus": 78, "density": 19300, "Tm": 1064, "kc1_1": 400}),
    ("X-PREC-002", "22K Gold", {"tensile": 180, "yield": 80, "modulus": 85, "density": 17800, "Tm": 1020, "kc1_1": 500}),
    ("X-PREC-003", "18K Gold", {"tensile": 350, "yield": 200, "modulus": 95, "density": 15600, "Tm": 950, "kc1_1": 700}),
    ("X-PREC-004", "14K Gold", {"tensile": 450, "yield": 280, "modulus": 105, "density": 13100, "Tm": 880, "kc1_1": 900}),
    ("X-PREC-005", "10K Gold", {"tensile": 500, "yield": 320, "modulus": 110, "density": 11500, "Tm": 830, "kc1_1": 1000}),
    ("X-PREC-006", "White Gold 18K", {"tensile": 450, "yield": 300, "modulus": 110, "density": 15200, "Tm": 1100, "kc1_1": 850}),
    ("X-PREC-007", "Au-Ni Contact", {"tensile": 300, "yield": 180, "modulus": 90, "density": 16000, "Tm": 980, "kc1_1": 650}),
    ("X-PREC-008", "Dental Gold Alloy", {"tensile": 450, "yield": 350, "modulus": 100, "density": 16500, "Tm": 900, "kc1_1": 800}),
    
    # Silver (6)
    ("X-PREC-009", "Pure Silver 999", {"tensile": 170, "yield": 55, "modulus": 83, "density": 10490, "Tm": 962, "kc1_1": 500}),
    ("X-PREC-010", "Sterling Silver 925", {"tensile": 290, "yield": 180, "modulus": 80, "density": 10400, "Tm": 893, "kc1_1": 700}),
    ("X-PREC-011", "Argentium Silver", {"tensile": 330, "yield": 220, "modulus": 82, "density": 10350, "Tm": 900, "kc1_1": 750}),
    ("X-PREC-012", "Coin Silver 900", {"tensile": 280, "yield": 170, "modulus": 81, "density": 10420, "Tm": 895, "kc1_1": 680}),
    ("X-PREC-013", "Ag-Cu Brazing", {"tensile": 350, "yield": 200, "modulus": 90, "density": 10200, "Tm": 780, "kc1_1": 750}),
    ("X-PREC-014", "Ag-Pd Alloy", {"tensile": 450, "yield": 300, "modulus": 110, "density": 11000, "Tm": 1100, "kc1_1": 900}),
    
    # Platinum Group (11)
    ("X-PREC-015", "Pure Platinum", {"tensile": 165, "yield": 50, "modulus": 168, "density": 21450, "Tm": 1768, "kc1_1": 1200}),
    ("X-PREC-016", "Pt-10Ir", {"tensile": 400, "yield": 250, "modulus": 185, "density": 21550, "Tm": 1780, "kc1_1": 1500}),
    ("X-PREC-017", "Pt-10Rh", {"tensile": 350, "yield": 200, "modulus": 175, "density": 20000, "Tm": 1820, "kc1_1": 1400}),
    ("X-PREC-018", "Pt-30Rh", {"tensile": 500, "yield": 350, "modulus": 190, "density": 18500, "Tm": 1900, "kc1_1": 1600}),
    ("X-PREC-019", "Pure Palladium", {"tensile": 200, "yield": 60, "modulus": 121, "density": 12020, "Tm": 1555, "kc1_1": 900}),
    ("X-PREC-020", "Pd White Gold", {"tensile": 400, "yield": 280, "modulus": 125, "density": 14500, "Tm": 1200, "kc1_1": 850}),
    ("X-PREC-021", "Pure Rhodium", {"tensile": 950, "yield": 700, "modulus": 379, "density": 12410, "Tm": 1964, "kc1_1": 2500}),
    ("X-PREC-022", "Pure Iridium", {"tensile": 2000, "yield": 1600, "modulus": 528, "density": 22560, "Tm": 2446, "kc1_1": 3500}),
    ("X-PREC-023", "Pt-Ir 10%", {"tensile": 450, "yield": 300, "modulus": 200, "density": 21600, "Tm": 1790, "kc1_1": 1550}),
    ("X-PREC-024", "Pure Ruthenium", {"tensile": 600, "yield": 400, "modulus": 432, "density": 12370, "Tm": 2334, "kc1_1": 2800}),
    ("X-PREC-025", "Pure Osmium", {"tensile": 1000, "yield": 800, "modulus": 562, "density": 22590, "Tm": 3033, "kc1_1": 4000}),
]

# ============================================================================
# GRAPHITE & CARBON (30 materials)
# ============================================================================
GRAPHITE_MATERIALS = [
    ("X-GRAP-001", "Isomolded Fine", {"tensile": 45, "modulus": 11, "density": 1850, "k": 120, "kc1_1": 300}),
    ("X-GRAP-002", "Isomolded Medium", {"tensile": 35, "modulus": 9, "density": 1780, "k": 100, "kc1_1": 250}),
    ("X-GRAP-003", "Isomolded Coarse", {"tensile": 25, "modulus": 7, "density": 1700, "k": 80, "kc1_1": 200}),
    ("X-GRAP-004", "Extruded Standard", {"tensile": 20, "modulus": 6, "density": 1650, "k": 150, "kc1_1": 180}),
    ("X-GRAP-005", "Vibration Molded", {"tensile": 15, "modulus": 5, "density": 1600, "k": 120, "kc1_1": 150}),
    ("X-GRAP-006", "Premium EDM TTK-4", {"tensile": 50, "modulus": 12, "density": 1900, "k": 70, "kc1_1": 350}),
    ("X-GRAP-007", "Premium EDM TTK-50", {"tensile": 48, "modulus": 11, "density": 1880, "k": 75, "kc1_1": 340}),
    ("X-GRAP-008", "Premium EDM AF-5", {"tensile": 55, "modulus": 13, "density": 1920, "k": 65, "kc1_1": 380}),
    ("X-GRAP-009", "Nuclear Grade", {"tensile": 30, "modulus": 8, "density": 1750, "k": 100, "kc1_1": 220}),
    ("X-GRAP-010", "Electrode Grade", {"tensile": 18, "modulus": 5, "density": 1600, "k": 200, "kc1_1": 160}),
    ("X-GRAP-011", "Isostatic Pressed", {"tensile": 60, "modulus": 14, "density": 1950, "k": 60, "kc1_1": 400}),
    ("X-GRAP-012", "Flexible Grafoil", {"tensile": 5, "modulus": 1, "density": 1100, "k": 150, "kc1_1": 50}),
    ("X-GRAP-013", "Expanded Graphite", {"tensile": 3, "modulus": 0.5, "density": 80, "k": 5, "kc1_1": 20}),
    ("X-GRAP-014", "Pyrolytic Graphite", {"tensile": 70, "modulus": 30, "density": 2200, "k": 400, "kc1_1": 500}),
    ("X-GRAP-015", "HOPG", {"tensile": 60, "modulus": 35, "density": 2260, "k": 2000, "kc1_1": 450}),
    ("X-GRAP-016", "Glassy Carbon", {"tensile": 200, "modulus": 35, "density": 1500, "k": 6, "kc1_1": 600}),
    ("X-GRAP-017", "RVC Foam", {"tensile": 5, "modulus": 0.3, "density": 50, "k": 0.1, "kc1_1": 30}),
    ("X-GRAP-018", "Carbon Fiber Tow", {"tensile": 5000, "modulus": 300, "density": 1800, "k": 10, "kc1_1": 100}),
    ("X-GRAP-019", "Graphite Foil", {"tensile": 10, "modulus": 2, "density": 1000, "k": 140, "kc1_1": 80}),
    ("X-GRAP-020", "Graphite Felt", {"tensile": 2, "modulus": 0.2, "density": 100, "k": 0.5, "kc1_1": 25}),
    ("X-GRAP-021", "Graphite Crucible", {"tensile": 25, "modulus": 8, "density": 1750, "k": 90, "kc1_1": 200}),
    ("X-GRAP-022", "Graphite Mold", {"tensile": 40, "modulus": 10, "density": 1850, "k": 100, "kc1_1": 280}),
    ("X-GRAP-023", "Graphite Bearing", {"tensile": 35, "modulus": 9, "density": 1800, "k": 80, "kc1_1": 250}),
    ("X-GRAP-024", "Graphite Seal", {"tensile": 20, "modulus": 6, "density": 1700, "k": 70, "kc1_1": 180}),
    ("X-GRAP-025", "Carbon Brush", {"tensile": 30, "modulus": 10, "density": 1650, "k": 30, "kc1_1": 350}),
    ("X-GRAP-026", "EDM Electrode Fine", {"tensile": 52, "modulus": 12, "density": 1900, "k": 70, "kc1_1": 360}),
    ("X-GRAP-027", "Die Graphite", {"tensile": 45, "modulus": 11, "density": 1850, "k": 100, "kc1_1": 300}),
    ("X-GRAP-028", "Fixture Graphite", {"tensile": 38, "modulus": 9, "density": 1800, "k": 90, "kc1_1": 260}),
    ("X-GRAP-029", "Carbon-Carbon 2D", {"tensile": 150, "modulus": 50, "density": 1700, "k": 40, "kc1_1": 800}),
    ("X-GRAP-030", "Carbon-Carbon 3D", {"tensile": 100, "modulus": 30, "density": 1800, "k": 60, "kc1_1": 700}),
]

# ============================================================================
# POWDER METALLURGY (40 materials)
# ============================================================================
PM_MATERIALS = [
    ("X-PM-001", "Sintered Iron F-0000", {"tensile": 170, "yield": 120, "modulus": 100, "density": 6000, "kc1_1": 1200}),
    ("X-PM-002", "Sintered Iron F-0005", {"tensile": 240, "yield": 180, "modulus": 120, "density": 6200, "kc1_1": 1400}),
    ("X-PM-003", "Sintered Iron F-0008", {"tensile": 310, "yield": 240, "modulus": 140, "density": 6400, "kc1_1": 1600}),
    ("X-PM-004", "Sintered Steel FC-0205", {"tensile": 380, "yield": 300, "modulus": 150, "density": 6600, "kc1_1": 1700}),
    ("X-PM-005", "Sintered Steel FC-0208", {"tensile": 450, "yield": 360, "modulus": 160, "density": 6800, "kc1_1": 1850}),
    ("X-PM-006", "Sintered Steel FN-0205", {"tensile": 400, "yield": 320, "modulus": 155, "density": 6700, "kc1_1": 1750}),
    ("X-PM-007", "Sintered Steel FN-0405", {"tensile": 500, "yield": 400, "modulus": 170, "density": 7000, "kc1_1": 1900}),
    ("X-PM-008", "Bronze Bearing SAE 841", {"tensile": 170, "yield": 100, "modulus": 70, "density": 6600, "kc1_1": 800}),
    ("X-PM-009", "Bronze Bearing SAE 863", {"tensile": 200, "yield": 130, "modulus": 80, "density": 7200, "kc1_1": 900}),
    ("X-PM-010", "Iron-Bronze Bearing", {"tensile": 250, "yield": 180, "modulus": 100, "density": 6400, "kc1_1": 1000}),
    ("X-PM-011", "PM SS 316L", {"tensile": 450, "yield": 350, "modulus": 160, "density": 7400, "kc1_1": 2200}),
    ("X-PM-012", "PM SS 304L", {"tensile": 420, "yield": 320, "modulus": 155, "density": 7300, "kc1_1": 2100}),
    ("X-PM-013", "PM SS 17-4PH", {"tensile": 900, "yield": 750, "modulus": 180, "density": 7500, "kc1_1": 2400}),
    ("X-PM-014", "PM SS 410", {"tensile": 550, "yield": 420, "modulus": 170, "density": 7500, "kc1_1": 2000}),
    ("X-PM-015", "MIM 316L", {"tensile": 520, "yield": 400, "modulus": 180, "density": 7800, "kc1_1": 2300}),
    ("X-PM-016", "MIM 17-4PH", {"tensile": 1100, "yield": 950, "modulus": 195, "density": 7700, "kc1_1": 2500}),
    ("X-PM-017", "MIM 4140", {"tensile": 800, "yield": 650, "modulus": 200, "density": 7600, "kc1_1": 2200}),
    ("X-PM-018", "MIM Ti-6Al-4V", {"tensile": 950, "yield": 850, "modulus": 110, "density": 4400, "kc1_1": 1800}),
    ("X-PM-019", "MIM Kovar", {"tensile": 480, "yield": 350, "modulus": 130, "density": 8300, "kc1_1": 1700}),
    ("X-PM-020", "MIM Tungsten", {"tensile": 600, "yield": 450, "modulus": 350, "density": 17500, "kc1_1": 3000}),
    ("X-PM-021", "WC-6Co Fine", {"tensile": 1500, "yield": 1400, "modulus": 630, "density": 14900, "kc1_1": 5000}),
    ("X-PM-022", "WC-6Co Medium", {"tensile": 1600, "yield": 1500, "modulus": 620, "density": 14850, "kc1_1": 4800}),
    ("X-PM-023", "WC-10Co", {"tensile": 1800, "yield": 1700, "modulus": 580, "density": 14500, "kc1_1": 4500}),
    ("X-PM-024", "WC-15Co", {"tensile": 2000, "yield": 1900, "modulus": 540, "density": 14000, "kc1_1": 4200}),
    ("X-PM-025", "WC-TiC-Co", {"tensile": 1400, "yield": 1300, "modulus": 550, "density": 12500, "kc1_1": 4600}),
    ("X-PM-026", "WC-TaC-Co", {"tensile": 1500, "yield": 1400, "modulus": 560, "density": 14200, "kc1_1": 4700}),
    ("X-PM-027", "Cermet TiCN", {"tensile": 1200, "yield": 1100, "modulus": 450, "density": 6500, "kc1_1": 4000}),
    ("X-PM-028", "Cermet TiC-Ni", {"tensile": 1100, "yield": 1000, "modulus": 420, "density": 6200, "kc1_1": 3800}),
    ("X-PM-029", "PM Aluminum 201AB", {"tensile": 280, "yield": 240, "modulus": 70, "density": 2650, "kc1_1": 700}),
    ("X-PM-030", "PM Aluminum 601AB", {"tensile": 350, "yield": 300, "modulus": 72, "density": 2680, "kc1_1": 750}),
    ("X-PM-031", "PM Copper FC-0205", {"tensile": 300, "yield": 220, "modulus": 110, "density": 7800, "kc1_1": 950}),
    ("X-PM-032", "PM Bronze CZ-0000", {"tensile": 200, "yield": 150, "modulus": 85, "density": 7400, "kc1_1": 850}),
    ("X-PM-033", "HIP Steel 4340", {"tensile": 1200, "yield": 1050, "modulus": 205, "density": 7850, "kc1_1": 2100}),
    ("X-PM-034", "HIP Tool Steel M2", {"tensile": 1400, "yield": 1200, "modulus": 210, "density": 8100, "kc1_1": 2600}),
    ("X-PM-035", "HIP Superalloy IN718", {"tensile": 1300, "yield": 1100, "modulus": 200, "density": 8200, "kc1_1": 3000}),
    ("X-PM-036", "Porous Ti Medical", {"tensile": 150, "yield": 100, "modulus": 20, "density": 2500, "kc1_1": 800}),
    ("X-PM-037", "Porous SS Filter", {"tensile": 100, "yield": 70, "modulus": 50, "density": 4000, "kc1_1": 1200}),
    ("X-PM-038", "Porous Bronze Filter", {"tensile": 80, "yield": 50, "modulus": 30, "density": 4500, "kc1_1": 600}),
    ("X-PM-039", "Porous Ni Electrode", {"tensile": 120, "yield": 80, "modulus": 60, "density": 5000, "kc1_1": 1400}),
    ("X-PM-040", "PM Soft Magnetic Fe-P", {"tensile": 300, "yield": 200, "modulus": 150, "density": 7200, "kc1_1": 1600}),
]

# ============================================================================
# HONEYCOMB & SANDWICH (20 materials)
# ============================================================================
SANDWICH_MATERIALS = [
    ("X-SAND-001", "Al Honeycomb 1/8-5052", {"tensile": 3, "modulus": 0.5, "density": 50, "kc1_1": 100}),
    ("X-SAND-002", "Al Honeycomb 1/4-5052", {"tensile": 2, "modulus": 0.3, "density": 37, "kc1_1": 80}),
    ("X-SAND-003", "Al Honeycomb 3/8-5052", {"tensile": 1.5, "modulus": 0.2, "density": 29, "kc1_1": 60}),
    ("X-SAND-004", "Al Honeycomb 1/8-5056", {"tensile": 4, "modulus": 0.6, "density": 55, "kc1_1": 110}),
    ("X-SAND-005", "Al Honeycomb OX Core", {"tensile": 5, "modulus": 0.8, "density": 70, "kc1_1": 130}),
    ("X-SAND-006", "Nomex 1/8-2lb", {"tensile": 2, "modulus": 0.15, "density": 32, "kc1_1": 40}),
    ("X-SAND-007", "Nomex 1/8-3lb", {"tensile": 3, "modulus": 0.25, "density": 48, "kc1_1": 55}),
    ("X-SAND-008", "Nomex 1/8-4lb", {"tensile": 4, "modulus": 0.35, "density": 64, "kc1_1": 70}),
    ("X-SAND-009", "Nomex 3/16-3lb", {"tensile": 2.5, "modulus": 0.2, "density": 48, "kc1_1": 50}),
    ("X-SAND-010", "PP Honeycomb", {"tensile": 1, "modulus": 0.08, "density": 80, "kc1_1": 30}),
    ("X-SAND-011", "PC Honeycomb", {"tensile": 1.5, "modulus": 0.12, "density": 90, "kc1_1": 45}),
    ("X-SAND-012", "Al Foam Cymat", {"tensile": 5, "modulus": 1.5, "density": 300, "kc1_1": 200}),
    ("X-SAND-013", "Al Foam Alporas", {"tensile": 4, "modulus": 1.2, "density": 250, "kc1_1": 180}),
    ("X-SAND-014", "Al Foam ERG Duocel", {"tensile": 3, "modulus": 0.8, "density": 200, "kc1_1": 150}),
    ("X-SAND-015", "Steel-Al Sandwich", {"tensile": 200, "modulus": 50, "density": 3500, "kc1_1": 1200}),
    ("X-SAND-016", "Al-PE-Al Sandwich", {"tensile": 80, "modulus": 20, "density": 1500, "kc1_1": 400}),
    ("X-SAND-017", "Rohacell 31 IG", {"tensile": 1, "modulus": 0.036, "density": 32, "kc1_1": 25}),
    ("X-SAND-018", "Rohacell 51 IG", {"tensile": 1.6, "modulus": 0.070, "density": 52, "kc1_1": 35}),
    ("X-SAND-019", "Rohacell 110 IG", {"tensile": 3.5, "modulus": 0.180, "density": 110, "kc1_1": 60}),
    ("X-SAND-020", "Balsa Core", {"tensile": 10, "modulus": 3, "density": 150, "kc1_1": 50}),
]

# ============================================================================
# GENERATOR FUNCTIONS
# ============================================================================

def save_category(name, materials, subcategory):
    """Save a category to JSON file"""
    output_path = MATERIALS_DIR / f"{name}.json"
    with open(output_path, 'w') as f:
        json.dump({
            "category": "X_SPECIALTY",
            "subcategory": subcategory,
            "version": "1.0",
            "generated": datetime.now().isoformat(),
            "material_count": len(materials),
            "materials": materials
        }, f, indent=2)
    return len(materials), str(output_path)

def generate_am():
    """Generate Additive Manufacturing materials"""
    materials = []
    for mat_id, name, props in AM_MATERIALS:
        mat = create_base(mat_id, name, "ADDITIVE", "AM", "X-AM")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["yield_strength"]["value"] = props["yield"]
        mat["elastic_modulus"]["value"] = props["modulus"]
        mat["density"]["value"] = props["density"]
        mat["melting_point"]["value"] = props.get("Tm", 0) or 0
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["recommended_tool_material"] = props["tool"]
        mat["am_specific"] = {
            "process": "SLM" if "SLM" in name else "EBM" if "EBM" in name else "SLS" if "SLS" in name else "FDM" if "FDM" in name else "SLA" if "SLA" in name else "MJF",
            "as_built_properties": True,
            "post_machining_recommended": True,
            "support_removal_difficulty": "MEDIUM"
        }
        materials.append(mat)
    return save_category("additive_manufacturing", materials, "ADDITIVE_MANUFACTURING")

def generate_wood():
    """Generate Wood materials"""
    materials = []
    for mat_id, name, props in WOOD_MATERIALS:
        mat = create_base(mat_id, name, "WOOD", "WOOD", "X-WOOD")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["elastic_modulus"]["value"] = props["modulus"]
        mat["density"]["value"] = props["density"]
        mat["hardness_hb"]["value"] = int(props["hardness"] / 10)  # Janka to approx HB
        mat["kc1_1"]["value"] = int(props["hardness"] / 5)
        mat["chip_type"] = "CONTINUOUS"
        mat["recommended_tool_material"] = ["Carbide", "HSS"]
        mat["recommended_coolant"] = "DRY"
        mat["wood_specific"] = {
            "janka_hardness": props["hardness"],
            "grain_direction_critical": True,
            "moisture_content_sensitivity": "HIGH",
            "dust_collection_required": True
        }
        materials.append(mat)
    return save_category("wood", materials, "WOOD")

def generate_specialty():
    """Generate Specialty Alloy materials"""
    materials = []
    for item in SPECIALTY_ALLOYS:
        mat_id, name, props = item[0], item[1], item[2]
        mat = create_base(mat_id, name, "SPECIALTY", "SPECIALTY_ALLOY", "X-SPEC")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["yield_strength"]["value"] = props.get("yield", int(props["tensile"] * 0.7))
        mat["elastic_modulus"]["value"] = props["modulus"]
        mat["density"]["value"] = props["density"]
        mat["melting_point"]["value"] = props["Tm"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        if props.get("toxic"):
            mat["specialty_specific"] = {"toxic_hazard": True, "special_handling": "BERYLLIUM_PROTOCOL"}
        if props.get("cte"):
            mat["thermal_expansion"]["value"] = props["cte"]
        if props.get("perm"):
            mat["specialty_specific"] = {"magnetic_permeability": props["perm"]}
        materials.append(mat)
    return save_category("specialty_alloys", materials, "SPECIALTY_ALLOYS")

def generate_precious():
    """Generate Precious Metal materials"""
    materials = []
    for mat_id, name, props in PRECIOUS_METALS:
        mat = create_base(mat_id, name, "PRECIOUS", "PRECIOUS_METAL", "X-PREC")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["yield_strength"]["value"] = props.get("yield", int(props["tensile"] * 0.5))
        mat["elastic_modulus"]["value"] = props["modulus"]
        mat["density"]["value"] = props["density"]
        mat["melting_point"]["value"] = props["Tm"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["precious_specific"] = {"value_recovery_critical": True, "chip_collection_required": True}
        materials.append(mat)
    return save_category("precious_metals", materials, "PRECIOUS_METALS")

def generate_graphite():
    """Generate Graphite materials"""
    materials = []
    for mat_id, name, props in GRAPHITE_MATERIALS:
        mat = create_base(mat_id, name, "GRAPHITE", "GRAPHITE", "X-GRAP")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["elastic_modulus"]["value"] = props["modulus"]
        mat["density"]["value"] = props["density"]
        mat["thermal_conductivity"]["value"] = props["k"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["chip_type"] = "POWDER"
        mat["recommended_coolant"] = "DRY"
        mat["graphite_specific"] = {"dust_hazard": True, "vacuum_extraction_required": True}
        materials.append(mat)
    return save_category("graphite", materials, "GRAPHITE")

def generate_pm():
    """Generate Powder Metallurgy materials"""
    materials = []
    for mat_id, name, props in PM_MATERIALS:
        mat = create_base(mat_id, name, "PM", "POWDER_METALLURGY", "X-PM")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["yield_strength"]["value"] = props["yield"]
        mat["elastic_modulus"]["value"] = props["modulus"]
        mat["density"]["value"] = props["density"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["pm_specific"] = {"porosity_typical": 5, "infiltration_possible": True}
        materials.append(mat)
    return save_category("powder_metallurgy", materials, "POWDER_METALLURGY")

def generate_sandwich():
    """Generate Honeycomb/Sandwich materials"""
    materials = []
    for mat_id, name, props in SANDWICH_MATERIALS:
        mat = create_base(mat_id, name, "SANDWICH", "HONEYCOMB", "X-SAND")
        mat["tensile_strength"]["value"] = props["tensile"]
        mat["elastic_modulus"]["value"] = props["modulus"]
        mat["density"]["value"] = props["density"]
        mat["kc1_1"]["value"] = props["kc1_1"]
        mat["chip_type"] = "DISCONTINUOUS"
        mat["sandwich_specific"] = {"core_crush_risk": True, "potting_recommended": True}
        materials.append(mat)
    return save_category("honeycomb_sandwich", materials, "HONEYCOMB_SANDWICH")

# ============================================================================
# PARALLEL EXECUTION
# ============================================================================

def main():
    """Run all generators in parallel"""
    print(f"\n{'='*70}")
    print("PRISM PARALLEL MATERIAL GENERATOR - Remaining Categories")
    print(f"{'='*70}")
    print(f"Started: {datetime.now().isoformat()}")
    
    start = time.time()
    
    generators = [
        ("AM", generate_am),
        ("WOOD", generate_wood),
        ("SPECIALTY", generate_specialty),
        ("PRECIOUS", generate_precious),
        ("GRAPHITE", generate_graphite),
        ("PM", generate_pm),
        ("SANDWICH", generate_sandwich),
    ]
    
    results = {}
    
    # TRUE PARALLEL EXECUTION
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
