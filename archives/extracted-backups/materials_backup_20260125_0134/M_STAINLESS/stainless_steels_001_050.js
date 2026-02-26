/**
 * PRISM MATERIALS DATABASE - Stainless Steels
 * File: stainless_steels_001_050.js
 * Materials: M-SS-001 through M-SS-050 (50 materials)
 * 
 * ISO Category: M (Stainless Steels)
 * 
 * SUBTYPES:
 * - 300 Series Austenitic (301-347, including free machining 303)
 * - 400 Series Ferritic (405, 409, 430, 434, 439, 444)
 * - 400 Series Martensitic (403, 410, 416, 420, 431, 440A/B/C)
 * - Precipitation Hardening (15-5PH, 17-4PH, 17-7PH, PH13-8Mo)
 * - Duplex (2205, 2507, LDX2101)
 * - Super Austenitic (254SMO, AL-6XN, 904L, Alloy 20)
 * - Specialty (Nitronic 50/60)
 * 
 * MACHINING KEY:
 * - Austenitic: SEVERE work hardening - maintain constant feed
 * - Free machining (303, 416, 430F): Much easier
 * - PH grades: Machine before aging
 * - Duplex: Reduce speeds 20-30% vs austenitic
 * 
 * Parameters per material: 127+
 * Schema version: 3.0.0
 * 
 * Generated: 2026-01-24 18:28:21
 * Generator: PRISM Master Materials Generator v3.0
 */

const STAINLESS_STEELS_001_050 = {
  metadata: {
    file: "stainless_steels_001_050.js",
    category: "M_STAINLESS",
    materialCount: 50,
    idRange: { start: "M-SS-001", end: "M-SS-050" },
    schemaVersion: "3.0.0",
    created: "2026-01-24",
    lastUpdated: "2026-01-24"
  },

  materials: {
    // ======================================================================
    // M-SS-001: AISI 301 Austenitic
    // ======================================================================
    "M-SS-001": {
          "id": "M-SS-001",
          "name": "AISI 301 Austenitic",
          "designation": {
                "aisi_sae": "301",
                "uns": "S30100",
                "din": "1.4310",
                "jis": "SUS301",
                "en": "X10CrNi18-8"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 6.0,
                      "max": 8.0,
                      "typical": 7.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7925,
                "melting_point": {
                      "solidus": 1379,
                      "liquidus": 1434
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.2,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 185,
                      "rockwell_b": 108,
                      "rockwell_c": null,
                      "vickers": 194
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 206,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 310,
                "B": 1000,
                "C": 0.07,
                "n": 0.65,
                "m": 1.0,
                "melting_temp": 1434,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 120,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.125,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 71,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 29,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "FAIR",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-002: AISI 302 Austenitic
    // ======================================================================
    "M-SS-002": {
          "id": "M-SS-002",
          "name": "AISI 302 Austenitic",
          "designation": {
                "aisi_sae": "302",
                "uns": "S30200",
                "din": "1.4319",
                "jis": "SUS302",
                "en": "X12CrNi18-9"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "chromium": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.0
                },
                "nickel": {
                      "min": 8.0,
                      "max": 10.0,
                      "typical": 9.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7935,
                "melting_point": {
                      "solidus": 1373,
                      "liquidus": 1428
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.2,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 185,
                      "rockwell_b": 108,
                      "rockwell_c": null,
                      "vickers": 194
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 206,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 310,
                "B": 1000,
                "C": 0.07,
                "n": 0.65,
                "m": 1.0,
                "melting_temp": 1428,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 120,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.125,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 71,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 29,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "FAIR",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-003: AISI 303 Free Machining
    // ======================================================================
    "M-SS-003": {
          "id": "M-SS-003",
          "name": "AISI 303 Free Machining",
          "designation": {
                "aisi_sae": "303",
                "uns": "S30300",
                "din": "1.4305",
                "jis": "SUS303",
                "en": "X8CrNiS18-9"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic Fm",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "chromium": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.0
                },
                "nickel": {
                      "min": 8.0,
                      "max": 10.0,
                      "typical": 9.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7935,
                "melting_point": {
                      "solidus": 1373,
                      "liquidus": 1428
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.2,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 185,
                      "rockwell_b": 108,
                      "rockwell_c": null,
                      "vickers": 194
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 206,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 1850,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic_fm"
          },
          "johnson_cook": {
                "A": 300,
                "B": 950,
                "C": 0.06,
                "n": 0.6,
                "m": 1.0,
                "melting_temp": 1428,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 180,
                "n": 0.24,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "moderate",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 78,
                "relative_to_1212": 0.78,
                "power_factor": 0.9600000000000001,
                "tool_wear_factor": 0.72,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 56,
                            "optimal": 94,
                            "max": 138,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 47,
                            "optimal": 81,
                            "max": 125,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 21,
                            "optimal": 37,
                            "max": 55,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Best machining austenitic - sulfur added"
    },

    // ======================================================================
    // M-SS-004: AISI 304 (18-8)
    // ======================================================================
    "M-SS-004": {
          "id": "M-SS-004",
          "name": "AISI 304 (18-8)",
          "designation": {
                "aisi_sae": "304",
                "uns": "S30400",
                "din": "1.4301",
                "jis": "SUS304",
                "en": "X5CrNi18-10"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 18.0,
                      "max": 20.0,
                      "typical": 18.5
                },
                "nickel": {
                      "min": 8.0,
                      "max": 10.5,
                      "typical": 9.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7935,
                "melting_point": {
                      "solidus": 1373,
                      "liquidus": 1428
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.2,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 170,
                      "rockwell_b": 100,
                      "rockwell_c": null,
                      "vickers": 178
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 206,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 310,
                "B": 1000,
                "C": 0.07,
                "n": 0.65,
                "m": 1.0,
                "melting_temp": 1428,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 120,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.125,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 71,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 29,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "GOOD",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Most widely used stainless steel"
    },

    // ======================================================================
    // M-SS-005: AISI 304L Low Carbon
    // ======================================================================
    "M-SS-005": {
          "id": "M-SS-005",
          "name": "AISI 304L Low Carbon",
          "designation": {
                "aisi_sae": "304L",
                "uns": "S30403",
                "din": "1.4307",
                "jis": "SUS304L",
                "en": "X2CrNi18-9"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "chromium": {
                      "min": 18.0,
                      "max": 20.0,
                      "typical": 18.5
                },
                "nickel": {
                      "min": 8.0,
                      "max": 12.0,
                      "typical": 10.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7940,
                "melting_point": {
                      "solidus": 1370,
                      "liquidus": 1425
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.2,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 160,
                      "rockwell_b": 95,
                      "rockwell_c": null,
                      "vickers": 168
                },
                "tensile_strength": {
                      "min": 435,
                      "typical": 485,
                      "max": 535
                },
                "yield_strength": {
                      "min": 135,
                      "typical": 170,
                      "max": 205
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 194,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 280,
                "B": 980,
                "C": 0.07,
                "n": 0.64,
                "m": 1.0,
                "melting_temp": 1425,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 125,
                "n": 0.19,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.125,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 71,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 29,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "EXCELLENT",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Low carbon for welding"
    },

    // ======================================================================
    // M-SS-006: AISI 309 High Temp
    // ======================================================================
    "M-SS-006": {
          "id": "M-SS-006",
          "name": "AISI 309 High Temp",
          "designation": {
                "aisi_sae": "309",
                "uns": "S30900",
                "din": "1.4828",
                "jis": "SUS309S",
                "en": "X15CrNiSi20-12"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.2,
                      "typical": 0.1
                },
                "chromium": {
                      "min": 22.0,
                      "max": 24.0,
                      "typical": 23.0
                },
                "nickel": {
                      "min": 12.0,
                      "max": 15.0,
                      "typical": 13.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7957,
                "melting_point": {
                      "solidus": 1359,
                      "liquidus": 1414
                },
                "specific_heat": 500,
                "thermal_conductivity": 15.6,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 185,
                      "rockwell_b": 108,
                      "rockwell_c": null,
                      "vickers": 194
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 206,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 340,
                "B": 1100,
                "C": 0.06,
                "n": 0.68,
                "m": 1.0,
                "melting_temp": 1414,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 105,
                "n": 0.16,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 38,
                "relative_to_1212": 0.38,
                "power_factor": 1.1600000000000001,
                "tool_wear_factor": 1.12,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 40,
                            "optimal": 66,
                            "max": 98,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 57,
                            "max": 89,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "FAIR",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Oxidation resistant to 1000C"
    },

    // ======================================================================
    // M-SS-007: AISI 310 Heat Resistant
    // ======================================================================
    "M-SS-007": {
          "id": "M-SS-007",
          "name": "AISI 310 Heat Resistant",
          "designation": {
                "aisi_sae": "310",
                "uns": "S31000",
                "din": "1.4845",
                "jis": "SUS310S",
                "en": "X8CrNi25-21"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.15
                },
                "chromium": {
                      "min": 24.0,
                      "max": 26.0,
                      "typical": 25.0
                },
                "nickel": {
                      "min": 19.0,
                      "max": 22.0,
                      "typical": 20.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7992,
                "melting_point": {
                      "solidus": 1338,
                      "liquidus": 1393
                },
                "specific_heat": 500,
                "thermal_conductivity": 14.2,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 190,
                      "rockwell_b": 110,
                      "rockwell_c": null,
                      "vickers": 199
                },
                "tensile_strength": {
                      "min": 470,
                      "typical": 520,
                      "max": 570
                },
                "yield_strength": {
                      "min": 175,
                      "typical": 210,
                      "max": 245
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 208,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2400,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 350,
                "B": 1150,
                "C": 0.06,
                "n": 0.7,
                "m": 1.0,
                "melting_temp": 1393,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 100,
                "n": 0.15,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35,
                "power_factor": 1.175,
                "tool_wear_factor": 1.15,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 64,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 56,
                            "max": 86,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 26,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "FAIR",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Oxidation resistant to 1150C"
    },

    // ======================================================================
    // M-SS-008: AISI 316 Molybdenum
    // ======================================================================
    "M-SS-008": {
          "id": "M-SS-008",
          "name": "AISI 316 Molybdenum",
          "designation": {
                "aisi_sae": "316",
                "uns": "S31600",
                "din": "1.4401",
                "jis": "SUS316",
                "en": "X5CrNiMo17-12-2"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 10.0,
                      "max": 14.0,
                      "typical": 12.0
                },
                "molybdenum": {
                      "min": 2.0,
                      "max": 3.0,
                      "typical": 2.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7987,
                "melting_point": {
                      "solidus": 1351,
                      "liquidus": 1406
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.4,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 170,
                      "rockwell_b": 100,
                      "rockwell_c": null,
                      "vickers": 178
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 206,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 305,
                "B": 1161,
                "C": 0.01,
                "n": 0.61,
                "m": 1.0,
                "melting_temp": 1406,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 110,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 36,
                "relative_to_1212": 0.36,
                "power_factor": 1.1700000000000002,
                "tool_wear_factor": 1.1400000000000001,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 65,
                            "max": 96,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 56,
                            "max": 87,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 27,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "GOOD",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Mo for pitting resistance - marine/chemical"
    },

    // ======================================================================
    // M-SS-009: AISI 316L Low Carbon
    // ======================================================================
    "M-SS-009": {
          "id": "M-SS-009",
          "name": "AISI 316L Low Carbon",
          "designation": {
                "aisi_sae": "316L",
                "uns": "S31603",
                "din": "1.4404",
                "jis": "SUS316L",
                "en": "X2CrNiMo17-12-2"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 10.0,
                      "max": 14.0,
                      "typical": 12.0
                },
                "molybdenum": {
                      "min": 2.0,
                      "max": 3.0,
                      "typical": 2.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7987,
                "melting_point": {
                      "solidus": 1351,
                      "liquidus": 1406
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.4,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 160,
                      "rockwell_b": 95,
                      "rockwell_c": null,
                      "vickers": 168
                },
                "tensile_strength": {
                      "min": 435,
                      "typical": 485,
                      "max": 535
                },
                "yield_strength": {
                      "min": 135,
                      "typical": 170,
                      "max": 205
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 194,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 290,
                "B": 1120,
                "C": 0.01,
                "n": 0.6,
                "m": 1.0,
                "melting_temp": 1406,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 115,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 36,
                "relative_to_1212": 0.36,
                "power_factor": 1.1700000000000002,
                "tool_wear_factor": 1.1400000000000001,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 65,
                            "max": 96,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 56,
                            "max": 87,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 27,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "EXCELLENT",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Low carbon 316 for welding"
    },

    // ======================================================================
    // M-SS-010: AISI 316Ti Stabilized
    // ======================================================================
    "M-SS-010": {
          "id": "M-SS-010",
          "name": "AISI 316Ti Stabilized",
          "designation": {
                "aisi_sae": "316Ti",
                "uns": "S31635",
                "din": "1.4571",
                "jis": "SUS316Ti",
                "en": "X6CrNiMoTi17-12-2"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 10.0,
                      "max": 14.0,
                      "typical": 12.0
                },
                "molybdenum": {
                      "min": 2.0,
                      "max": 3.0,
                      "typical": 2.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.5
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7987,
                "melting_point": {
                      "solidus": 1351,
                      "liquidus": 1406
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.4,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 470,
                      "typical": 520,
                      "max": 570
                },
                "yield_strength": {
                      "min": 180,
                      "typical": 215,
                      "max": 250
                },
                "elongation": {
                      "min": 27,
                      "typical": 35,
                      "max": 40
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 208,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 315,
                "B": 1180,
                "C": 0.01,
                "n": 0.62,
                "m": 1.0,
                "melting_temp": 1406,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 108,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 34,
                "relative_to_1212": 0.34,
                "power_factor": 1.1800000000000002,
                "tool_wear_factor": 1.16,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 38,
                            "optimal": 63,
                            "max": 94,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 31,
                            "optimal": 55,
                            "max": 85,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 26,
                            "max": 39,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "GOOD",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-011: AISI 317 High Mo
    // ======================================================================
    "M-SS-011": {
          "id": "M-SS-011",
          "name": "AISI 317 High Mo",
          "designation": {
                "aisi_sae": "317",
                "uns": "S31700",
                "din": "1.4449",
                "jis": "SUS317",
                "en": "X5CrNiMo17-13-3"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 18.0,
                      "max": 20.0,
                      "typical": 19.0
                },
                "nickel": {
                      "min": 11.0,
                      "max": 15.0,
                      "typical": 13.0
                },
                "molybdenum": {
                      "min": 3.0,
                      "max": 4.0,
                      "typical": 3.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 8007,
                "melting_point": {
                      "solidus": 1343,
                      "liquidus": 1398
                },
                "specific_heat": 500,
                "thermal_conductivity": 12.8,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 470,
                      "typical": 520,
                      "max": 570
                },
                "yield_strength": {
                      "min": 175,
                      "typical": 210,
                      "max": 245
                },
                "elongation": {
                      "min": 27,
                      "typical": 35,
                      "max": 40
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 208,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2250,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 320,
                "B": 1200,
                "C": 0.01,
                "n": 0.63,
                "m": 1.0,
                "melting_temp": 1398,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 105,
                "n": 0.16,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 32,
                "relative_to_1212": 0.32,
                "power_factor": 1.1900000000000002,
                "tool_wear_factor": 1.18,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 62,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 31,
                            "optimal": 54,
                            "max": 83,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 26,
                            "max": 39,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "GOOD",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-012: AISI 321 Ti Stabilized
    // ======================================================================
    "M-SS-012": {
          "id": "M-SS-012",
          "name": "AISI 321 Ti Stabilized",
          "designation": {
                "aisi_sae": "321",
                "uns": "S32100",
                "din": "1.4541",
                "jis": "SUS321",
                "en": "X6CrNiTi18-10"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.0
                },
                "nickel": {
                      "min": 9.0,
                      "max": 12.0,
                      "typical": 10.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.5
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7942,
                "melting_point": {
                      "solidus": 1368,
                      "liquidus": 1423
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.1,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 470,
                      "typical": 520,
                      "max": 570
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 208,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 315,
                "B": 1050,
                "C": 0.06,
                "n": 0.64,
                "m": 1.0,
                "melting_temp": 1423,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 115,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 40,
                "relative_to_1212": 0.4,
                "power_factor": 1.1500000000000001,
                "tool_wear_factor": 1.1,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 68,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 59,
                            "max": 91,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "GOOD",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Aerospace exhaust systems"
    },

    // ======================================================================
    // M-SS-013: AISI 347 Nb Stabilized
    // ======================================================================
    "M-SS-013": {
          "id": "M-SS-013",
          "name": "AISI 347 Nb Stabilized",
          "designation": {
                "aisi_sae": "347",
                "uns": "S34700",
                "din": "1.4550",
                "jis": "SUS347",
                "en": "X6CrNiNb18-10"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.0
                },
                "nickel": {
                      "min": 9.0,
                      "max": 13.0,
                      "typical": 11.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.8
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7945,
                "melting_point": {
                      "solidus": 1367,
                      "liquidus": 1422
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.1,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 470,
                      "typical": 520,
                      "max": 570
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 32,
                      "typical": 40,
                      "max": 45
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 208,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2250,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 320,
                "B": 1080,
                "C": 0.06,
                "n": 0.65,
                "m": 1.0,
                "melting_temp": 1422,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 112,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 38,
                "relative_to_1212": 0.38,
                "power_factor": 1.1600000000000001,
                "tool_wear_factor": 1.12,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 40,
                            "optimal": 66,
                            "max": 98,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 57,
                            "max": 89,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "GOOD",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-014: AISI 405 Ferritic
    // ======================================================================
    "M-SS-014": {
          "id": "M-SS-014",
          "name": "AISI 405 Ferritic",
          "designation": {
                "aisi_sae": "405",
                "uns": "S40500",
                "din": "1.4002",
                "jis": "SUS405",
                "en": "X6CrAl13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 11.5,
                      "max": 14.5,
                      "typical": 13.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0.1,
                      "max": 0.3,
                      "typical": 0.2
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 27.0,
                "thermal_expansion": 1.08e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 160,
                      "rockwell_b": 95,
                      "rockwell_c": null,
                      "vickers": 168
                },
                "tensile_strength": {
                      "min": 365,
                      "typical": 415,
                      "max": 465
                },
                "yield_strength": {
                      "min": 135,
                      "typical": 170,
                      "max": 205
                },
                "elongation": {
                      "min": 17,
                      "typical": 25,
                      "max": 30
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 166,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1650,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ferritic"
          },
          "johnson_cook": {
                "A": 250,
                "B": 550,
                "C": 0.02,
                "n": 0.35,
                "m": 0.9,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 160,
                "n": 0.22,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "none",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.0750000000000002,
                "tool_wear_factor": 0.95,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 47,
                            "optimal": 78,
                            "max": 115,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 31,
                            "max": 47,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-015: AISI 409 Automotive
    // ======================================================================
    "M-SS-015": {
          "id": "M-SS-015",
          "name": "AISI 409 Automotive",
          "designation": {
                "aisi_sae": "409",
                "uns": "S40900",
                "din": "1.4512",
                "jis": "SUS409",
                "en": "X2CrTi12"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.03
                },
                "chromium": {
                      "min": 10.5,
                      "max": 11.75,
                      "typical": 11.5
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.5,
                      "max": 0.75,
                      "typical": 0.65
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 25.0,
                "thermal_expansion": 1.08e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 150,
                      "rockwell_b": 90,
                      "rockwell_c": null,
                      "vickers": 157
                },
                "tensile_strength": {
                      "min": 330,
                      "typical": 380,
                      "max": 430
                },
                "yield_strength": {
                      "min": 135,
                      "typical": 170,
                      "max": 205
                },
                "elongation": {
                      "min": 17,
                      "typical": 25,
                      "max": 30
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 152,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1550,
                "mc": 0.24,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ferritic"
          },
          "johnson_cook": {
                "A": 230,
                "B": 480,
                "C": 0.02,
                "n": 0.32,
                "m": 0.85,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 175,
                "n": 0.24,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "none",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 60,
                "relative_to_1212": 0.6,
                "power_factor": 1.05,
                "tool_wear_factor": 0.9,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 49,
                            "optimal": 82,
                            "max": 120,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 41,
                            "optimal": 71,
                            "max": 109,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 33,
                            "max": 49,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": "Most common automotive exhaust grade"
    },

    // ======================================================================
    // M-SS-016: AISI 430 Standard Ferritic
    // ======================================================================
    "M-SS-016": {
          "id": "M-SS-016",
          "name": "AISI 430 Standard Ferritic",
          "designation": {
                "aisi_sae": "430",
                "uns": "S43000",
                "din": "1.4016",
                "jis": "SUS430",
                "en": "X6Cr17"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.12,
                      "typical": 0.06
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 26.1,
                "thermal_expansion": 1.08e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 165,
                      "rockwell_b": 97,
                      "rockwell_c": null,
                      "vickers": 173
                },
                "tensile_strength": {
                      "min": 400,
                      "typical": 450,
                      "max": 500
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 14,
                      "typical": 22,
                      "max": 27
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 180,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1700,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ferritic"
          },
          "johnson_cook": {
                "A": 280,
                "B": 580,
                "C": 0.02,
                "n": 0.36,
                "m": 0.9,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 155,
                "n": 0.22,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "none",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 54,
                "relative_to_1212": 0.54,
                "power_factor": 1.08,
                "tool_wear_factor": 0.96,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 46,
                            "optimal": 77,
                            "max": 114,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 38,
                            "optimal": 67,
                            "max": 103,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 31,
                            "max": 46,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": "Most widely used ferritic grade"
    },

    // ======================================================================
    // M-SS-017: AISI 430F Free Machining
    // ======================================================================
    "M-SS-017": {
          "id": "M-SS-017",
          "name": "AISI 430F Free Machining",
          "designation": {
                "aisi_sae": "430F",
                "uns": "S43020",
                "din": "1.4104",
                "jis": "SUS430F",
                "en": "X14CrMoS17"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic Fm",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.12,
                      "typical": 0.06
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.6,
                      "typical": 0.3
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7894,
                "melting_point": {
                      "solidus": 1398,
                      "liquidus": 1453
                },
                "specific_heat": 500,
                "thermal_conductivity": 26.0,
                "thermal_expansion": 1.08e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 170,
                      "rockwell_b": 100,
                      "rockwell_c": null,
                      "vickers": 178
                },
                "tensile_strength": {
                      "min": 410,
                      "typical": 460,
                      "max": 510
                },
                "yield_strength": {
                      "min": 205,
                      "typical": 240,
                      "max": 275
                },
                "elongation": {
                      "min": 12,
                      "typical": 20,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 184,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1500,
                "mc": 0.24,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ferritic_fm"
          },
          "johnson_cook": {
                "A": 290,
                "B": 560,
                "C": 0.02,
                "n": 0.34,
                "m": 0.88,
                "melting_temp": 1453,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 200,
                "n": 0.26,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 82,
                "relative_to_1212": 0.82,
                "power_factor": 0.9400000000000001,
                "tool_wear_factor": 0.6799999999999999,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 57,
                            "optimal": 97,
                            "max": 142,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 48,
                            "optimal": 84,
                            "max": 128,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 22,
                            "optimal": 38,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": "Free machining ferritic"
    },

    // ======================================================================
    // M-SS-018: AISI 434 Mo Ferritic
    // ======================================================================
    "M-SS-018": {
          "id": "M-SS-018",
          "name": "AISI 434 Mo Ferritic",
          "designation": {
                "aisi_sae": "434",
                "uns": "S43400",
                "din": "1.4113",
                "jis": "SUS434",
                "en": "X6CrMo17-1"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.12,
                      "typical": 0.06
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0.75,
                      "max": 1.25,
                      "typical": 1.0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7905,
                "melting_point": {
                      "solidus": 1395,
                      "liquidus": 1450
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.5,
                "thermal_expansion": 1.08e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 170,
                      "rockwell_b": 100,
                      "rockwell_c": null,
                      "vickers": 178
                },
                "tensile_strength": {
                      "min": 430,
                      "typical": 480,
                      "max": 530
                },
                "yield_strength": {
                      "min": 240,
                      "typical": 275,
                      "max": 310
                },
                "elongation": {
                      "min": 14,
                      "typical": 22,
                      "max": 27
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 192,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1750,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ferritic"
          },
          "johnson_cook": {
                "A": 300,
                "B": 600,
                "C": 0.02,
                "n": 0.37,
                "m": 0.9,
                "melting_temp": 1450,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 145,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "none",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.1,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 45,
                            "optimal": 75,
                            "max": 110,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 37,
                            "optimal": 65,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 30,
                            "max": 45,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-019: AISI 439 Ti Stabilized
    // ======================================================================
    "M-SS-019": {
          "id": "M-SS-019",
          "name": "AISI 439 Ti Stabilized",
          "designation": {
                "aisi_sae": "439",
                "uns": "S43035",
                "din": "1.4510",
                "jis": "SUS439",
                "en": "X2CrTiNb18"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.2,
                      "max": 1.0,
                      "typical": 0.5
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 26.0,
                "thermal_expansion": 1.08e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 160,
                      "rockwell_b": 95,
                      "rockwell_c": null,
                      "vickers": 168
                },
                "tensile_strength": {
                      "min": 365,
                      "typical": 415,
                      "max": 465
                },
                "yield_strength": {
                      "min": 170,
                      "typical": 205,
                      "max": 240
                },
                "elongation": {
                      "min": 14,
                      "typical": 22,
                      "max": 27
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 166,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1650,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ferritic"
          },
          "johnson_cook": {
                "A": 260,
                "B": 520,
                "C": 0.02,
                "n": 0.34,
                "m": 0.88,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 165,
                "n": 0.23,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "none",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58,
                "power_factor": 1.06,
                "tool_wear_factor": 0.92,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 48,
                            "optimal": 80,
                            "max": 118,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 40,
                            "optimal": 69,
                            "max": 107,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 32,
                            "max": 48,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "EXCELLENT",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-020: AISI 444 Super Ferritic
    // ======================================================================
    "M-SS-020": {
          "id": "M-SS-020",
          "name": "AISI 444 Super Ferritic",
          "designation": {
                "aisi_sae": "444",
                "uns": "S44400",
                "din": "1.4521",
                "jis": "SUS444",
                "en": "X2CrMoTi18-2"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.025,
                      "typical": 0.015
                },
                "chromium": {
                      "min": 17.5,
                      "max": 19.5,
                      "typical": 18.5
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 1.75,
                      "max": 2.5,
                      "typical": 2.0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.1,
                      "max": 0.8,
                      "typical": 0.3
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7920,
                "melting_point": {
                      "solidus": 1390,
                      "liquidus": 1445
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.0,
                "thermal_expansion": 1.08e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 365,
                      "typical": 415,
                      "max": 465
                },
                "yield_strength": {
                      "min": 240,
                      "typical": 275,
                      "max": 310
                },
                "elongation": {
                      "min": 12,
                      "typical": 20,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 166,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1800,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ferritic"
          },
          "johnson_cook": {
                "A": 320,
                "B": 560,
                "C": 0.02,
                "n": 0.36,
                "m": 0.9,
                "melting_temp": 1445,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 135,
                "n": 0.19,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "none",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.125,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 71,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 29,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "EXCELLENT",
                "magnetism": "MAGNETIC"
          },
          "notes": "Equivalent corrosion to 316L"
    },

    // ======================================================================
    // M-SS-021: AISI 403 Turbine
    // ======================================================================
    "M-SS-021": {
          "id": "M-SS-021",
          "name": "AISI 403 Turbine",
          "designation": {
                "aisi_sae": "403",
                "uns": "S40300",
                "din": "1.4000",
                "jis": "SUS403",
                "en": "X6Cr13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "chromium": {
                      "min": 11.5,
                      "max": 13.0,
                      "typical": 12.5
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.9,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 435,
                      "typical": 485,
                      "max": 535
                },
                "yield_strength": {
                      "min": 240,
                      "typical": 275,
                      "max": 310
                },
                "elongation": {
                      "min": 17,
                      "typical": 25,
                      "max": 30
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 194,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1750,
                "mc": 0.24,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 350,
                "B": 650,
                "C": 0.015,
                "n": 0.38,
                "m": 0.95,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52,
                "power_factor": 1.09,
                "tool_wear_factor": 0.98,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 45,
                            "optimal": 76,
                            "max": 112,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 38,
                            "optimal": 66,
                            "max": 101,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 31,
                            "max": 46,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-022: AISI 410 General Purpose
    // ======================================================================
    "M-SS-022": {
          "id": "M-SS-022",
          "name": "AISI 410 General Purpose",
          "designation": {
                "aisi_sae": "410",
                "uns": "S41000",
                "din": "1.4006",
                "jis": "SUS410",
                "en": "X12Cr13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
                },
                "chromium": {
                      "min": 11.5,
                      "max": 13.5,
                      "typical": 12.5
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.9,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 180,
                      "rockwell_b": 105,
                      "rockwell_c": null,
                      "vickers": 189
                },
                "tensile_strength": {
                      "min": 435,
                      "typical": 485,
                      "max": 535
                },
                "yield_strength": {
                      "min": 240,
                      "typical": 275,
                      "max": 310
                },
                "elongation": {
                      "min": 17,
                      "typical": 25,
                      "max": 30
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 194,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1800,
                "mc": 0.24,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 360,
                "B": 680,
                "C": 0.015,
                "n": 0.4,
                "m": 0.95,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 145,
                "n": 0.2,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.1,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 45,
                            "optimal": 75,
                            "max": 110,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 37,
                            "optimal": 65,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 30,
                            "max": 45,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": "Most widely used martensitic grade"
    },

    // ======================================================================
    // M-SS-023: AISI 410 Hardened 40 HRC
    // ======================================================================
    "M-SS-023": {
          "id": "M-SS-023",
          "name": "AISI 410 Hardened 40 HRC",
          "designation": {
                "aisi_sae": "410",
                "uns": "S41000",
                "din": "1.4006",
                "jis": "SUS410",
                "en": "X12Cr13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Q&T 40 HRC",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
                },
                "chromium": {
                      "min": 11.5,
                      "max": 13.5,
                      "typical": 12.5
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.9,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 375,
                      "rockwell_b": null,
                      "rockwell_c": 40,
                      "vickers": 393
                },
                "tensile_strength": {
                      "min": 1190,
                      "typical": 1240,
                      "max": 1290
                },
                "yield_strength": {
                      "min": 1065,
                      "typical": 1100,
                      "max": 1135
                },
                "elongation": {
                      "min": 4,
                      "typical": 12,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 496,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2700,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 1000,
                "B": 850,
                "C": 0.01,
                "n": 0.28,
                "m": 1.05,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 80,
                "n": 0.14,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28,
                "power_factor": 1.2100000000000002,
                "tool_wear_factor": 1.22,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 36,
                            "optimal": 59,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 29,
                            "optimal": 51,
                            "max": 80,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 25,
                            "max": 37,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-024: AISI 416 Free Machining
    // ======================================================================
    "M-SS-024": {
          "id": "M-SS-024",
          "name": "AISI 416 Free Machining",
          "designation": {
                "aisi_sae": "416",
                "uns": "S41600",
                "din": "1.4005",
                "jis": "SUS416",
                "en": "X12CrS13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic Fm",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
                },
                "chromium": {
                      "min": 12.0,
                      "max": 14.0,
                      "typical": 13.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.9,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 180,
                      "rockwell_b": 105,
                      "rockwell_c": null,
                      "vickers": 189
                },
                "tensile_strength": {
                      "min": 435,
                      "typical": 485,
                      "max": 535
                },
                "yield_strength": {
                      "min": 240,
                      "typical": 275,
                      "max": 310
                },
                "elongation": {
                      "min": 12,
                      "typical": 20,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 194,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1550,
                "mc": 0.25,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic_fm"
          },
          "johnson_cook": {
                "A": 340,
                "B": 640,
                "C": 0.018,
                "n": 0.38,
                "m": 0.92,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 210,
                "n": 0.28,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 85,
                "relative_to_1212": 0.85,
                "power_factor": 0.925,
                "tool_wear_factor": 0.6499999999999999,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 59,
                            "optimal": 99,
                            "max": 145,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 49,
                            "optimal": 86,
                            "max": 131,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 22,
                            "optimal": 39,
                            "max": 57,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": "Best machinability of martensitic grades"
    },

    // ======================================================================
    // M-SS-025: AISI 420 Cutlery
    // ======================================================================
    "M-SS-025": {
          "id": "M-SS-025",
          "name": "AISI 420 Cutlery",
          "designation": {
                "aisi_sae": "420",
                "uns": "S42000",
                "din": "1.4021",
                "jis": "SUS420J1",
                "en": "X20Cr13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.15,
                      "max": 0.4,
                      "typical": 0.3
                },
                "chromium": {
                      "min": 12.0,
                      "max": 14.0,
                      "typical": 13.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.2,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_b": 113,
                      "rockwell_c": null,
                      "vickers": 204
                },
                "tensile_strength": {
                      "min": 605,
                      "typical": 655,
                      "max": 705
                },
                "yield_strength": {
                      "min": 310,
                      "typical": 345,
                      "max": 380
                },
                "elongation": {
                      "min": 12,
                      "typical": 20,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 262,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 420,
                "B": 750,
                "C": 0.014,
                "n": 0.42,
                "m": 0.98,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 130,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.125,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 71,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 29,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-026: AISI 420 Hardened 50 HRC
    // ======================================================================
    "M-SS-026": {
          "id": "M-SS-026",
          "name": "AISI 420 Hardened 50 HRC",
          "designation": {
                "aisi_sae": "420",
                "uns": "S42000",
                "din": "1.4021",
                "jis": "SUS420J2",
                "en": "X30Cr13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Q&T 50 HRC",
          "composition": {
                "carbon": {
                      "min": 0.26,
                      "max": 0.4,
                      "typical": 0.35
                },
                "chromium": {
                      "min": 12.0,
                      "max": 14.0,
                      "typical": 13.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.2,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 475,
                      "rockwell_b": null,
                      "rockwell_c": 50,
                      "vickers": 498
                },
                "tensile_strength": {
                      "min": 1550,
                      "typical": 1600,
                      "max": 1650
                },
                "yield_strength": {
                      "min": 1365,
                      "typical": 1400,
                      "max": 1435
                },
                "elongation": {
                      "min": 2,
                      "typical": 8,
                      "max": 13
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 640,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 3200,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 1250,
                "B": 900,
                "C": 0.008,
                "n": 0.25,
                "m": 1.08,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 65,
                "n": 0.12,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 20,
                "relative_to_1212": 0.2,
                "power_factor": 1.25,
                "tool_wear_factor": 1.3,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 33,
                            "optimal": 54,
                            "max": 80,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 27,
                            "optimal": 47,
                            "max": 73,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 23,
                            "max": 35,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-027: AISI 420F Free Machining
    // ======================================================================
    "M-SS-027": {
          "id": "M-SS-027",
          "name": "AISI 420F Free Machining",
          "designation": {
                "aisi_sae": "420F",
                "uns": "S42020",
                "din": "1.4028",
                "jis": "SUS420F",
                "en": "X30CrS13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic Fm",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.26,
                      "max": 0.4,
                      "typical": 0.35
                },
                "chromium": {
                      "min": 12.0,
                      "max": 14.0,
                      "typical": 13.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7890,
                "melting_point": {
                      "solidus": 1400,
                      "liquidus": 1455
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.2,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": null,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 345,
                      "typical": 380,
                      "max": 415
                },
                "elongation": {
                      "min": 7,
                      "typical": 15,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 276,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1650,
                "mc": 0.24,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic_fm"
          },
          "johnson_cook": {
                "A": 440,
                "B": 720,
                "C": 0.016,
                "n": 0.4,
                "m": 0.95,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 195,
                "n": 0.26,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 80,
                "relative_to_1212": 0.8,
                "power_factor": 0.9500000000000001,
                "tool_wear_factor": 0.7,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 57,
                            "optimal": 96,
                            "max": 140,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 48,
                            "optimal": 83,
                            "max": 127,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 22,
                            "optimal": 38,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-028: AISI 431 High Strength
    // ======================================================================
    "M-SS-028": {
          "id": "M-SS-028",
          "name": "AISI 431 High Strength",
          "designation": {
                "aisi_sae": "431",
                "uns": "S43100",
                "din": "1.4057",
                "jis": "SUS431",
                "en": "X17CrNi16-2"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.12,
                      "max": 0.2,
                      "typical": 0.18
                },
                "chromium": {
                      "min": 15.0,
                      "max": 17.0,
                      "typical": 16.0
                },
                "nickel": {
                      "min": 1.25,
                      "max": 2.5,
                      "typical": 2.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7900,
                "melting_point": {
                      "solidus": 1394,
                      "liquidus": 1449
                },
                "specific_heat": 500,
                "thermal_conductivity": 20.2,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 250,
                      "rockwell_b": 142,
                      "rockwell_c": 10,
                      "vickers": 262
                },
                "tensile_strength": {
                      "min": 810,
                      "typical": 860,
                      "max": 910
                },
                "yield_strength": {
                      "min": 620,
                      "typical": 655,
                      "max": 690
                },
                "elongation": {
                      "min": 7,
                      "typical": 15,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 344,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 600,
                "B": 850,
                "C": 0.012,
                "n": 0.4,
                "m": 1.02,
                "melting_temp": 1449,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 115,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 38,
                "relative_to_1212": 0.38,
                "power_factor": 1.1600000000000001,
                "tool_wear_factor": 1.12,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 40,
                            "optimal": 66,
                            "max": 98,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 57,
                            "max": 89,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": "Best corrosion resistance martensitic"
    },

    // ======================================================================
    // M-SS-029: AISI 440A
    // ======================================================================
    "M-SS-029": {
          "id": "M-SS-029",
          "name": "AISI 440A",
          "designation": {
                "aisi_sae": "440A",
                "uns": "S44002",
                "din": "1.4109",
                "jis": "SUS440A",
                "en": "X70CrMo15"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.6,
                      "max": 0.75,
                      "typical": 0.7
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.75,
                      "typical": 0.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7897,
                "melting_point": {
                      "solidus": 1397,
                      "liquidus": 1452
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.2,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 240,
                      "rockwell_b": 136,
                      "rockwell_c": 9,
                      "vickers": 252
                },
                "tensile_strength": {
                      "min": 710,
                      "typical": 760,
                      "max": 810
                },
                "yield_strength": {
                      "min": 380,
                      "typical": 415,
                      "max": 450
                },
                "elongation": {
                      "min": 4,
                      "typical": 12,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 304,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 650,
                "B": 820,
                "C": 0.011,
                "n": 0.38,
                "m": 1.05,
                "melting_temp": 1452,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 110,
                "n": 0.16,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35,
                "power_factor": 1.175,
                "tool_wear_factor": 1.15,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 64,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 56,
                            "max": 86,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 26,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-030: AISI 440B
    // ======================================================================
    "M-SS-030": {
          "id": "M-SS-030",
          "name": "AISI 440B",
          "designation": {
                "aisi_sae": "440B",
                "uns": "S44003",
                "din": "1.4112",
                "jis": "SUS440B",
                "en": "X90CrMoV18"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.75,
                      "max": 0.95,
                      "typical": 0.85
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.75,
                      "typical": 0.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7897,
                "melting_point": {
                      "solidus": 1397,
                      "liquidus": 1452
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 250,
                      "rockwell_b": 142,
                      "rockwell_c": 10,
                      "vickers": 262
                },
                "tensile_strength": {
                      "min": 745,
                      "typical": 795,
                      "max": 845
                },
                "yield_strength": {
                      "min": 415,
                      "typical": 450,
                      "max": 485
                },
                "elongation": {
                      "min": 2,
                      "typical": 10,
                      "max": 15
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 318,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 700,
                "B": 860,
                "C": 0.01,
                "n": 0.36,
                "m": 1.08,
                "melting_temp": 1452,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 105,
                "n": 0.15,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 32,
                "relative_to_1212": 0.32,
                "power_factor": 1.1900000000000002,
                "tool_wear_factor": 1.18,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 62,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 31,
                            "optimal": 54,
                            "max": 83,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 26,
                            "max": 39,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-031: AISI 440C Annealed
    // ======================================================================
    "M-SS-031": {
          "id": "M-SS-031",
          "name": "AISI 440C Annealed",
          "designation": {
                "aisi_sae": "440C",
                "uns": "S44004",
                "din": "1.4125",
                "jis": "SUS440C",
                "en": "X105CrMo17"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.95,
                      "max": 1.2,
                      "typical": 1.05
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.75,
                      "typical": 0.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7897,
                "melting_point": {
                      "solidus": 1397,
                      "liquidus": 1452
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.2,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 260,
                      "rockwell_b": null,
                      "rockwell_c": 12,
                      "vickers": 273
                },
                "tensile_strength": {
                      "min": 710,
                      "typical": 760,
                      "max": 810
                },
                "yield_strength": {
                      "min": 415,
                      "typical": 450,
                      "max": 485
                },
                "elongation": {
                      "min": 2,
                      "typical": 8,
                      "max": 13
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 304,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2400,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 750,
                "B": 880,
                "C": 0.009,
                "n": 0.35,
                "m": 1.1,
                "melting_temp": 1452,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 100,
                "n": 0.14,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28,
                "power_factor": 1.2100000000000002,
                "tool_wear_factor": 1.22,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 36,
                            "optimal": 59,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 29,
                            "optimal": 51,
                            "max": 80,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 25,
                            "max": 37,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": "Highest hardness stainless - bearings/knives"
    },

    // ======================================================================
    // M-SS-032: AISI 440C Hardened 58 HRC
    // ======================================================================
    "M-SS-032": {
          "id": "M-SS-032",
          "name": "AISI 440C Hardened 58 HRC",
          "designation": {
                "aisi_sae": "440C",
                "uns": "S44004",
                "din": "1.4125",
                "jis": "SUS440C",
                "en": "X105CrMo17"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Q&T 58 HRC",
          "composition": {
                "carbon": {
                      "min": 0.95,
                      "max": 1.2,
                      "typical": 1.05
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.75,
                      "typical": 0.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7897,
                "melting_point": {
                      "solidus": 1397,
                      "liquidus": 1452
                },
                "specific_heat": 500,
                "thermal_conductivity": 24.2,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 555,
                      "rockwell_b": null,
                      "rockwell_c": 58,
                      "vickers": 582
                },
                "tensile_strength": {
                      "min": 1920,
                      "typical": 1970,
                      "max": 2020
                },
                "yield_strength": {
                      "min": 1865,
                      "typical": 1900,
                      "max": 1935
                },
                "elongation": {
                      "min": 2,
                      "typical": 2,
                      "max": 7
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 788,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 4200,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless martensitic"
          },
          "johnson_cook": {
                "A": 1600,
                "B": 950,
                "C": 0.007,
                "n": 0.22,
                "m": 1.15,
                "melting_temp": 1452,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 50,
                "n": 0.1,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 12,
                "relative_to_1212": 0.12,
                "power_factor": 1.29,
                "tool_wear_factor": 1.38,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 29,
                            "optimal": 48,
                            "max": 72,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 24,
                            "optimal": 42,
                            "max": 65,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 11,
                            "optimal": 21,
                            "max": 32,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "FAIR",
                "magnetism": "MAGNETIC"
          },
          "notes": "CBN/ceramic tooling required"
    },

    // ======================================================================
    // M-SS-033: 15-5 PH Solution Treated
    // ======================================================================
    "M-SS-033": {
          "id": "M-SS-033",
          "name": "15-5 PH Solution Treated",
          "designation": {
                "aisi_sae": "15-5PH",
                "uns": "S15500",
                "din": "1.4545",
                "jis": "",
                "en": "X5CrNiCu15-5"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "Solution Treated",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 14.0,
                      "max": 15.5,
                      "typical": 15.0
                },
                "nickel": {
                      "min": 3.5,
                      "max": 5.5,
                      "typical": 4.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 2.5,
                      "max": 4.5,
                      "typical": 3.25
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.15,
                      "max": 0.45,
                      "typical": 0.3
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7912,
                "melting_point": {
                      "solidus": 1386,
                      "liquidus": 1441
                },
                "specific_heat": 500,
                "thermal_conductivity": 17.8,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 300,
                      "rockwell_b": null,
                      "rockwell_c": 20,
                      "vickers": 315
                },
                "tensile_strength": {
                      "min": 950,
                      "typical": 1000,
                      "max": 1050
                },
                "yield_strength": {
                      "min": 725,
                      "typical": 760,
                      "max": 795
                },
                "elongation": {
                      "min": 2,
                      "typical": 10,
                      "max": 15
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 400,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 700,
                "B": 900,
                "C": 0.018,
                "n": 0.4,
                "m": 1.05,
                "melting_temp": 1441,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 125,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 40,
                "relative_to_1212": 0.4,
                "power_factor": 1.1500000000000001,
                "tool_wear_factor": 1.1,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 68,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 59,
                            "max": 91,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": "Machine before aging"
    },

    // ======================================================================
    // M-SS-034: 17-4 PH Solution Treated
    // ======================================================================
    "M-SS-034": {
          "id": "M-SS-034",
          "name": "17-4 PH Solution Treated",
          "designation": {
                "aisi_sae": "17-4PH",
                "uns": "S17400",
                "din": "1.4542",
                "jis": "SUS630",
                "en": "X5CrNiCuNb16-4"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "Condition A (Solution)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 15.0,
                      "max": 17.5,
                      "typical": 16.5
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 4.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 3.5
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.15,
                      "max": 0.45,
                      "typical": 0.35
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7910,
                "melting_point": {
                      "solidus": 1388,
                      "liquidus": 1443
                },
                "specific_heat": 500,
                "thermal_conductivity": 17.8,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 290,
                      "rockwell_b": null,
                      "rockwell_c": 18,
                      "vickers": 304
                },
                "tensile_strength": {
                      "min": 915,
                      "typical": 965,
                      "max": 1015
                },
                "yield_strength": {
                      "min": 690,
                      "typical": 725,
                      "max": 760
                },
                "elongation": {
                      "min": 4,
                      "typical": 12,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 386,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1950,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 650,
                "B": 850,
                "C": 0.018,
                "n": 0.38,
                "m": 1.08,
                "melting_temp": 1443,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 130,
                "n": 0.19,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.125,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 71,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 29,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": "Most widely used PH grade"
    },

    // ======================================================================
    // M-SS-035: 17-4 PH H900 Peak Aged
    // ======================================================================
    "M-SS-035": {
          "id": "M-SS-035",
          "name": "17-4 PH H900 Peak Aged",
          "designation": {
                "aisi_sae": "17-4PH",
                "uns": "S17400",
                "din": "1.4542",
                "jis": "SUS630",
                "en": "X5CrNiCuNb16-4"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "H900 (44 HRC)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 15.0,
                      "max": 17.5,
                      "typical": 16.5
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 4.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 3.5
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.15,
                      "max": 0.45,
                      "typical": 0.35
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7910,
                "melting_point": {
                      "solidus": 1388,
                      "liquidus": 1443
                },
                "specific_heat": 500,
                "thermal_conductivity": 17.8,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 420,
                      "rockwell_b": null,
                      "rockwell_c": 44,
                      "vickers": 441
                },
                "tensile_strength": {
                      "min": 1330,
                      "typical": 1380,
                      "max": 1430
                },
                "yield_strength": {
                      "min": 1240,
                      "typical": 1275,
                      "max": 1310
                },
                "elongation": {
                      "min": 2,
                      "typical": 10,
                      "max": 15
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 552,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2600,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 1100,
                "B": 950,
                "C": 0.012,
                "n": 0.32,
                "m": 1.12,
                "melting_temp": 1443,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 90,
                "n": 0.15,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28,
                "power_factor": 1.2100000000000002,
                "tool_wear_factor": 1.22,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 36,
                            "optimal": 59,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 29,
                            "optimal": 51,
                            "max": 80,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 25,
                            "max": 37,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": "Peak hardness condition"
    },

    // ======================================================================
    // M-SS-036: 17-4 PH H1025
    // ======================================================================
    "M-SS-036": {
          "id": "M-SS-036",
          "name": "17-4 PH H1025",
          "designation": {
                "aisi_sae": "17-4PH",
                "uns": "S17400",
                "din": "1.4542",
                "jis": "SUS630",
                "en": "X5CrNiCuNb16-4"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "H1025 (35 HRC)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 15.0,
                      "max": 17.5,
                      "typical": 16.5
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 4.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 3.5
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.15,
                      "max": 0.45,
                      "typical": 0.35
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7910,
                "melting_point": {
                      "solidus": 1388,
                      "liquidus": 1443
                },
                "specific_heat": 500,
                "thermal_conductivity": 17.8,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 331,
                      "rockwell_b": null,
                      "rockwell_c": 35,
                      "vickers": 347
                },
                "tensile_strength": {
                      "min": 1020,
                      "typical": 1070,
                      "max": 1120
                },
                "yield_strength": {
                      "min": 965,
                      "typical": 1000,
                      "max": 1035
                },
                "elongation": {
                      "min": 4,
                      "typical": 12,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 428,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 900,
                "B": 850,
                "C": 0.014,
                "n": 0.35,
                "m": 1.08,
                "melting_temp": 1443,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 110,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35,
                "power_factor": 1.175,
                "tool_wear_factor": 1.15,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 64,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 56,
                            "max": 86,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 26,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-037: 17-4 PH H1150
    // ======================================================================
    "M-SS-037": {
          "id": "M-SS-037",
          "name": "17-4 PH H1150",
          "designation": {
                "aisi_sae": "17-4PH",
                "uns": "S17400",
                "din": "1.4542",
                "jis": "SUS630",
                "en": "X5CrNiCuNb16-4"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "H1150 (28 HRC)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 15.0,
                      "max": 17.5,
                      "typical": 16.5
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 4.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 3.5
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.15,
                      "max": 0.45,
                      "typical": 0.35
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7910,
                "melting_point": {
                      "solidus": 1388,
                      "liquidus": 1443
                },
                "specific_heat": 500,
                "thermal_conductivity": 17.8,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 277,
                      "rockwell_b": null,
                      "rockwell_c": 28,
                      "vickers": 290
                },
                "tensile_strength": {
                      "min": 880,
                      "typical": 930,
                      "max": 980
                },
                "yield_strength": {
                      "min": 760,
                      "typical": 795,
                      "max": 830
                },
                "elongation": {
                      "min": 8,
                      "typical": 16,
                      "max": 21
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 372,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 720,
                "B": 800,
                "C": 0.016,
                "n": 0.38,
                "m": 1.05,
                "melting_temp": 1443,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 125,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 40,
                "relative_to_1212": 0.4,
                "power_factor": 1.1500000000000001,
                "tool_wear_factor": 1.1,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 68,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 59,
                            "max": 91,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-038: 17-7 PH Condition A
    // ======================================================================
    "M-SS-038": {
          "id": "M-SS-038",
          "name": "17-7 PH Condition A",
          "designation": {
                "aisi_sae": "17-7PH",
                "uns": "S17700",
                "din": "1.4568",
                "jis": "SUS631",
                "en": "X7CrNiAl17-7"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "Condition A",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.09,
                      "typical": 0.05
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 6.5,
                      "max": 7.75,
                      "typical": 7.25
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0.75,
                      "max": 1.5,
                      "typical": 1.15
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7926,
                "melting_point": {
                      "solidus": 1378,
                      "liquidus": 1433
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.4,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": null,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 845,
                      "typical": 895,
                      "max": 945
                },
                "yield_strength": {
                      "min": 345,
                      "typical": 380,
                      "max": 415
                },
                "elongation": {
                      "min": 27,
                      "typical": 35,
                      "max": 40
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 358,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 450,
                "B": 1000,
                "C": 0.04,
                "n": 0.55,
                "m": 1.0,
                "melting_temp": 1433,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 115,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 38,
                "relative_to_1212": 0.38,
                "power_factor": 1.1600000000000001,
                "tool_wear_factor": 1.12,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 40,
                            "optimal": 66,
                            "max": 98,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 57,
                            "max": 89,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": "Austenitic when annealed"
    },

    // ======================================================================
    // M-SS-039: 17-7 PH TH1050
    // ======================================================================
    "M-SS-039": {
          "id": "M-SS-039",
          "name": "17-7 PH TH1050",
          "designation": {
                "aisi_sae": "17-7PH",
                "uns": "S17700",
                "din": "1.4568",
                "jis": "SUS631",
                "en": "X7CrNiAl17-7"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "TH1050 (40 HRC)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.09,
                      "typical": 0.05
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 6.5,
                      "max": 7.75,
                      "typical": 7.25
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0.75,
                      "max": 1.5,
                      "typical": 1.15
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7926,
                "melting_point": {
                      "solidus": 1378,
                      "liquidus": 1433
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.4,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 375,
                      "rockwell_b": null,
                      "rockwell_c": 40,
                      "vickers": 393
                },
                "tensile_strength": {
                      "min": 1260,
                      "typical": 1310,
                      "max": 1360
                },
                "yield_strength": {
                      "min": 1135,
                      "typical": 1170,
                      "max": 1205
                },
                "elongation": {
                      "min": 2,
                      "typical": 6,
                      "max": 11
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 524,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2550,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 1050,
                "B": 920,
                "C": 0.01,
                "n": 0.3,
                "m": 1.1,
                "melting_temp": 1433,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 85,
                "n": 0.14,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 25,
                "relative_to_1212": 0.25,
                "power_factor": 1.225,
                "tool_wear_factor": 1.25,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 35,
                            "optimal": 57,
                            "max": 85,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 28,
                            "optimal": 50,
                            "max": 77,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 24,
                            "max": 36,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-040: PH 13-8 Mo Solution
    // ======================================================================
    "M-SS-040": {
          "id": "M-SS-040",
          "name": "PH 13-8 Mo Solution",
          "designation": {
                "aisi_sae": "PH13-8Mo",
                "uns": "S13800",
                "din": "1.4534",
                "jis": "",
                "en": "X3CrNiMoAl13-8-2"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "Solution Treated",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0.03
                },
                "chromium": {
                      "min": 12.25,
                      "max": 13.25,
                      "typical": 13.0
                },
                "nickel": {
                      "min": 7.5,
                      "max": 8.5,
                      "typical": 8.0
                },
                "molybdenum": {
                      "min": 2.0,
                      "max": 2.5,
                      "typical": 2.25
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0.9,
                      "max": 1.35,
                      "typical": 1.1
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7963,
                "melting_point": {
                      "solidus": 1364,
                      "liquidus": 1419
                },
                "specific_heat": 500,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 320,
                      "rockwell_b": null,
                      "rockwell_c": 23,
                      "vickers": 336
                },
                "tensile_strength": {
                      "min": 980,
                      "typical": 1030,
                      "max": 1080
                },
                "yield_strength": {
                      "min": 795,
                      "typical": 830,
                      "max": 865
                },
                "elongation": {
                      "min": 4,
                      "typical": 12,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 412,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 780,
                "B": 920,
                "C": 0.015,
                "n": 0.38,
                "m": 1.08,
                "melting_temp": 1419,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 110,
                "n": 0.16,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35,
                "power_factor": 1.175,
                "tool_wear_factor": 1.15,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 64,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 56,
                            "max": 86,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 26,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": "Best strength + toughness PH grade"
    },

    // ======================================================================
    // M-SS-041: PH 13-8 Mo H950
    // ======================================================================
    "M-SS-041": {
          "id": "M-SS-041",
          "name": "PH 13-8 Mo H950",
          "designation": {
                "aisi_sae": "PH13-8Mo",
                "uns": "S13800",
                "din": "1.4534",
                "jis": "",
                "en": "X3CrNiMoAl13-8-2"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "H950 (48 HRC)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0.03
                },
                "chromium": {
                      "min": 12.25,
                      "max": 13.25,
                      "typical": 13.0
                },
                "nickel": {
                      "min": 7.5,
                      "max": 8.5,
                      "typical": 8.0
                },
                "molybdenum": {
                      "min": 2.0,
                      "max": 2.5,
                      "typical": 2.25
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0.9,
                      "max": 1.35,
                      "typical": 1.1
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7963,
                "melting_point": {
                      "solidus": 1364,
                      "liquidus": 1419
                },
                "specific_heat": 500,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 460,
                      "rockwell_b": null,
                      "rockwell_c": 48,
                      "vickers": 483
                },
                "tensile_strength": {
                      "min": 1470,
                      "typical": 1520,
                      "max": 1570
                },
                "yield_strength": {
                      "min": 1415,
                      "typical": 1450,
                      "max": 1485
                },
                "elongation": {
                      "min": 2,
                      "typical": 10,
                      "max": 15
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 608,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 3000,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless ph"
          },
          "johnson_cook": {
                "A": 1300,
                "B": 980,
                "C": 0.009,
                "n": 0.28,
                "m": 1.15,
                "melting_temp": 1419,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 75,
                "n": 0.13,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22,
                "power_factor": 1.2400000000000002,
                "tool_wear_factor": 1.28,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 33,
                            "optimal": 55,
                            "max": 82,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 27,
                            "optimal": 48,
                            "max": 74,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 23,
                            "max": 35,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "GOOD",
                "magnetism": "MAGNETIC"
          },
          "notes": ""
    },

    // ======================================================================
    // M-SS-042: Duplex 2205
    // ======================================================================
    "M-SS-042": {
          "id": "M-SS-042",
          "name": "Duplex 2205",
          "designation": {
                "aisi_sae": "2205",
                "uns": "S32205",
                "din": "1.4462",
                "jis": "SUS329J3L",
                "en": "X2CrNiMoN22-5-3"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Duplex",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 22.0,
                      "max": 23.0,
                      "typical": 22.5
                },
                "nickel": {
                      "min": 4.5,
                      "max": 6.5,
                      "typical": 5.5
                },
                "molybdenum": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.14,
                      "max": 0.2,
                      "typical": 0.17
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7966,
                "melting_point": {
                      "solidus": 1367,
                      "liquidus": 1422
                },
                "specific_heat": 500,
                "thermal_conductivity": 15.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 270,
                      "rockwell_b": null,
                      "rockwell_c": 14,
                      "vickers": 283
                },
                "tensile_strength": {
                      "min": 570,
                      "typical": 620,
                      "max": 670
                },
                "yield_strength": {
                      "min": 415,
                      "typical": 450,
                      "max": 485
                },
                "elongation": {
                      "min": 17,
                      "typical": 25,
                      "max": 30
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 248,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2400,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless duplex"
          },
          "johnson_cook": {
                "A": 480,
                "B": 920,
                "C": 0.03,
                "n": 0.48,
                "m": 1.0,
                "melting_temp": 1422,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 95,
                "n": 0.15,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_tough",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28,
                "power_factor": 1.2100000000000002,
                "tool_wear_factor": 1.22,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 36,
                            "optimal": 59,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 29,
                            "optimal": 51,
                            "max": 80,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 25,
                            "max": 37,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "EXCELLENT",
                "magnetism": "MAGNETIC"
          },
          "notes": "Most common duplex - 2x strength of 316L"
    },

    // ======================================================================
    // M-SS-043: Super Duplex 2507
    // ======================================================================
    "M-SS-043": {
          "id": "M-SS-043",
          "name": "Super Duplex 2507",
          "designation": {
                "aisi_sae": "2507",
                "uns": "S32750",
                "din": "1.4410",
                "jis": "",
                "en": "X2CrNiMoN25-7-4"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Duplex",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 24.0,
                      "max": 26.0,
                      "typical": 25.0
                },
                "nickel": {
                      "min": 6.0,
                      "max": 8.0,
                      "typical": 7.0
                },
                "molybdenum": {
                      "min": 3.5,
                      "max": 5.0,
                      "typical": 4.0
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.24,
                      "max": 0.32,
                      "typical": 0.28
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7985,
                "melting_point": {
                      "solidus": 1359,
                      "liquidus": 1414
                },
                "specific_heat": 500,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 290,
                      "rockwell_b": null,
                      "rockwell_c": 18,
                      "vickers": 304
                },
                "tensile_strength": {
                      "min": 745,
                      "typical": 795,
                      "max": 845
                },
                "yield_strength": {
                      "min": 515,
                      "typical": 550,
                      "max": 585
                },
                "elongation": {
                      "min": 7,
                      "typical": 15,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 318,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2600,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless duplex"
          },
          "johnson_cook": {
                "A": 580,
                "B": 1000,
                "C": 0.025,
                "n": 0.5,
                "m": 1.0,
                "melting_temp": 1414,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 85,
                "n": 0.14,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_tough",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22,
                "power_factor": 1.2400000000000002,
                "tool_wear_factor": 1.28,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 33,
                            "optimal": 55,
                            "max": 82,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 27,
                            "optimal": 48,
                            "max": 74,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 23,
                            "max": 35,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "EXCELLENT",
                "magnetism": "MAGNETIC"
          },
          "notes": "Highest strength duplex - offshore"
    },

    // ======================================================================
    // M-SS-044: Lean Duplex 2101
    // ======================================================================
    "M-SS-044": {
          "id": "M-SS-044",
          "name": "Lean Duplex 2101",
          "designation": {
                "aisi_sae": "LDX2101",
                "uns": "S32101",
                "din": "1.4162",
                "jis": "",
                "en": "X2CrMnNiN21-5-1"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Duplex",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 21.0,
                      "max": 22.0,
                      "typical": 21.5
                },
                "nickel": {
                      "min": 1.35,
                      "max": 1.7,
                      "typical": 1.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 4.0,
                      "max": 6.0,
                      "typical": 5.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.2,
                      "max": 0.25,
                      "typical": 0.22
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7857,
                "melting_point": {
                      "solidus": 1395,
                      "liquidus": 1450
                },
                "specific_heat": 500,
                "thermal_conductivity": 15.5,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 250,
                      "rockwell_b": 142,
                      "rockwell_c": 10,
                      "vickers": 262
                },
                "tensile_strength": {
                      "min": 600,
                      "typical": 650,
                      "max": 700
                },
                "yield_strength": {
                      "min": 415,
                      "typical": 450,
                      "max": 485
                },
                "elongation": {
                      "min": 22,
                      "typical": 30,
                      "max": 35
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 260,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless duplex"
          },
          "johnson_cook": {
                "A": 450,
                "B": 850,
                "C": 0.028,
                "n": 0.45,
                "m": 1.0,
                "melting_temp": 1450,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 105,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_tough",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "moderate"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.72,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.0
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "excellent",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 32,
                "relative_to_1212": 0.32,
                "power_factor": 1.1900000000000002,
                "tool_wear_factor": 1.18,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 62,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 31,
                            "optimal": 54,
                            "max": 83,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 26,
                            "max": 39,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M10",
                      "M15",
                      "M20"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "Standard",
                "weldability": "EXCELLENT",
                "magnetism": "MAGNETIC"
          },
          "notes": "Cost-effective duplex - low Ni"
    },

    // ======================================================================
    // M-SS-045: 254 SMO
    // ======================================================================
    "M-SS-045": {
          "id": "M-SS-045",
          "name": "254 SMO",
          "designation": {
                "aisi_sae": "254SMO",
                "uns": "S31254",
                "din": "1.4547",
                "jis": "",
                "en": "X1CrNiMoCuN20-18-7"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Super Austenitic",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.02,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 19.5,
                      "max": 20.5,
                      "typical": 20.0
                },
                "nickel": {
                      "min": 17.5,
                      "max": 18.5,
                      "typical": 18.0
                },
                "molybdenum": {
                      "min": 6.0,
                      "max": 6.5,
                      "typical": 6.25
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.18,
                      "max": 0.22,
                      "typical": 0.2
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 8073,
                "melting_point": {
                      "solidus": 1314,
                      "liquidus": 1369
                },
                "specific_heat": 500,
                "thermal_conductivity": 12.0,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": null,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 600,
                      "typical": 650,
                      "max": 700
                },
                "yield_strength": {
                      "min": 265,
                      "typical": 300,
                      "max": 335
                },
                "elongation": {
                      "min": 27,
                      "typical": 35,
                      "max": 40
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 260,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2500,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless super_austenitic"
          },
          "johnson_cook": {
                "A": 400,
                "B": 1200,
                "C": 0.05,
                "n": 0.65,
                "m": 1.0,
                "melting_temp": 1369,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 80,
                "n": 0.14,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22,
                "power_factor": 1.2400000000000002,
                "tool_wear_factor": 1.28,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 33,
                            "optimal": 55,
                            "max": 82,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 27,
                            "optimal": 48,
                            "max": 74,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 23,
                            "max": 35,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "EXCELLENT",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Seawater/chemical processing"
    },

    // ======================================================================
    // M-SS-046: AL-6XN
    // ======================================================================
    "M-SS-046": {
          "id": "M-SS-046",
          "name": "AL-6XN",
          "designation": {
                "aisi_sae": "AL-6XN",
                "uns": "N08367",
                "din": "1.4529",
                "jis": "",
                "en": "X1NiCrMoCuN25-20-7"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Super Austenitic",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 20.0,
                      "max": 22.0,
                      "typical": 21.0
                },
                "nickel": {
                      "min": 23.5,
                      "max": 25.5,
                      "typical": 24.5
                },
                "molybdenum": {
                      "min": 6.0,
                      "max": 7.0,
                      "typical": 6.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.18,
                      "max": 0.25,
                      "typical": 0.22
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 8110,
                "melting_point": {
                      "solidus": 1294,
                      "liquidus": 1349
                },
                "specific_heat": 500,
                "thermal_conductivity": 11.5,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 210,
                      "rockwell_b": 121,
                      "rockwell_c": null,
                      "vickers": 220
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 275,
                      "typical": 310,
                      "max": 345
                },
                "elongation": {
                      "min": 22,
                      "typical": 30,
                      "max": 35
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 276,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2600,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless super_austenitic"
          },
          "johnson_cook": {
                "A": 420,
                "B": 1250,
                "C": 0.05,
                "n": 0.68,
                "m": 1.0,
                "melting_temp": 1349,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 75,
                "n": 0.13,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 20,
                "relative_to_1212": 0.2,
                "power_factor": 1.25,
                "tool_wear_factor": 1.3,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 33,
                            "optimal": 54,
                            "max": 80,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 27,
                            "optimal": 47,
                            "max": 73,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 23,
                            "max": 35,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "EXCELLENT",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Superior pitting resistance (PREN>40)"
    },

    // ======================================================================
    // M-SS-047: 904L Super Austenitic
    // ======================================================================
    "M-SS-047": {
          "id": "M-SS-047",
          "name": "904L Super Austenitic",
          "designation": {
                "aisi_sae": "904L",
                "uns": "N08904",
                "din": "1.4539",
                "jis": "",
                "en": "X1NiCrMoCu25-20-5"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Super Austenitic",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.02,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 19.0,
                      "max": 23.0,
                      "typical": 20.0
                },
                "nickel": {
                      "min": 23.0,
                      "max": 28.0,
                      "typical": 25.0
                },
                "molybdenum": {
                      "min": 4.0,
                      "max": 5.0,
                      "typical": 4.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 1.0,
                      "max": 2.0,
                      "typical": 1.5
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 8082,
                "melting_point": {
                      "solidus": 1302,
                      "liquidus": 1357
                },
                "specific_heat": 500,
                "thermal_conductivity": 12.5,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 180,
                      "rockwell_b": 105,
                      "rockwell_c": null,
                      "vickers": 189
                },
                "tensile_strength": {
                      "min": 440,
                      "typical": 490,
                      "max": 540
                },
                "yield_strength": {
                      "min": 185,
                      "typical": 220,
                      "max": 255
                },
                "elongation": {
                      "min": 27,
                      "typical": 35,
                      "max": 40
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 196,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2400,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless super_austenitic"
          },
          "johnson_cook": {
                "A": 350,
                "B": 1100,
                "C": 0.06,
                "n": 0.62,
                "m": 1.0,
                "melting_temp": 1357,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 90,
                "n": 0.15,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 25,
                "relative_to_1212": 0.25,
                "power_factor": 1.225,
                "tool_wear_factor": 1.25,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 35,
                            "optimal": 57,
                            "max": 85,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 28,
                            "optimal": 50,
                            "max": 77,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 24,
                            "max": 36,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "EXCELLENT",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Sulfuric/phosphoric acid service"
    },

    // ======================================================================
    // M-SS-048: Alloy 20 (20Cb-3)
    // ======================================================================
    "M-SS-048": {
          "id": "M-SS-048",
          "name": "Alloy 20 (20Cb-3)",
          "designation": {
                "aisi_sae": "Alloy20",
                "uns": "N08020",
                "din": "2.4660",
                "jis": "",
                "en": "NiCr20CuMo"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Super Austenitic",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.03
                },
                "chromium": {
                      "min": 19.0,
                      "max": 21.0,
                      "typical": 20.0
                },
                "nickel": {
                      "min": 32.0,
                      "max": 38.0,
                      "typical": 34.0
                },
                "molybdenum": {
                      "min": 2.0,
                      "max": 3.0,
                      "typical": 2.5
                },
                "manganese": {
                      "min": 0,
                      "max": 2.0,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 3.0,
                      "max": 4.0,
                      "typical": 3.5
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 8097,
                "melting_point": {
                      "solidus": 1285,
                      "liquidus": 1340
                },
                "specific_heat": 500,
                "thermal_conductivity": 12.0,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 500,
                      "typical": 550,
                      "max": 600
                },
                "yield_strength": {
                      "min": 205,
                      "typical": 240,
                      "max": 275
                },
                "elongation": {
                      "min": 22,
                      "typical": 30,
                      "max": 35
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 220,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless super_austenitic"
          },
          "johnson_cook": {
                "A": 380,
                "B": 1050,
                "C": 0.05,
                "n": 0.58,
                "m": 1.0,
                "melting_temp": 1340,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 95,
                "n": 0.16,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28,
                "power_factor": 1.2100000000000002,
                "tool_wear_factor": 1.22,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 36,
                            "optimal": 59,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 29,
                            "optimal": 51,
                            "max": 80,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 25,
                            "max": 37,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "GOOD",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Hot sulfuric acid service"
    },

    // ======================================================================
    // M-SS-049: Nitronic 50 (XM-19)
    // ======================================================================
    "M-SS-049": {
          "id": "M-SS-049",
          "name": "Nitronic 50 (XM-19)",
          "designation": {
                "aisi_sae": "Nitronic50",
                "uns": "S20910",
                "din": "1.3964",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.06,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 20.5,
                      "max": 23.5,
                      "typical": 21.5
                },
                "nickel": {
                      "min": 11.5,
                      "max": 13.5,
                      "typical": 12.5
                },
                "molybdenum": {
                      "min": 1.5,
                      "max": 3.0,
                      "typical": 2.25
                },
                "manganese": {
                      "min": 4.0,
                      "max": 6.0,
                      "typical": 5.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.2,
                      "max": 0.4,
                      "typical": 0.3
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7946,
                "melting_point": {
                      "solidus": 1351,
                      "liquidus": 1406
                },
                "specific_heat": 500,
                "thermal_conductivity": 12.8,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 240,
                      "rockwell_b": 136,
                      "rockwell_c": 9,
                      "vickers": 252
                },
                "tensile_strength": {
                      "min": 710,
                      "typical": 760,
                      "max": 810
                },
                "yield_strength": {
                      "min": 345,
                      "typical": 380,
                      "max": 415
                },
                "elongation": {
                      "min": 27,
                      "typical": 35,
                      "max": 40
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 304,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2400,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 450,
                "B": 1150,
                "C": 0.04,
                "n": 0.55,
                "m": 1.0,
                "melting_temp": 1406,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 100,
                "n": 0.16,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 30,
                "relative_to_1212": 0.3,
                "power_factor": 1.2000000000000002,
                "tool_wear_factor": 1.2,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 61,
                            "max": 90,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 30,
                            "optimal": 53,
                            "max": 82,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 25,
                            "max": 38,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "GOOD",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "High strength austenitic - marine/nuclear"
    },

    // ======================================================================
    // M-SS-050: Nitronic 60 Galling Resistant
    // ======================================================================
    "M-SS-050": {
          "id": "M-SS-050",
          "name": "Nitronic 60 Galling Resistant",
          "designation": {
                "aisi_sae": "Nitronic60",
                "uns": "S21800",
                "din": "1.3816",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.08
                },
                "chromium": {
                      "min": 16.0,
                      "max": 18.0,
                      "typical": 17.0
                },
                "nickel": {
                      "min": 8.0,
                      "max": 9.0,
                      "typical": 8.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 7.0,
                      "max": 9.0,
                      "typical": 8.0
                },
                "silicon": {
                      "min": 3.5,
                      "max": 4.5,
                      "typical": 4.0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.045,
                      "typical": 0.025
                },
                "iron": {
                      "min": 50.0,
                      "max": 80.0,
                      "typical": 65.0
                }
          },
          "physical": {
                "density": 7862,
                "melting_point": {
                      "solidus": 1374,
                      "liquidus": 1429
                },
                "specific_heat": 500,
                "thermal_conductivity": 12.0,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": null,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 600,
                      "typical": 650,
                      "max": 700
                },
                "yield_strength": {
                      "min": 310,
                      "typical": 345,
                      "max": 380
                },
                "elongation": {
                      "min": 27,
                      "typical": 35,
                      "max": 40
                },
                "reduction_of_area": {
                      "min": 30,
                      "typical": 50,
                      "max": 70
                },
                "impact_energy": {
                      "joules": 80,
                      "temperature": 20
                },
                "fatigue_strength": 260,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0,
                "note": "Stainless austenitic"
          },
          "johnson_cook": {
                "A": 420,
                "B": 1020,
                "C": 0.038,
                "n": 0.52,
                "m": 1.0,
                "melting_temp": 1429,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 115,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.7,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.6,
                      "mist": 1.3,
                      "high_pressure": 1.8
                },
                "depth_exponent": 0.2
          },
          "chip_formation": {
                "chip_type": "continuous_stringy",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "high",
                "chip_breaking": "poor",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 25,
                "friction_coefficient": 0.55,
                "chip_compression_ratio": 3.0
          },
          "tribology": {
                "sliding_friction": 0.5,
                "adhesion_tendency": "very_high",
                "galling_tendency": "very_high",
                "welding_temperature": 950,
                "oxide_stability": "excellent",
                "lubricity_response": "poor"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.85,
                "heat_partition_to_chip": 0.7,
                "heat_partition_to_tool": 0.2,
                "heat_partition_to_workpiece": 0.1,
                "thermal_softening_onset": 600,
                "recrystallization_temperature": 900,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.6,
                      "Ra_typical": 1.8,
                      "Ra_max": 4.0
                },
                "residual_stress_tendency": "tensile",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.25,
                "microstructure_stability": "excellent",
                "burr_formation": "severe",
                "surface_defect_sensitivity": "high",
                "polishability": "fair"
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35,
                "power_factor": 1.175,
                "tool_wear_factor": 1.15,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 64,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.4,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 56,
                            "max": 86,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 45,
                            "max": 75
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 15,
                            "optimal": 26,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.3,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "M15",
                      "M20",
                      "M25"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.96,
                "standard_deviation_kc": 75,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "SSINA-Data"
                ]
          },
          "warnings": {
                "work_hardening": "SEVERE - Never dwell",
                "weldability": "FAIR",
                "magnetism": "NON-MAGNETIC"
          },
          "notes": "Galling resistant - valve/pump components"
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = STAINLESS_STEELS_001_050;
}
