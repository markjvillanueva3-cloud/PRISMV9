"""
PRISM COMPLETE MATERIALS ENHANCEMENT ENGINE v2.0
Parallel processing with iterative loops until 100% coverage achieved
Targets ALL 13 parameter categories
"""

import json
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing as mp
import math
import copy

# =============================================================================
# CONFIGURATION
# =============================================================================

NUM_WORKERS = min(8, mp.cpu_count())
PRISM_ROOT = Path(r"C:\PRISM\data")
TARGET_COVERAGE = 99.5  # Target percentage (allow tiny margin for truly unknown)
MAX_ITERATIONS = 10  # Safety limit

# =============================================================================
# COMPLETE PARAMETER DEFAULTS BY MATERIAL CLASS
# =============================================================================

DEFAULTS = {
    "steel": {
        # Identification
        "iso_group": "P",
        "material_class": "Steel",
        
        # Composition (typical low carbon steel)
        "composition": {
            "carbon": {"min": 0.1, "max": 0.3, "typical": 0.2},
            "manganese": {"min": 0.5, "max": 1.0, "typical": 0.75},
            "silicon": {"min": 0.15, "max": 0.35, "typical": 0.25},
            "phosphorus": {"min": 0, "max": 0.04, "typical": 0.02},
            "sulfur": {"min": 0, "max": 0.05, "typical": 0.025},
            "chromium": {"min": 0, "max": 0.5, "typical": 0.1},
            "nickel": {"min": 0, "max": 0.5, "typical": 0.1},
            "molybdenum": {"min": 0, "max": 0.1, "typical": 0.02},
            "copper": {"min": 0, "max": 0.2, "typical": 0.1},
            "vanadium": {"min": 0, "max": 0.05, "typical": 0.01},
            "tungsten": {"min": 0, "max": 0, "typical": 0},
            "cobalt": {"min": 0, "max": 0, "typical": 0},
            "titanium": {"min": 0, "max": 0, "typical": 0},
            "aluminum": {"min": 0, "max": 0.05, "typical": 0.02},
            "nitrogen": {"min": 0, "max": 0.01, "typical": 0.005},
            "iron": {"min": 97, "max": 99, "typical": 98}
        },
        
        # Physical
        "physical": {
            "density": 7850,
            "melting_point": {"solidus": 1470, "liquidus": 1530},
            "specific_heat": 486,
            "thermal_conductivity": 51.0,
            "thermal_expansion": 1.2e-5,
            "electrical_resistivity": 1.7e-7,
            "magnetic_permeability": 800,
            "poissons_ratio": 0.29,
            "elastic_modulus": 205000,
            "shear_modulus": 80000
        },
        
        # Mechanical
        "mechanical": {
            "hardness": {"brinell": 160, "rockwell_c": None, "vickers": 168},
            "tensile_strength": {"typical": 550},
            "yield_strength": {"typical": 380},
            "elongation": {"typical": 22},
            "reduction_of_area": {"typical": 55},
            "impact_energy": {"joules": 80, "temperature": 20},
            "fatigue_strength": 250,
            "fracture_toughness": 100
        },
        
        # Chip Formation
        "chip_formation": {
            "chip_type": "continuous",
            "serration_tendency": "low",
            "built_up_edge_tendency": "moderate",
            "chip_breaking": "moderate",
            "optimal_chip_thickness": 0.12,
            "shear_angle": 28,
            "friction_coefficient": 0.5,
            "chip_compression_ratio": 2.5
        },
        
        # Tribology
        "tribology": {
            "sliding_friction": 0.45,
            "adhesion_tendency": "moderate",
            "galling_tendency": "low",
            "welding_temperature": 1150,
            "oxide_stability": "moderate",
            "lubricity_response": "good"
        },
        
        # Thermal Machining
        "thermal_machining": {
            "cutting_temperature_coefficient": 0.85,
            "heat_partition_to_chip": 0.75,
            "heat_partition_to_tool": 0.12,
            "heat_partition_to_workpiece": 0.13,
            "thermal_softening_onset": 450,
            "recrystallization_temperature": 650,
            "hot_hardness_retention": "moderate",
            "thermal_shock_sensitivity": "low"
        },
        
        # Surface Integrity
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 0.8, "Ra_typical": 1.6, "Ra_max": 3.2},
            "residual_stress_tendency": "compressive",
            "white_layer_tendency": "low",
            "work_hardening_depth": 0.08,
            "microstructure_stability": "good",
            "burr_formation": "moderate",
            "surface_defect_sensitivity": "low",
            "polishability": "good"
        },
        
        # Machinability
        "machinability": {
            "aisi_rating": 70,
            "relative_to_1212": 0.70
        },
        
        # Recommendations
        "recommendations": {
            "turning": {
                "speed": {"min": 150, "max": 300, "optimal": 220},
                "feed": {"min": 0.15, "max": 0.4, "optimal": 0.25},
                "doc": {"min": 1.0, "max": 5.0, "optimal": 2.5}
            },
            "milling": {
                "speed": {"min": 120, "max": 250, "optimal": 180},
                "feed_per_tooth": {"min": 0.08, "max": 0.2, "optimal": 0.12}
            },
            "drilling": {
                "speed": {"min": 80, "max": 150, "optimal": 100},
                "feed": {"min": 0.1, "max": 0.3, "optimal": 0.2}
            },
            "threading": {
                "speed": {"min": 30, "max": 80, "optimal": 50}
            }
        }
    },
    
    "stainless": {
        "iso_group": "M",
        "material_class": "Stainless Steel",
        "composition": {
            "carbon": {"min": 0.02, "max": 0.08, "typical": 0.05},
            "manganese": {"min": 1.0, "max": 2.0, "typical": 1.5},
            "silicon": {"min": 0.3, "max": 0.75, "typical": 0.5},
            "phosphorus": {"min": 0, "max": 0.045, "typical": 0.02},
            "sulfur": {"min": 0, "max": 0.03, "typical": 0.01},
            "chromium": {"min": 16, "max": 20, "typical": 18},
            "nickel": {"min": 8, "max": 12, "typical": 10},
            "molybdenum": {"min": 2, "max": 3, "typical": 2.5},
            "copper": {"min": 0, "max": 0.5, "typical": 0.2},
            "vanadium": {"min": 0, "max": 0.1, "typical": 0},
            "tungsten": {"min": 0, "max": 0, "typical": 0},
            "cobalt": {"min": 0, "max": 0, "typical": 0},
            "titanium": {"min": 0, "max": 0.5, "typical": 0},
            "aluminum": {"min": 0, "max": 0.1, "typical": 0},
            "nitrogen": {"min": 0, "max": 0.1, "typical": 0.05},
            "iron": {"min": 62, "max": 72, "typical": 67}
        },
        "physical": {
            "density": 7950,
            "melting_point": {"solidus": 1400, "liquidus": 1450},
            "specific_heat": 500,
            "thermal_conductivity": 16.0,
            "thermal_expansion": 1.6e-5,
            "electrical_resistivity": 7.2e-7,
            "magnetic_permeability": 1.02,
            "poissons_ratio": 0.30,
            "elastic_modulus": 193000,
            "shear_modulus": 74000
        },
        "mechanical": {
            "hardness": {"brinell": 170, "rockwell_c": None, "vickers": 180},
            "tensile_strength": {"typical": 580},
            "yield_strength": {"typical": 260},
            "elongation": {"typical": 45},
            "reduction_of_area": {"typical": 60},
            "impact_energy": {"joules": 150, "temperature": 20},
            "fatigue_strength": 240,
            "fracture_toughness": 150
        },
        "chip_formation": {
            "chip_type": "continuous_stringy",
            "serration_tendency": "moderate",
            "built_up_edge_tendency": "high",
            "chip_breaking": "poor",
            "optimal_chip_thickness": 0.1,
            "shear_angle": 25,
            "friction_coefficient": 0.6,
            "chip_compression_ratio": 3.0
        },
        "tribology": {
            "sliding_friction": 0.55,
            "adhesion_tendency": "high",
            "galling_tendency": "high",
            "welding_temperature": 1050,
            "oxide_stability": "excellent",
            "lubricity_response": "moderate"
        },
        "thermal_machining": {
            "cutting_temperature_coefficient": 1.1,
            "heat_partition_to_chip": 0.65,
            "heat_partition_to_tool": 0.18,
            "heat_partition_to_workpiece": 0.17,
            "thermal_softening_onset": 500,
            "recrystallization_temperature": 900,
            "hot_hardness_retention": "good",
            "thermal_shock_sensitivity": "moderate"
        },
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 0.6, "Ra_typical": 1.2, "Ra_max": 2.5},
            "residual_stress_tendency": "tensile",
            "white_layer_tendency": "low",
            "work_hardening_depth": 0.15,
            "microstructure_stability": "good",
            "burr_formation": "high",
            "surface_defect_sensitivity": "moderate",
            "polishability": "excellent"
        },
        "machinability": {
            "aisi_rating": 45,
            "relative_to_1212": 0.45
        },
        "recommendations": {
            "turning": {
                "speed": {"min": 80, "max": 180, "optimal": 120},
                "feed": {"min": 0.1, "max": 0.3, "optimal": 0.2},
                "doc": {"min": 0.5, "max": 3.0, "optimal": 1.5}
            },
            "milling": {
                "speed": {"min": 60, "max": 150, "optimal": 100},
                "feed_per_tooth": {"min": 0.05, "max": 0.15, "optimal": 0.1}
            },
            "drilling": {
                "speed": {"min": 40, "max": 100, "optimal": 60},
                "feed": {"min": 0.08, "max": 0.2, "optimal": 0.12}
            },
            "threading": {
                "speed": {"min": 20, "max": 50, "optimal": 30}
            }
        }
    },
    
    "cast_iron": {
        "iso_group": "K",
        "material_class": "Cast Iron",
        "composition": {
            "carbon": {"min": 2.5, "max": 4.0, "typical": 3.2},
            "manganese": {"min": 0.4, "max": 0.8, "typical": 0.6},
            "silicon": {"min": 1.5, "max": 3.0, "typical": 2.2},
            "phosphorus": {"min": 0, "max": 0.1, "typical": 0.05},
            "sulfur": {"min": 0, "max": 0.12, "typical": 0.08},
            "chromium": {"min": 0, "max": 0.3, "typical": 0.1},
            "nickel": {"min": 0, "max": 0.5, "typical": 0.2},
            "molybdenum": {"min": 0, "max": 0.3, "typical": 0.1},
            "copper": {"min": 0, "max": 0.5, "typical": 0.2},
            "vanadium": {"min": 0, "max": 0.1, "typical": 0},
            "tungsten": {"min": 0, "max": 0, "typical": 0},
            "cobalt": {"min": 0, "max": 0, "typical": 0},
            "titanium": {"min": 0, "max": 0.05, "typical": 0},
            "aluminum": {"min": 0, "max": 0.05, "typical": 0},
            "nitrogen": {"min": 0, "max": 0.01, "typical": 0},
            "iron": {"min": 90, "max": 95, "typical": 93}
        },
        "physical": {
            "density": 7200,
            "melting_point": {"solidus": 1130, "liquidus": 1250},
            "specific_heat": 460,
            "thermal_conductivity": 45.0,
            "thermal_expansion": 1.1e-5,
            "electrical_resistivity": 1.0e-6,
            "magnetic_permeability": 400,
            "poissons_ratio": 0.26,
            "elastic_modulus": 110000,
            "shear_modulus": 44000
        },
        "mechanical": {
            "hardness": {"brinell": 200, "rockwell_c": None, "vickers": 210},
            "tensile_strength": {"typical": 300},
            "yield_strength": {"typical": 220},
            "elongation": {"typical": 2},
            "reduction_of_area": {"typical": 0},
            "impact_energy": {"joules": 8, "temperature": 20},
            "fatigue_strength": 120,
            "fracture_toughness": 20
        },
        "chip_formation": {
            "chip_type": "discontinuous",
            "serration_tendency": "very_low",
            "built_up_edge_tendency": "low",
            "chip_breaking": "excellent",
            "optimal_chip_thickness": 0.15,
            "shear_angle": 35,
            "friction_coefficient": 0.4,
            "chip_compression_ratio": 2.0
        },
        "tribology": {
            "sliding_friction": 0.35,
            "adhesion_tendency": "low",
            "galling_tendency": "very_low",
            "welding_temperature": 1000,
            "oxide_stability": "poor",
            "lubricity_response": "excellent"
        },
        "thermal_machining": {
            "cutting_temperature_coefficient": 0.7,
            "heat_partition_to_chip": 0.80,
            "heat_partition_to_tool": 0.10,
            "heat_partition_to_workpiece": 0.10,
            "thermal_softening_onset": 400,
            "recrystallization_temperature": 700,
            "hot_hardness_retention": "poor",
            "thermal_shock_sensitivity": "high"
        },
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 1.0, "Ra_typical": 2.5, "Ra_max": 5.0},
            "residual_stress_tendency": "compressive",
            "white_layer_tendency": "very_low",
            "work_hardening_depth": 0.05,
            "microstructure_stability": "good",
            "burr_formation": "low",
            "surface_defect_sensitivity": "high",
            "polishability": "poor"
        },
        "machinability": {
            "aisi_rating": 80,
            "relative_to_1212": 0.80
        },
        "recommendations": {
            "turning": {
                "speed": {"min": 100, "max": 250, "optimal": 160},
                "feed": {"min": 0.15, "max": 0.5, "optimal": 0.3},
                "doc": {"min": 1.0, "max": 6.0, "optimal": 3.0}
            },
            "milling": {
                "speed": {"min": 80, "max": 200, "optimal": 130},
                "feed_per_tooth": {"min": 0.1, "max": 0.25, "optimal": 0.15}
            },
            "drilling": {
                "speed": {"min": 60, "max": 120, "optimal": 80},
                "feed": {"min": 0.12, "max": 0.35, "optimal": 0.2}
            },
            "threading": {
                "speed": {"min": 25, "max": 60, "optimal": 40}
            }
        }
    },
    
    "aluminum": {
        "iso_group": "N",
        "material_class": "Aluminum Alloy",
        "composition": {
            "carbon": {"min": 0, "max": 0, "typical": 0},
            "manganese": {"min": 0, "max": 1.5, "typical": 0.5},
            "silicon": {"min": 0.2, "max": 1.5, "typical": 0.6},
            "phosphorus": {"min": 0, "max": 0, "typical": 0},
            "sulfur": {"min": 0, "max": 0, "typical": 0},
            "chromium": {"min": 0, "max": 0.35, "typical": 0.15},
            "nickel": {"min": 0, "max": 0, "typical": 0},
            "molybdenum": {"min": 0, "max": 0, "typical": 0},
            "copper": {"min": 0.1, "max": 5.0, "typical": 1.5},
            "vanadium": {"min": 0, "max": 0.1, "typical": 0},
            "tungsten": {"min": 0, "max": 0, "typical": 0},
            "cobalt": {"min": 0, "max": 0, "typical": 0},
            "titanium": {"min": 0, "max": 0.2, "typical": 0.05},
            "aluminum": {"min": 90, "max": 99, "typical": 95},
            "nitrogen": {"min": 0, "max": 0, "typical": 0},
            "iron": {"min": 0, "max": 0.7, "typical": 0.3}
        },
        "physical": {
            "density": 2700,
            "melting_point": {"solidus": 500, "liquidus": 650},
            "specific_heat": 900,
            "thermal_conductivity": 170.0,
            "thermal_expansion": 2.3e-5,
            "electrical_resistivity": 2.8e-8,
            "magnetic_permeability": 1.0,
            "poissons_ratio": 0.33,
            "elastic_modulus": 70000,
            "shear_modulus": 26000
        },
        "mechanical": {
            "hardness": {"brinell": 95, "rockwell_c": None, "vickers": 100},
            "tensile_strength": {"typical": 310},
            "yield_strength": {"typical": 275},
            "elongation": {"typical": 12},
            "reduction_of_area": {"typical": 25},
            "impact_energy": {"joules": 30, "temperature": 20},
            "fatigue_strength": 95,
            "fracture_toughness": 30
        },
        "chip_formation": {
            "chip_type": "continuous_ductile",
            "serration_tendency": "low",
            "built_up_edge_tendency": "high",
            "chip_breaking": "poor",
            "optimal_chip_thickness": 0.08,
            "shear_angle": 32,
            "friction_coefficient": 0.55,
            "chip_compression_ratio": 2.8
        },
        "tribology": {
            "sliding_friction": 0.50,
            "adhesion_tendency": "high",
            "galling_tendency": "moderate",
            "welding_temperature": 500,
            "oxide_stability": "excellent",
            "lubricity_response": "good"
        },
        "thermal_machining": {
            "cutting_temperature_coefficient": 0.5,
            "heat_partition_to_chip": 0.85,
            "heat_partition_to_tool": 0.08,
            "heat_partition_to_workpiece": 0.07,
            "thermal_softening_onset": 200,
            "recrystallization_temperature": 300,
            "hot_hardness_retention": "poor",
            "thermal_shock_sensitivity": "low"
        },
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 0.4, "Ra_typical": 0.8, "Ra_max": 2.0},
            "residual_stress_tendency": "compressive",
            "white_layer_tendency": "none",
            "work_hardening_depth": 0.03,
            "microstructure_stability": "good",
            "burr_formation": "high",
            "surface_defect_sensitivity": "moderate",
            "polishability": "excellent"
        },
        "machinability": {
            "aisi_rating": 300,
            "relative_to_1212": 3.0
        },
        "recommendations": {
            "turning": {
                "speed": {"min": 300, "max": 1000, "optimal": 600},
                "feed": {"min": 0.1, "max": 0.5, "optimal": 0.25},
                "doc": {"min": 0.5, "max": 5.0, "optimal": 2.0}
            },
            "milling": {
                "speed": {"min": 250, "max": 800, "optimal": 500},
                "feed_per_tooth": {"min": 0.05, "max": 0.2, "optimal": 0.1}
            },
            "drilling": {
                "speed": {"min": 150, "max": 400, "optimal": 250},
                "feed": {"min": 0.1, "max": 0.4, "optimal": 0.2}
            },
            "threading": {
                "speed": {"min": 50, "max": 150, "optimal": 100}
            }
        }
    },
    
    "titanium": {
        "iso_group": "S",
        "material_class": "Titanium Alloy",
        "composition": {
            "carbon": {"min": 0, "max": 0.1, "typical": 0.03},
            "manganese": {"min": 0, "max": 0, "typical": 0},
            "silicon": {"min": 0, "max": 0, "typical": 0},
            "phosphorus": {"min": 0, "max": 0, "typical": 0},
            "sulfur": {"min": 0, "max": 0, "typical": 0},
            "chromium": {"min": 0, "max": 0, "typical": 0},
            "nickel": {"min": 0, "max": 0, "typical": 0},
            "molybdenum": {"min": 0, "max": 0, "typical": 0},
            "copper": {"min": 0, "max": 0, "typical": 0},
            "vanadium": {"min": 3.5, "max": 4.5, "typical": 4.0},
            "tungsten": {"min": 0, "max": 0, "typical": 0},
            "cobalt": {"min": 0, "max": 0, "typical": 0},
            "titanium": {"min": 88, "max": 92, "typical": 90},
            "aluminum": {"min": 5.5, "max": 6.75, "typical": 6.0},
            "nitrogen": {"min": 0, "max": 0.05, "typical": 0.02},
            "iron": {"min": 0, "max": 0.3, "typical": 0.15}
        },
        "physical": {
            "density": 4430,
            "melting_point": {"solidus": 1600, "liquidus": 1670},
            "specific_heat": 526,
            "thermal_conductivity": 7.0,
            "thermal_expansion": 8.6e-6,
            "electrical_resistivity": 1.7e-6,
            "magnetic_permeability": 1.0,
            "poissons_ratio": 0.34,
            "elastic_modulus": 114000,
            "shear_modulus": 44000
        },
        "mechanical": {
            "hardness": {"brinell": 330, "rockwell_c": 36, "vickers": 350},
            "tensile_strength": {"typical": 950},
            "yield_strength": {"typical": 880},
            "elongation": {"typical": 10},
            "reduction_of_area": {"typical": 25},
            "impact_energy": {"joules": 25, "temperature": 20},
            "fatigue_strength": 500,
            "fracture_toughness": 75
        },
        "chip_formation": {
            "chip_type": "segmented",
            "serration_tendency": "high",
            "built_up_edge_tendency": "moderate",
            "chip_breaking": "good",
            "optimal_chip_thickness": 0.08,
            "shear_angle": 30,
            "friction_coefficient": 0.55,
            "chip_compression_ratio": 2.2
        },
        "tribology": {
            "sliding_friction": 0.50,
            "adhesion_tendency": "high",
            "galling_tendency": "high",
            "welding_temperature": 900,
            "oxide_stability": "excellent",
            "lubricity_response": "poor"
        },
        "thermal_machining": {
            "cutting_temperature_coefficient": 1.3,
            "heat_partition_to_chip": 0.55,
            "heat_partition_to_tool": 0.25,
            "heat_partition_to_workpiece": 0.20,
            "thermal_softening_onset": 400,
            "recrystallization_temperature": 700,
            "hot_hardness_retention": "excellent",
            "thermal_shock_sensitivity": "high"
        },
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 0.6, "Ra_typical": 1.2, "Ra_max": 2.5},
            "residual_stress_tendency": "tensile",
            "white_layer_tendency": "moderate",
            "work_hardening_depth": 0.2,
            "microstructure_stability": "sensitive",
            "burr_formation": "moderate",
            "surface_defect_sensitivity": "high",
            "polishability": "good"
        },
        "machinability": {
            "aisi_rating": 22,
            "relative_to_1212": 0.22
        },
        "recommendations": {
            "turning": {
                "speed": {"min": 30, "max": 80, "optimal": 50},
                "feed": {"min": 0.08, "max": 0.2, "optimal": 0.12},
                "doc": {"min": 0.5, "max": 2.5, "optimal": 1.0}
            },
            "milling": {
                "speed": {"min": 25, "max": 60, "optimal": 40},
                "feed_per_tooth": {"min": 0.04, "max": 0.1, "optimal": 0.06}
            },
            "drilling": {
                "speed": {"min": 15, "max": 40, "optimal": 25},
                "feed": {"min": 0.05, "max": 0.15, "optimal": 0.08}
            },
            "threading": {
                "speed": {"min": 10, "max": 30, "optimal": 18}
            }
        }
    },
    
    "superalloy": {
        "iso_group": "S",
        "material_class": "Nickel Superalloy",
        "composition": {
            "carbon": {"min": 0.03, "max": 0.15, "typical": 0.08},
            "manganese": {"min": 0, "max": 0.5, "typical": 0.2},
            "silicon": {"min": 0, "max": 0.5, "typical": 0.2},
            "phosphorus": {"min": 0, "max": 0.015, "typical": 0.005},
            "sulfur": {"min": 0, "max": 0.015, "typical": 0.005},
            "chromium": {"min": 14, "max": 23, "typical": 19},
            "nickel": {"min": 50, "max": 75, "typical": 60},
            "molybdenum": {"min": 3, "max": 10, "typical": 6},
            "copper": {"min": 0, "max": 0.5, "typical": 0.1},
            "vanadium": {"min": 0, "max": 0, "typical": 0},
            "tungsten": {"min": 0, "max": 5, "typical": 2},
            "cobalt": {"min": 0, "max": 15, "typical": 8},
            "titanium": {"min": 0.5, "max": 3, "typical": 1.5},
            "aluminum": {"min": 0.5, "max": 2, "typical": 1.0},
            "nitrogen": {"min": 0, "max": 0.02, "typical": 0.01},
            "iron": {"min": 0, "max": 5, "typical": 2}
        },
        "physical": {
            "density": 8200,
            "melting_point": {"solidus": 1260, "liquidus": 1350},
            "specific_heat": 450,
            "thermal_conductivity": 11.0,
            "thermal_expansion": 1.3e-5,
            "electrical_resistivity": 1.2e-6,
            "magnetic_permeability": 1.0,
            "poissons_ratio": 0.30,
            "elastic_modulus": 210000,
            "shear_modulus": 81000
        },
        "mechanical": {
            "hardness": {"brinell": 350, "rockwell_c": 38, "vickers": 370},
            "tensile_strength": {"typical": 1100},
            "yield_strength": {"typical": 850},
            "elongation": {"typical": 15},
            "reduction_of_area": {"typical": 20},
            "impact_energy": {"joules": 40, "temperature": 20},
            "fatigue_strength": 450,
            "fracture_toughness": 100
        },
        "chip_formation": {
            "chip_type": "segmented",
            "serration_tendency": "high",
            "built_up_edge_tendency": "moderate",
            "chip_breaking": "moderate",
            "optimal_chip_thickness": 0.06,
            "shear_angle": 28,
            "friction_coefficient": 0.6,
            "chip_compression_ratio": 2.5
        },
        "tribology": {
            "sliding_friction": 0.55,
            "adhesion_tendency": "high",
            "galling_tendency": "high",
            "welding_temperature": 950,
            "oxide_stability": "excellent",
            "lubricity_response": "poor"
        },
        "thermal_machining": {
            "cutting_temperature_coefficient": 1.4,
            "heat_partition_to_chip": 0.50,
            "heat_partition_to_tool": 0.28,
            "heat_partition_to_workpiece": 0.22,
            "thermal_softening_onset": 600,
            "recrystallization_temperature": 1000,
            "hot_hardness_retention": "excellent",
            "thermal_shock_sensitivity": "moderate"
        },
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 0.6, "Ra_typical": 1.0, "Ra_max": 2.0},
            "residual_stress_tendency": "tensile",
            "white_layer_tendency": "moderate",
            "work_hardening_depth": 0.25,
            "microstructure_stability": "sensitive",
            "burr_formation": "moderate",
            "surface_defect_sensitivity": "high",
            "polishability": "good"
        },
        "machinability": {
            "aisi_rating": 12,
            "relative_to_1212": 0.12
        },
        "recommendations": {
            "turning": {
                "speed": {"min": 15, "max": 50, "optimal": 30},
                "feed": {"min": 0.05, "max": 0.15, "optimal": 0.1},
                "doc": {"min": 0.3, "max": 2.0, "optimal": 0.8}
            },
            "milling": {
                "speed": {"min": 12, "max": 40, "optimal": 25},
                "feed_per_tooth": {"min": 0.03, "max": 0.08, "optimal": 0.05}
            },
            "drilling": {
                "speed": {"min": 8, "max": 25, "optimal": 15},
                "feed": {"min": 0.03, "max": 0.1, "optimal": 0.05}
            },
            "threading": {
                "speed": {"min": 5, "max": 20, "optimal": 12}
            }
        }
    },
    
    "copper": {
        "iso_group": "N",
        "material_class": "Copper Alloy",
        "composition": {
            "carbon": {"min": 0, "max": 0, "typical": 0},
            "manganese": {"min": 0, "max": 0.5, "typical": 0.1},
            "silicon": {"min": 0, "max": 3, "typical": 0.5},
            "phosphorus": {"min": 0, "max": 0.5, "typical": 0.1},
            "sulfur": {"min": 0, "max": 0.05, "typical": 0.01},
            "chromium": {"min": 0, "max": 1, "typical": 0.2},
            "nickel": {"min": 0, "max": 30, "typical": 5},
            "molybdenum": {"min": 0, "max": 0, "typical": 0},
            "copper": {"min": 55, "max": 100, "typical": 85},
            "vanadium": {"min": 0, "max": 0, "typical": 0},
            "tungsten": {"min": 0, "max": 0, "typical": 0},
            "cobalt": {"min": 0, "max": 0, "typical": 0},
            "titanium": {"min": 0, "max": 0, "typical": 0},
            "aluminum": {"min": 0, "max": 11, "typical": 2},
            "nitrogen": {"min": 0, "max": 0, "typical": 0},
            "iron": {"min": 0, "max": 5, "typical": 1}
        },
        "physical": {
            "density": 8900,
            "melting_point": {"solidus": 900, "liquidus": 1050},
            "specific_heat": 385,
            "thermal_conductivity": 250.0,
            "thermal_expansion": 1.7e-5,
            "electrical_resistivity": 1.7e-8,
            "magnetic_permeability": 1.0,
            "poissons_ratio": 0.34,
            "elastic_modulus": 117000,
            "shear_modulus": 44000
        },
        "mechanical": {
            "hardness": {"brinell": 80, "rockwell_c": None, "vickers": 85},
            "tensile_strength": {"typical": 350},
            "yield_strength": {"typical": 120},
            "elongation": {"typical": 35},
            "reduction_of_area": {"typical": 60},
            "impact_energy": {"joules": 80, "temperature": 20},
            "fatigue_strength": 100,
            "fracture_toughness": 80
        },
        "chip_formation": {
            "chip_type": "continuous_ductile",
            "serration_tendency": "very_low",
            "built_up_edge_tendency": "high",
            "chip_breaking": "poor",
            "optimal_chip_thickness": 0.08,
            "shear_angle": 35,
            "friction_coefficient": 0.5,
            "chip_compression_ratio": 3.0
        },
        "tribology": {
            "sliding_friction": 0.45,
            "adhesion_tendency": "high",
            "galling_tendency": "moderate",
            "welding_temperature": 700,
            "oxide_stability": "moderate",
            "lubricity_response": "good"
        },
        "thermal_machining": {
            "cutting_temperature_coefficient": 0.6,
            "heat_partition_to_chip": 0.80,
            "heat_partition_to_tool": 0.10,
            "heat_partition_to_workpiece": 0.10,
            "thermal_softening_onset": 250,
            "recrystallization_temperature": 400,
            "hot_hardness_retention": "poor",
            "thermal_shock_sensitivity": "low"
        },
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 0.4, "Ra_typical": 0.8, "Ra_max": 1.6},
            "residual_stress_tendency": "compressive",
            "white_layer_tendency": "none",
            "work_hardening_depth": 0.04,
            "microstructure_stability": "good",
            "burr_formation": "high",
            "surface_defect_sensitivity": "low",
            "polishability": "excellent"
        },
        "machinability": {
            "aisi_rating": 80,
            "relative_to_1212": 0.80
        },
        "recommendations": {
            "turning": {
                "speed": {"min": 150, "max": 400, "optimal": 250},
                "feed": {"min": 0.1, "max": 0.4, "optimal": 0.2},
                "doc": {"min": 0.5, "max": 4.0, "optimal": 2.0}
            },
            "milling": {
                "speed": {"min": 120, "max": 350, "optimal": 200},
                "feed_per_tooth": {"min": 0.06, "max": 0.15, "optimal": 0.1}
            },
            "drilling": {
                "speed": {"min": 80, "max": 200, "optimal": 120},
                "feed": {"min": 0.08, "max": 0.25, "optimal": 0.15}
            },
            "threading": {
                "speed": {"min": 40, "max": 100, "optimal": 60}
            }
        }
    },
    
    "polymer": {
        "iso_group": "X",
        "material_class": "Engineering Polymer",
        "composition": {
            "carbon": {"min": 0, "max": 0, "typical": 0},
            "manganese": {"min": 0, "max": 0, "typical": 0},
            "silicon": {"min": 0, "max": 0, "typical": 0},
            "phosphorus": {"min": 0, "max": 0, "typical": 0},
            "sulfur": {"min": 0, "max": 0, "typical": 0},
            "chromium": {"min": 0, "max": 0, "typical": 0},
            "nickel": {"min": 0, "max": 0, "typical": 0},
            "molybdenum": {"min": 0, "max": 0, "typical": 0},
            "copper": {"min": 0, "max": 0, "typical": 0},
            "vanadium": {"min": 0, "max": 0, "typical": 0},
            "tungsten": {"min": 0, "max": 0, "typical": 0},
            "cobalt": {"min": 0, "max": 0, "typical": 0},
            "titanium": {"min": 0, "max": 0, "typical": 0},
            "aluminum": {"min": 0, "max": 0, "typical": 0},
            "nitrogen": {"min": 0, "max": 0, "typical": 0},
            "iron": {"min": 0, "max": 0, "typical": 0}
        },
        "physical": {
            "density": 1400,
            "melting_point": {"solidus": 180, "liquidus": 280},
            "specific_heat": 1500,
            "thermal_conductivity": 0.25,
            "thermal_expansion": 8.0e-5,
            "electrical_resistivity": 1.0e14,
            "magnetic_permeability": 1.0,
            "poissons_ratio": 0.40,
            "elastic_modulus": 3000,
            "shear_modulus": 1100
        },
        "mechanical": {
            "hardness": {"brinell": 20, "rockwell_c": None, "vickers": 22},
            "tensile_strength": {"typical": 70},
            "yield_strength": {"typical": 60},
            "elongation": {"typical": 50},
            "reduction_of_area": {"typical": 40},
            "impact_energy": {"joules": 50, "temperature": 20},
            "fatigue_strength": 25,
            "fracture_toughness": 3
        },
        "chip_formation": {
            "chip_type": "continuous_stringy",
            "serration_tendency": "low",
            "built_up_edge_tendency": "high",
            "chip_breaking": "poor",
            "optimal_chip_thickness": 0.05,
            "shear_angle": 40,
            "friction_coefficient": 0.35,
            "chip_compression_ratio": 1.5
        },
        "tribology": {
            "sliding_friction": 0.30,
            "adhesion_tendency": "moderate",
            "galling_tendency": "very_low",
            "welding_temperature": 150,
            "oxide_stability": "good",
            "lubricity_response": "good"
        },
        "thermal_machining": {
            "cutting_temperature_coefficient": 0.3,
            "heat_partition_to_chip": 0.90,
            "heat_partition_to_tool": 0.05,
            "heat_partition_to_workpiece": 0.05,
            "thermal_softening_onset": 80,
            "recrystallization_temperature": 120,
            "hot_hardness_retention": "very_poor",
            "thermal_shock_sensitivity": "low"
        },
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 0.2, "Ra_typical": 0.5, "Ra_max": 1.5},
            "residual_stress_tendency": "compressive",
            "white_layer_tendency": "none",
            "work_hardening_depth": 0,
            "microstructure_stability": "sensitive",
            "burr_formation": "high",
            "surface_defect_sensitivity": "high",
            "polishability": "excellent"
        },
        "machinability": {
            "aisi_rating": 500,
            "relative_to_1212": 5.0
        },
        "recommendations": {
            "turning": {
                "speed": {"min": 200, "max": 600, "optimal": 400},
                "feed": {"min": 0.05, "max": 0.2, "optimal": 0.1},
                "doc": {"min": 0.3, "max": 3.0, "optimal": 1.0}
            },
            "milling": {
                "speed": {"min": 150, "max": 500, "optimal": 300},
                "feed_per_tooth": {"min": 0.03, "max": 0.1, "optimal": 0.05}
            },
            "drilling": {
                "speed": {"min": 100, "max": 300, "optimal": 180},
                "feed": {"min": 0.03, "max": 0.12, "optimal": 0.06}
            },
            "threading": {
                "speed": {"min": 30, "max": 100, "optimal": 60}
            }
        }
    },
    
    "default": {
        "iso_group": "X",
        "material_class": "Generic Material",
        "composition": {
            "carbon": {"min": 0, "max": 0.5, "typical": 0.1},
            "manganese": {"min": 0, "max": 1, "typical": 0.3},
            "silicon": {"min": 0, "max": 0.5, "typical": 0.2},
            "phosphorus": {"min": 0, "max": 0.05, "typical": 0.02},
            "sulfur": {"min": 0, "max": 0.05, "typical": 0.02},
            "chromium": {"min": 0, "max": 5, "typical": 1},
            "nickel": {"min": 0, "max": 5, "typical": 1},
            "molybdenum": {"min": 0, "max": 1, "typical": 0.2},
            "copper": {"min": 0, "max": 1, "typical": 0.2},
            "vanadium": {"min": 0, "max": 0.2, "typical": 0.05},
            "tungsten": {"min": 0, "max": 1, "typical": 0.1},
            "cobalt": {"min": 0, "max": 1, "typical": 0.1},
            "titanium": {"min": 0, "max": 1, "typical": 0.1},
            "aluminum": {"min": 0, "max": 5, "typical": 0.5},
            "nitrogen": {"min": 0, "max": 0.05, "typical": 0.01},
            "iron": {"min": 50, "max": 100, "typical": 80}
        },
        "physical": {
            "density": 7000,
            "melting_point": {"solidus": 1200, "liquidus": 1400},
            "specific_heat": 500,
            "thermal_conductivity": 40.0,
            "thermal_expansion": 1.2e-5,
            "electrical_resistivity": 5.0e-7,
            "magnetic_permeability": 100,
            "poissons_ratio": 0.30,
            "elastic_modulus": 180000,
            "shear_modulus": 70000
        },
        "mechanical": {
            "hardness": {"brinell": 150, "rockwell_c": None, "vickers": 158},
            "tensile_strength": {"typical": 500},
            "yield_strength": {"typical": 350},
            "elongation": {"typical": 15},
            "reduction_of_area": {"typical": 40},
            "impact_energy": {"joules": 50, "temperature": 20},
            "fatigue_strength": 200,
            "fracture_toughness": 80
        },
        "chip_formation": {
            "chip_type": "continuous",
            "serration_tendency": "moderate",
            "built_up_edge_tendency": "moderate",
            "chip_breaking": "moderate",
            "optimal_chip_thickness": 0.1,
            "shear_angle": 30,
            "friction_coefficient": 0.5,
            "chip_compression_ratio": 2.5
        },
        "tribology": {
            "sliding_friction": 0.45,
            "adhesion_tendency": "moderate",
            "galling_tendency": "moderate",
            "welding_temperature": 1000,
            "oxide_stability": "moderate",
            "lubricity_response": "moderate"
        },
        "thermal_machining": {
            "cutting_temperature_coefficient": 0.9,
            "heat_partition_to_chip": 0.70,
            "heat_partition_to_tool": 0.15,
            "heat_partition_to_workpiece": 0.15,
            "thermal_softening_onset": 400,
            "recrystallization_temperature": 600,
            "hot_hardness_retention": "moderate",
            "thermal_shock_sensitivity": "moderate"
        },
        "surface_integrity": {
            "achievable_roughness": {"Ra_min": 0.8, "Ra_typical": 1.6, "Ra_max": 3.2},
            "residual_stress_tendency": "variable",
            "white_layer_tendency": "low",
            "work_hardening_depth": 0.1,
            "microstructure_stability": "moderate",
            "burr_formation": "moderate",
            "surface_defect_sensitivity": "moderate",
            "polishability": "moderate"
        },
        "machinability": {
            "aisi_rating": 60,
            "relative_to_1212": 0.60
        },
        "recommendations": {
            "turning": {
                "speed": {"min": 100, "max": 250, "optimal": 160},
                "feed": {"min": 0.1, "max": 0.35, "optimal": 0.2},
                "doc": {"min": 0.5, "max": 4.0, "optimal": 2.0}
            },
            "milling": {
                "speed": {"min": 80, "max": 200, "optimal": 130},
                "feed_per_tooth": {"min": 0.06, "max": 0.15, "optimal": 0.1}
            },
            "drilling": {
                "speed": {"min": 50, "max": 120, "optimal": 80},
                "feed": {"min": 0.08, "max": 0.25, "optimal": 0.15}
            },
            "threading": {
                "speed": {"min": 25, "max": 70, "optimal": 45}
            }
        }
    }
}

# =============================================================================
# HELPER FUNCTIONS  
# =============================================================================

def get_material_class(iso_group, name=None):
    """Determine material class from ISO group and name"""
    iso_map = {
        "P": "steel", "M": "stainless", "K": "cast_iron",
        "N": "aluminum", "S": "superalloy", "H": "steel", "X": "default"
    }
    mat_class = iso_map.get(iso_group, "default")
    
    if name:
        name_lower = name.lower()
        if "titanium" in name_lower or "ti-" in name_lower or "ti " in name_lower:
            mat_class = "titanium"
        elif any(x in name_lower for x in ["inconel", "hastelloy", "waspaloy", "rene"]):
            mat_class = "superalloy"
        elif any(x in name_lower for x in ["copper", "bronze", "brass", "beryllium"]):
            mat_class = "copper"
        elif "polymer" in name_lower or "plastic" in name_lower or "nylon" in name_lower:
            mat_class = "polymer"
        elif "rubber" in name_lower or "elastomer" in name_lower:
            mat_class = "polymer"
        elif "composite" in name_lower or "cfrp" in name_lower or "gfrp" in name_lower:
            mat_class = "polymer"
    
    return mat_class

def deep_merge(base, overlay):
    """Deep merge overlay into base, filling only missing values"""
    result = copy.deepcopy(base)
    for key, value in overlay.items():
        if key not in result or result[key] is None:
            result[key] = copy.deepcopy(value)
        elif isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
    return result

def fill_missing(material, defaults, category):
    """Fill missing values in a category from defaults"""
    if category not in material:
        material[category] = {}
    
    if category not in defaults:
        return 0
    
    changes = 0
    default_data = defaults[category]
    mat_data = material[category]
    
    if isinstance(default_data, dict):
        for key, value in default_data.items():
            if key not in mat_data or mat_data[key] is None:
                mat_data[key] = copy.deepcopy(value)
                changes += 1
            elif isinstance(value, dict) and isinstance(mat_data.get(key), dict):
                for subkey, subvalue in value.items():
                    if subkey not in mat_data[key] or mat_data[key][subkey] is None:
                        mat_data[key][subkey] = subvalue
                        changes += 1
    
    return changes

# =============================================================================
# PARALLEL ENHANCEMENT
# =============================================================================

def enhance_material_complete(material):
    """Enhance a single material with ALL missing parameters"""
    iso = material.get("iso_group", "P")
    name = material.get("name", "")
    mat_class = get_material_class(iso, name)
    defaults = DEFAULTS.get(mat_class, DEFAULTS["default"])
    
    total_changes = 0
    
    # Fill all categories
    categories = [
        "composition", "physical", "mechanical", "chip_formation",
        "tribology", "thermal_machining", "surface_integrity",
        "machinability", "recommendations"
    ]
    
    for category in categories:
        changes = fill_missing(material, defaults, category)
        total_changes += changes
    
    # Mark enhancement
    if total_changes > 0:
        if "_complete_enhancement" not in material:
            material["_complete_enhancement"] = {
                "timestamp": datetime.now().isoformat(),
                "changes": total_changes,
                "class": mat_class
            }
        else:
            material["_complete_enhancement"]["changes"] += total_changes
            material["_complete_enhancement"]["timestamp"] = datetime.now().isoformat()
    
    return material, total_changes

def process_file(args):
    """Process a single file"""
    json_file, output_dir = args
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        if not materials:
            return {"file": json_file.name, "processed": 0, "changes": 0}
        
        total_changes = 0
        for i, material in enumerate(materials):
            enhanced, changes = enhance_material_complete(material)
            materials[i] = enhanced
            total_changes += changes
        
        if total_changes > 0:
            data["_enhancement_iteration"] = datetime.now().isoformat()
            with open(output_dir / json_file.name, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return {"file": json_file.name, "processed": len(materials), "changes": total_changes}
        
    except Exception as e:
        return {"file": json_file.name, "error": str(e), "processed": 0, "changes": 0}

# =============================================================================
# AUDIT FUNCTION
# =============================================================================

def quick_audit(base_path):
    """Quick audit to check coverage"""
    categories = [
        "identification", "composition", "physical", "mechanical",
        "kienzle", "johnson_cook", "taylor", "chip_formation",
        "tribology", "thermal_machining", "surface_integrity",
        "machinability", "recommendations"
    ]
    
    param_counts = {
        "identification": 6, "composition": 16, "physical": 10,
        "mechanical": 8, "kienzle": 2, "johnson_cook": 8, "taylor": 2,
        "chip_formation": 8, "tribology": 6, "thermal_machining": 8,
        "surface_integrity": 8, "machinability": 2, "recommendations": 4
    }
    
    totals = {cat: {"filled": 0, "total": 0} for cat in categories}
    material_count = 0
    
    iso_dirs = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    for iso_dir in iso_dirs:
        dir_path = Path(base_path) / iso_dir
        if not dir_path.exists():
            continue
            
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_") or json_file.name == "index.json":
                continue
                
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                materials = data.get("materials", [])
                for material in materials:
                    material_count += 1
                    
                    for cat in categories:
                        expected = param_counts[cat]
                        totals[cat]["total"] += expected
                        
                        if cat == "identification":
                            section = material
                        else:
                            section = material.get(cat, {})
                        
                        if isinstance(section, dict):
                            filled = sum(1 for k, v in section.items() 
                                       if v is not None and k in param_counts.get(cat, []) or 
                                       (isinstance(v, dict) and any(sv is not None for sv in v.values())))
                            # Simplified count
                            filled = min(len([k for k, v in section.items() if v is not None and not k.startswith("_")]), expected)
                            totals[cat]["filled"] += filled
                            
            except Exception:
                pass
    
    # Calculate overall
    total_filled = sum(t["filled"] for t in totals.values())
    total_params = sum(t["total"] for t in totals.values())
    overall = total_filled / total_params * 100 if total_params > 0 else 0
    
    return overall, totals, material_count

# =============================================================================
# MAIN LOOP
# =============================================================================

def run_enhancement_loop():
    """Run enhancement iterations until target coverage reached"""
    
    print("=" * 80)
    print("    PRISM COMPLETE MATERIALS ENHANCEMENT ENGINE v2.0")
    print(f"    Target: {TARGET_COVERAGE}% | Workers: {NUM_WORKERS} | Max Iterations: {MAX_ITERATIONS}")
    print("=" * 80)
    
    base_path = PRISM_ROOT / "materials"
    
    for iteration in range(1, MAX_ITERATIONS + 1):
        print(f"\n{'='*60}")
        print(f"ITERATION {iteration}")
        print(f"{'='*60}")
        
        # Prepare file list
        file_tasks = []
        iso_dirs = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
        
        for iso_dir in iso_dirs:
            src_dir = base_path / iso_dir
            if not src_dir.exists():
                continue
            
            for json_file in src_dir.glob("*.json"):
                if json_file.name.startswith("_") or json_file.name == "index.json":
                    continue
                file_tasks.append((json_file, src_dir))  # Write in place
        
        print(f"Processing {len(file_tasks)} files with {NUM_WORKERS} workers...")
        
        # Process in parallel
        total_changes = 0
        start_time = datetime.now()
        
        with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            futures = {executor.submit(process_file, task): task for task in file_tasks}
            
            for future in as_completed(futures):
                result = future.result()
                total_changes += result.get("changes", 0)
        
        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"  Changes made: {total_changes} in {elapsed:.1f}s")
        
        # Quick audit
        coverage, by_cat, mat_count = quick_audit(base_path)
        print(f"  Current coverage: {coverage:.1f}%")
        
        # Show category breakdown
        print("\n  Category coverage:")
        for cat, data in by_cat.items():
            pct = data["filled"] / data["total"] * 100 if data["total"] > 0 else 0
            bar = "#" * int(pct / 5)
            print(f"    {cat:20s}: {pct:5.1f}% {bar}")
        
        # Check if target reached
        if coverage >= TARGET_COVERAGE:
            print(f"\n{'='*60}")
            print(f"TARGET REACHED! {coverage:.1f}% >= {TARGET_COVERAGE}%")
            print(f"{'='*60}")
            break
        
        if total_changes == 0:
            print(f"\n  No more changes possible. Final coverage: {coverage:.1f}%")
            break
    
    # Final summary
    print("\n" + "=" * 80)
    print("ENHANCEMENT COMPLETE")
    print("=" * 80)
    
    final_coverage, final_cats, final_count = quick_audit(base_path)
    print(f"Final coverage: {final_coverage:.1f}%")
    print(f"Total materials: {final_count}")
    
    return final_coverage

if __name__ == "__main__":
    final = run_enhancement_loop()
