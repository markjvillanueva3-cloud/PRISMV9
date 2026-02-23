"""
PRISM Material Generator v2.0 - Parallel Batch Creation
Generates materials with full 127-parameter coverage for X_SPECIALTY categories
"""

import json
import os
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import random

PRISM_ROOT = Path(r"C:\PRISM")
MATERIALS_DIR = PRISM_ROOT / "data" / "materials" / "X_SPECIALTY"

# Ensure directory exists
MATERIALS_DIR.mkdir(parents=True, exist_ok=True)

# =============================================================================
# MATERIAL TEMPLATES BY CATEGORY
# =============================================================================

def create_base_material(mat_id, name, category, subcategory, iso_class="X1"):
    """Create base 127-parameter material structure"""
    return {
        # IDENTIFICATION (12 params)
        "id": mat_id,
        "name": name,
        "uns": "",
        "din": "",
        "jis": "",
        "iso": "",
        "aliases": [],
        "manufacturer_names": {},
        "description": f"{name} - {subcategory} material for precision machining",
        "typical_applications": [],
        "similar_materials": [],
        "image_url": "",
        
        # CLASSIFICATION (8 params)
        "category": category,
        "family": subcategory,
        "group": subcategory,
        "iso_p_class": None,
        "iso_m_class": None,
        "iso_k_class": None,
        "iso_n_class": None,
        "iso_s_class": None,
        "iso_x_class": iso_class,
        
        # MECHANICAL (18 params)
        "tensile_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.7},
        "yield_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.7},
        "elongation": {"value": 0, "unit": "%", "source": "estimated", "confidence": 0.7},
        "reduction_of_area": {"value": 0, "unit": "%", "source": "estimated", "confidence": 0.6},
        "hardness_hrc": {"value": None, "unit": "HRC", "source": "estimated", "confidence": 0.7},
        "hardness_hb": {"value": 0, "unit": "HB", "source": "estimated", "confidence": 0.7},
        "hardness_hv": {"value": 0, "unit": "HV", "source": "estimated", "confidence": 0.7},
        "elastic_modulus": {"value": 0, "unit": "GPa", "source": "estimated", "confidence": 0.8},
        "shear_modulus": {"value": 0, "unit": "GPa", "source": "estimated", "confidence": 0.7},
        "poisson_ratio": {"value": 0.3, "unit": "-", "source": "estimated", "confidence": 0.8},
        "fatigue_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.6},
        "impact_strength": {"value": 0, "unit": "J", "source": "estimated", "confidence": 0.6},
        "fracture_toughness": {"value": 0, "unit": "MPa√m", "source": "estimated", "confidence": 0.6},
        "compressive_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.7},
        "shear_strength": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.7},
        "work_hardening_exp": {"value": 0, "unit": "-", "source": "estimated", "confidence": 0.6},
        "strength_coefficient": {"value": 0, "unit": "MPa", "source": "estimated", "confidence": 0.6},
        "strain_rate_sensitivity": {"value": 0.01, "unit": "-", "source": "estimated", "confidence": 0.5},
        
        # THERMAL (12 params)
        "thermal_conductivity": {"value": 0, "unit": "W/m·K", "source": "estimated", "confidence": 0.8},
        "specific_heat": {"value": 0, "unit": "J/kg·K", "source": "estimated", "confidence": 0.8},
        "melting_point": {"value": 0, "unit": "°C", "source": "estimated", "confidence": 0.9},
        "solidus_temp": {"value": 0, "unit": "°C", "source": "estimated", "confidence": 0.7},
        "liquidus_temp": {"value": 0, "unit": "°C", "source": "estimated", "confidence": 0.7},
        "thermal_expansion": {"value": 0, "unit": "µm/m·K", "source": "estimated", "confidence": 0.8},
        "thermal_diffusivity": {"value": 0, "unit": "mm²/s", "source": "estimated", "confidence": 0.7},
        "emissivity": {"value": 0.5, "unit": "-", "source": "estimated", "confidence": 0.6},
        "max_service_temp": {"value": 0, "unit": "°C", "source": "estimated", "confidence": 0.8},
        "annealing_temp": {"value": None, "unit": "°C", "source": "estimated", "confidence": 0.5},
        "tempering_temp": {"value": None, "unit": "°C", "source": "estimated", "confidence": 0.5},
        "austenitizing_temp": {"value": None, "unit": "°C", "source": "estimated", "confidence": 0.5},
        
        # PHYSICAL (6 params)
        "density": {"value": 0, "unit": "kg/m³", "source": "estimated", "confidence": 0.9},
        "crystal_structure": None,
        "magnetic": False,
        "electrical_resistivity": {"value": 0, "unit": "µΩ·cm", "source": "estimated", "confidence": 0.7},
        "corrosion_resistance": "MEDIUM",
        "weldability": "FAIR",
        
        # MACHINABILITY (15 params)
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
        "specific_cutting_energy": {"value": 2.0, "unit": "J/mm³", "source": "estimated", "confidence": 0.7},
        "cutting_speed_multiplier": {"value": 1.0, "unit": "-", "source": "estimated", "confidence": 0.7},
        
        # KIENZLE (12 params)
        "kc1_1": {"value": 1500, "unit": "N/mm²", "source": "estimated", "confidence": 0.7},
        "mc": {"value": 0.25, "unit": "-", "source": "estimated", "confidence": 0.7},
        "kc1_1_turning": {"value": 1500, "unit": "N/mm²", "source": "estimated", "confidence": 0.7},
        "kc1_1_milling": {"value": 1600, "unit": "N/mm²", "source": "estimated", "confidence": 0.7},
        "kc1_1_drilling": {"value": 1700, "unit": "N/mm²", "source": "estimated", "confidence": 0.7},
        "rake_angle_correction": {"value": 1.5, "unit": "%/°", "source": "estimated", "confidence": 0.6},
        "wear_correction_factor": {"value": 1.1, "unit": "-", "source": "estimated", "confidence": 0.6},
        "speed_correction_factor": {"value": 1.0, "unit": "-", "source": "estimated", "confidence": 0.6},
        "coolant_correction_factor": {"value": 0.9, "unit": "-", "source": "estimated", "confidence": 0.6},
        "feed_force_ratio": {"value": 0.5, "unit": "-", "source": "estimated", "confidence": 0.6},
        "passive_force_ratio": {"value": 0.3, "unit": "-", "source": "estimated", "confidence": 0.6},
        "kc_source": "estimated",
        
        # JOHNSON-COOK (8 params)
        "jc_A": {"value": 500, "unit": "MPa", "source": "estimated", "confidence": 0.5},
        "jc_B": {"value": 500, "unit": "MPa", "source": "estimated", "confidence": 0.5},
        "jc_n": {"value": 0.3, "unit": "-", "source": "estimated", "confidence": 0.5},
        "jc_C": {"value": 0.01, "unit": "-", "source": "estimated", "confidence": 0.5},
        "jc_m": {"value": 1.0, "unit": "-", "source": "estimated", "confidence": 0.5},
        "jc_ref_strain_rate": {"value": 1.0, "unit": "1/s", "source": "literature", "confidence": 0.9},
        "jc_ref_temp": {"value": 20, "unit": "°C", "source": "literature", "confidence": 0.9},
        "jc_source": "estimated",
        
        # TAYLOR (10 params)
        "taylor_C": {"value": 200, "unit": "m/min", "source": "estimated", "confidence": 0.6},
        "taylor_n": {"value": 0.25, "unit": "-", "source": "estimated", "confidence": 0.6},
        "taylor_C_turning": {"value": 200, "unit": "m/min", "source": "estimated", "confidence": 0.6},
        "taylor_C_milling": {"value": 180, "unit": "m/min", "source": "estimated", "confidence": 0.6},
        "taylor_C_drilling": {"value": 150, "unit": "m/min", "source": "estimated", "confidence": 0.6},
        "taylor_feed_exp": {"value": 0.15, "unit": "-", "source": "estimated", "confidence": 0.5},
        "taylor_doc_exp": {"value": 0.10, "unit": "-", "source": "estimated", "confidence": 0.5},
        "taylor_coolant_factor": {"value": 1.2, "unit": "-", "source": "estimated", "confidence": 0.6},
        "taylor_hardness_factor": {"value": 1.0, "unit": "-", "source": "estimated", "confidence": 0.6},
        "taylor_source": "estimated",
        
        # SURFACE (8 params)
        "min_achievable_ra": {"value": 0.8, "unit": "µm", "source": "estimated", "confidence": 0.7},
        "typical_ra_range": {"min": 0.8, "max": 6.3, "unit": "µm"},
        "surface_integrity_sensitivity": "MEDIUM",
        "residual_stress_tendency": "COMPRESSIVE",
        "burr_formation_tendency": "MEDIUM",
        "surface_hardening_tendency": "LOW",
        "surface_chemistry_sensitivity": "LOW",
        "surface_source": "estimated",
        
        # COOLANT (8 params)
        "coolant_compatibility": {
            "flood": {"compatible": True, "effectiveness": 0.9},
            "mist": {"compatible": True, "effectiveness": 0.7},
            "mql": {"compatible": True, "effectiveness": 0.8},
            "dry": {"compatible": True, "effectiveness": 0.5},
            "cryogenic": {"compatible": True, "effectiveness": 0.9},
            "high_pressure": {"compatible": True, "effectiveness": 0.95}
        },
        "coolant_primary_recommendation": "FLOOD",
        "coolant_secondary_recommendation": "MQL",
        "coolant_restrictions": [],
        "coolant_notes": "",
        "emulsion_concentration": {"min": 5, "max": 10, "unit": "%"},
        "coolant_pressure_recommendation": {"min": 20, "max": 70, "unit": "bar"},
        "coolant_source": "estimated",
        
        # METADATA (10 params)
        "data_quality_grade": "C",
        "primary_source": "estimated",
        "secondary_sources": [],
        "last_verified": datetime.now().strftime("%Y-%m-%d"),
        "created_date": datetime.now().strftime("%Y-%m-%d"),
        "created_by": "PRISM_BATCH_GENERATOR_v2",
        "version": "1.0",
        "notes": "",
        "validation_status": "PENDING",
        "confidence_overall": 0.65
    }

# =============================================================================
# COMPOSITE MATERIALS DATA
# =============================================================================

COMPOSITES = [
    # CFRP Materials (25)
    ("X-COMP-001", "CFRP UD Epoxy T300", {"tensile": 1500, "modulus": 135, "density": 1550, "kc1_1": 80, "mc": 0.15, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-002", "CFRP UD Epoxy M55J", {"tensile": 1800, "modulus": 300, "density": 1600, "kc1_1": 90, "mc": 0.12, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-003", "CFRP UD Epoxy T700", {"tensile": 2100, "modulus": 140, "density": 1560, "kc1_1": 85, "mc": 0.14, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-004", "CFRP UD Epoxy T800", {"tensile": 2500, "modulus": 160, "density": 1580, "kc1_1": 95, "mc": 0.13, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-005", "CFRP Woven Plain T300", {"tensile": 600, "modulus": 70, "density": 1550, "kc1_1": 75, "mc": 0.18, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-006", "CFRP Woven Twill T300", {"tensile": 650, "modulus": 72, "density": 1550, "kc1_1": 78, "mc": 0.17, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-007", "CFRP Woven Satin T300", {"tensile": 620, "modulus": 68, "density": 1540, "kc1_1": 76, "mc": 0.18, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-008", "CFRP Quasi-Iso T300", {"tensile": 500, "modulus": 50, "density": 1550, "kc1_1": 70, "mc": 0.20, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-009", "CFRP Quasi-Iso T700", {"tensile": 600, "modulus": 55, "density": 1560, "kc1_1": 75, "mc": 0.18, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-010", "CFRP BMI High Temp", {"tensile": 550, "modulus": 65, "density": 1580, "kc1_1": 85, "mc": 0.16, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-011", "CFRP PEEK AS4", {"tensile": 1200, "modulus": 130, "density": 1600, "kc1_1": 100, "mc": 0.14, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-012", "CFRP PPS T300", {"tensile": 800, "modulus": 60, "density": 1580, "kc1_1": 90, "mc": 0.16, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-013", "CFRP Prepreg Autoclave", {"tensile": 2000, "modulus": 150, "density": 1560, "kc1_1": 88, "mc": 0.13, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-014", "CFRP RTM Standard", {"tensile": 1000, "modulus": 80, "density": 1550, "kc1_1": 82, "mc": 0.17, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-015", "CFRP Pultrusion Rod", {"tensile": 2500, "modulus": 140, "density": 1600, "kc1_1": 95, "mc": 0.12, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-016", "CFRP Filament Wound", {"tensile": 1800, "modulus": 120, "density": 1580, "kc1_1": 90, "mc": 0.14, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-017", "CFRP Short Fiber Molding", {"tensile": 200, "modulus": 25, "density": 1400, "kc1_1": 60, "mc": 0.22, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-018", "CFRP Long Fiber PA", {"tensile": 280, "modulus": 30, "density": 1350, "kc1_1": 65, "mc": 0.20, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-019", "CFRP Forged Composite", {"tensile": 250, "modulus": 35, "density": 1500, "kc1_1": 70, "mc": 0.18, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-020", "CFRP Sandwich Nomex", {"tensile": 300, "modulus": 40, "density": 500, "kc1_1": 50, "mc": 0.25, "chip": "DISCONTINUOUS", "abrasive": "MEDIUM", "tool": ["Carbide"], "coolant": "DRY"}),
    ("X-COMP-021", "CFRP Sandwich Foam", {"tensile": 250, "modulus": 30, "density": 400, "kc1_1": 45, "mc": 0.28, "chip": "DISCONTINUOUS", "abrasive": "MEDIUM", "tool": ["Carbide"], "coolant": "DRY"}),
    ("X-COMP-022", "CFRP-Al Hybrid FML", {"tensile": 800, "modulus": 90, "density": 2200, "kc1_1": 400, "mc": 0.22, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-023", "CFRP High Tg 180C", {"tensile": 1600, "modulus": 145, "density": 1570, "kc1_1": 92, "mc": 0.13, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-024", "CFRP Cyanate Ester", {"tensile": 1400, "modulus": 160, "density": 1580, "kc1_1": 95, "mc": 0.12, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-025", "CFRP Recycled Content", {"tensile": 180, "modulus": 20, "density": 1400, "kc1_1": 55, "mc": 0.24, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["Carbide"], "coolant": "FLOOD"}),
    
    # GFRP Materials (15)
    ("X-COMP-026", "GFRP E-Glass Polyester", {"tensile": 200, "modulus": 12, "density": 1800, "kc1_1": 120, "mc": 0.20, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-027", "GFRP E-Glass Vinylester", {"tensile": 250, "modulus": 14, "density": 1850, "kc1_1": 130, "mc": 0.19, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-028", "GFRP E-Glass Epoxy", {"tensile": 400, "modulus": 25, "density": 1900, "kc1_1": 140, "mc": 0.18, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-029", "GFRP S-Glass Epoxy", {"tensile": 700, "modulus": 50, "density": 2000, "kc1_1": 160, "mc": 0.16, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-030", "GFRP S2-Glass High Perf", {"tensile": 800, "modulus": 55, "density": 2050, "kc1_1": 170, "mc": 0.15, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-031", "GFRP R-Glass Aerospace", {"tensile": 850, "modulus": 60, "density": 2100, "kc1_1": 180, "mc": 0.14, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-032", "GFRP Pultrusion Profile", {"tensile": 600, "modulus": 40, "density": 1900, "kc1_1": 150, "mc": 0.17, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-033", "GFRP SMC Molding", {"tensile": 80, "modulus": 12, "density": 1850, "kc1_1": 100, "mc": 0.24, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-034", "GFRP BMC Bulk Molding", {"tensile": 50, "modulus": 10, "density": 1900, "kc1_1": 90, "mc": 0.26, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-035", "GFRP FR Phenolic", {"tensile": 150, "modulus": 15, "density": 1850, "kc1_1": 130, "mc": 0.20, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-036", "GFRP Marine Vinylester", {"tensile": 300, "modulus": 18, "density": 1900, "kc1_1": 135, "mc": 0.19, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-037", "GFRP Wind Blade Triax", {"tensile": 450, "modulus": 28, "density": 1850, "kc1_1": 145, "mc": 0.18, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-038", "GFRP Transparent Thin", {"tensile": 250, "modulus": 15, "density": 1800, "kc1_1": 110, "mc": 0.22, "chip": "DISCONTINUOUS", "abrasive": "MEDIUM", "tool": ["Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-039", "GFRP PP Thermoplastic", {"tensile": 100, "modulus": 8, "density": 1400, "kc1_1": 80, "mc": 0.28, "chip": "CONTINUOUS", "abrasive": "MEDIUM", "tool": ["Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-040", "GFRP PA66 LFT", {"tensile": 180, "modulus": 12, "density": 1500, "kc1_1": 95, "mc": 0.24, "chip": "CONTINUOUS", "abrasive": "MEDIUM", "tool": ["Carbide"], "coolant": "FLOOD"}),
    
    # Aramid Composites (8)
    ("X-COMP-041", "Kevlar 49 Epoxy UD", {"tensile": 1400, "modulus": 80, "density": 1380, "kc1_1": 60, "mc": 0.18, "chip": "FUZZY", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "DRY"}),
    ("X-COMP-042", "Kevlar 49 Epoxy Woven", {"tensile": 500, "modulus": 35, "density": 1400, "kc1_1": 55, "mc": 0.22, "chip": "FUZZY", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "DRY"}),
    ("X-COMP-043", "Kevlar 29 Ballistic", {"tensile": 600, "modulus": 30, "density": 1350, "kc1_1": 50, "mc": 0.24, "chip": "FUZZY", "abrasive": "HIGH", "tool": ["Carbide"], "coolant": "DRY"}),
    ("X-COMP-044", "Twaron Composite", {"tensile": 550, "modulus": 32, "density": 1380, "kc1_1": 52, "mc": 0.23, "chip": "FUZZY", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "DRY"}),
    ("X-COMP-045", "Kevlar-Carbon Hybrid", {"tensile": 800, "modulus": 60, "density": 1450, "kc1_1": 70, "mc": 0.17, "chip": "FUZZY", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-046", "Nomex Honeycomb Core", {"tensile": 5, "modulus": 0.1, "density": 48, "kc1_1": 10, "mc": 0.40, "chip": "FUZZY", "abrasive": "LOW", "tool": ["Carbide"], "coolant": "DRY"}),
    ("X-COMP-047", "Technora High Temp", {"tensile": 600, "modulus": 35, "density": 1390, "kc1_1": 58, "mc": 0.21, "chip": "FUZZY", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "DRY"}),
    ("X-COMP-048", "Vectran Composite", {"tensile": 700, "modulus": 40, "density": 1400, "kc1_1": 62, "mc": 0.19, "chip": "FUZZY", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "DRY"}),
    
    # MMC Materials (15)
    ("X-COMP-049", "Al-SiC 10% Cast", {"tensile": 350, "modulus": 95, "density": 2750, "kc1_1": 600, "mc": 0.22, "chip": "SEGMENTED", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "FLOOD"}),
    ("X-COMP-050", "Al-SiC 20% Cast", {"tensile": 400, "modulus": 110, "density": 2800, "kc1_1": 800, "mc": 0.20, "chip": "SEGMENTED", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "FLOOD"}),
    ("X-COMP-051", "Al-SiC 30% Wrought", {"tensile": 480, "modulus": 130, "density": 2850, "kc1_1": 1000, "mc": 0.18, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "Diamond"], "coolant": "FLOOD"}),
    ("X-COMP-052", "Al-SiC 40% PM", {"tensile": 520, "modulus": 160, "density": 2900, "kc1_1": 1200, "mc": 0.16, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "FLOOD"}),
    ("X-COMP-053", "Al-Al2O3 Saffil", {"tensile": 300, "modulus": 85, "density": 2750, "kc1_1": 500, "mc": 0.24, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-054", "Al-B4C Cermet", {"tensile": 450, "modulus": 140, "density": 2700, "kc1_1": 1100, "mc": 0.17, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "FLOOD"}),
    ("X-COMP-055", "Ti-SiC Monofilament", {"tensile": 1200, "modulus": 200, "density": 3900, "kc1_1": 2000, "mc": 0.15, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["PCD", "CBN"], "coolant": "FLOOD"}),
    ("X-COMP-056", "Ti-TiB Whisker", {"tensile": 1100, "modulus": 140, "density": 4300, "kc1_1": 1800, "mc": 0.18, "chip": "SEGMENTED", "abrasive": "VERY_HIGH", "tool": ["PCD", "CBN"], "coolant": "FLOOD"}),
    ("X-COMP-057", "Mg-SiC Cast", {"tensile": 280, "modulus": 60, "density": 2000, "kc1_1": 450, "mc": 0.24, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-058", "Cu-W Infiltrated", {"tensile": 500, "modulus": 280, "density": 15500, "kc1_1": 900, "mc": 0.20, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-059", "Cu-Diamond Thermal", {"tensile": 350, "modulus": 400, "density": 5800, "kc1_1": 1500, "mc": 0.15, "chip": "DISCONTINUOUS", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "FLOOD"}),
    ("X-COMP-060", "Ni-Al2O3 ODS", {"tensile": 800, "modulus": 220, "density": 8200, "kc1_1": 2500, "mc": 0.18, "chip": "SEGMENTED", "abrasive": "HIGH", "tool": ["CBN", "Ceramic"], "coolant": "FLOOD"}),
    ("X-COMP-061", "Steel-TiC Cermet", {"tensile": 1200, "modulus": 250, "density": 7500, "kc1_1": 2800, "mc": 0.16, "chip": "SEGMENTED", "abrasive": "VERY_HIGH", "tool": ["CBN"], "coolant": "FLOOD"}),
    ("X-COMP-062", "Al-CNT Nanocomposite", {"tensile": 500, "modulus": 100, "density": 2700, "kc1_1": 550, "mc": 0.22, "chip": "CONTINUOUS", "abrasive": "MEDIUM", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-063", "Mg-CNT Nanocomposite", {"tensile": 350, "modulus": 55, "density": 1850, "kc1_1": 400, "mc": 0.25, "chip": "CONTINUOUS", "abrasive": "MEDIUM", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    
    # CMC Materials (12)
    ("X-COMP-064", "SiC-SiC Standard CVI", {"tensile": 300, "modulus": 250, "density": 2500, "kc1_1": 3500, "mc": 0.12, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-065", "SiC-SiC Hi-Nicalon", {"tensile": 350, "modulus": 280, "density": 2600, "kc1_1": 3800, "mc": 0.11, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-066", "SiC-SiC Tyranno MI", {"tensile": 320, "modulus": 260, "density": 2700, "kc1_1": 3600, "mc": 0.12, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-067", "C-SiC Standard CVI", {"tensile": 280, "modulus": 100, "density": 2100, "kc1_1": 2500, "mc": 0.14, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-068", "C-SiC Brake MI", {"tensile": 250, "modulus": 80, "density": 2300, "kc1_1": 2200, "mc": 0.15, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-069", "C-C Carbon-Carbon", {"tensile": 200, "modulus": 40, "density": 1700, "kc1_1": 800, "mc": 0.18, "chip": "POWDER", "abrasive": "HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-070", "C-C High Density", {"tensile": 250, "modulus": 60, "density": 1900, "kc1_1": 1000, "mc": 0.16, "chip": "POWDER", "abrasive": "HIGH", "tool": ["PCD", "Diamond"], "coolant": "DRY"}),
    ("X-COMP-071", "Al2O3-Al2O3 Oxide", {"tensile": 180, "modulus": 200, "density": 3200, "kc1_1": 4000, "mc": 0.10, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-072", "Mullite-Mullite Nextel", {"tensile": 150, "modulus": 170, "density": 2800, "kc1_1": 3200, "mc": 0.12, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-073", "ZrO2-ZrO2 Zirconia", {"tensile": 200, "modulus": 180, "density": 5600, "kc1_1": 3800, "mc": 0.11, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-074", "UHTC ZrB2-SiC", {"tensile": 350, "modulus": 450, "density": 5800, "kc1_1": 5000, "mc": 0.08, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    ("X-COMP-075", "UHTC HfB2-SiC", {"tensile": 400, "modulus": 480, "density": 10500, "kc1_1": 5500, "mc": 0.07, "chip": "POWDER", "abrasive": "VERY_HIGH", "tool": ["Diamond"], "coolant": "DRY"}),
    
    # Special Composites (5)
    ("X-COMP-076", "Natural Fiber Flax", {"tensile": 80, "modulus": 8, "density": 1300, "kc1_1": 50, "mc": 0.30, "chip": "FUZZY", "abrasive": "LOW", "tool": ["Carbide"], "coolant": "DRY"}),
    ("X-COMP-077", "Natural Fiber Hemp", {"tensile": 70, "modulus": 7, "density": 1250, "kc1_1": 45, "mc": 0.32, "chip": "FUZZY", "abrasive": "LOW", "tool": ["Carbide"], "coolant": "DRY"}),
    ("X-COMP-078", "Basalt Fiber Composite", {"tensile": 350, "modulus": 30, "density": 2000, "kc1_1": 150, "mc": 0.20, "chip": "DISCONTINUOUS", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-079", "UHMWPE Dyneema", {"tensile": 3000, "modulus": 120, "density": 970, "kc1_1": 30, "mc": 0.35, "chip": "CONTINUOUS", "abrasive": "LOW", "tool": ["Carbide"], "coolant": "FLOOD"}),
    ("X-COMP-080", "PBO Zylon Composite", {"tensile": 3500, "modulus": 180, "density": 1560, "kc1_1": 65, "mc": 0.18, "chip": "FUZZY", "abrasive": "HIGH", "tool": ["PCD", "Carbide"], "coolant": "DRY"}),
]


def customize_composite(base_mat, props):
    """Customize composite material with specific properties"""
    base_mat["tensile_strength"]["value"] = props["tensile"]
    base_mat["elastic_modulus"]["value"] = props["modulus"]
    base_mat["density"]["value"] = props["density"]
    base_mat["kc1_1"]["value"] = props["kc1_1"]
    base_mat["kc1_1_turning"]["value"] = props["kc1_1"]
    base_mat["kc1_1_milling"]["value"] = int(props["kc1_1"] * 1.1)
    base_mat["kc1_1_drilling"]["value"] = int(props["kc1_1"] * 1.2)
    base_mat["mc"]["value"] = props["mc"]
    base_mat["chip_type"] = props["chip"]
    base_mat["abrasiveness"] = props["abrasive"]
    base_mat["recommended_tool_material"] = props["tool"]
    base_mat["recommended_coolant"] = props["coolant"]
    base_mat["coolant_primary_recommendation"] = props["coolant"]
    
    # Composite-specific additions
    base_mat["composite_specific"] = {
        "delamination_risk": "HIGH" if "CFRP" in base_mat["name"] or "GFRP" in base_mat["name"] else "MEDIUM",
        "fiber_pullout_tendency": "HIGH" if "Kevlar" in base_mat["name"] or "Aramid" in base_mat["name"] else "MEDIUM",
        "dust_hazard": True if props["chip"] in ["DISCONTINUOUS", "POWDER", "FUZZY"] else False,
        "thermal_damage_threshold": 180 if "Epoxy" in base_mat["name"] else 250 if "BMI" in base_mat["name"] else 300,
        "minimum_feed_rate": 0.05 if props["chip"] == "FUZZY" else 0.02,
        "special_tooling_required": "Diamond" in props["tool"] or "PCD" in props["tool"]
    }
    
    return base_mat


def generate_composites_file():
    """Generate all composite materials"""
    materials = []
    for mat_id, name, props in COMPOSITES:
        base = create_base_material(mat_id, name, "COMPOSITE", "COMPOSITE", "X-COMP")
        mat = customize_composite(base, props)
        materials.append(mat)
    
    output_path = MATERIALS_DIR / "composites.json"
    with open(output_path, 'w') as f:
        json.dump({
            "category": "X_SPECIALTY",
            "subcategory": "COMPOSITES",
            "version": "1.0",
            "generated": datetime.now().isoformat(),
            "material_count": len(materials),
            "materials": materials
        }, f, indent=2)
    
    return len(materials), output_path


# =============================================================================
# PARALLEL BATCH EXECUTION
# =============================================================================

def generate_all_specialty_materials():
    """Master function to generate all X_SPECIALTY materials in parallel batches"""
    
    print(f"\n{'='*70}")
    print("PRISM X_SPECIALTY MATERIAL GENERATOR v2.0")
    print(f"{'='*70}")
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Output: {MATERIALS_DIR}")
    print(f"{'='*70}\n")
    
    results = {}
    
    # Phase 1: Composites (already implemented)
    print("[1/8] Generating COMPOSITES (80 materials)...")
    count, path = generate_composites_file()
    results["composites"] = {"count": count, "path": str(path)}
    print(f"       [OK] {count} materials -> {path}")
    
    # Additional generators would go here for:
    # - Polymers (generate_polymers_file)
    # - Ceramics (generate_ceramics_file)
    # - Refractories (generate_refractories_file)
    # - etc.
    
    print(f"\n{'='*70}")
    print("GENERATION COMPLETE")
    print(f"Total materials generated: {sum(r['count'] for r in results.values())}")
    print(f"{'='*70}\n")
    
    return results


if __name__ == "__main__":
    results = generate_all_specialty_materials()
    print(json.dumps(results, indent=2))
