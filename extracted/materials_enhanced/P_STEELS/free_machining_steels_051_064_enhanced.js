/**
 * PRISM MATERIALS DATABASE - WITH CONDITION VARIANTS
 * Source: free_machining_steels_051_064.js
 * Generated: 2026-01-24 19:38:08
 * Total materials: 14
 */
const MATERIALS_ENHANCED = {
  metadata: {
    source: "free_machining_steels_051_064.js",
    materialCount: 14,
    generated: "2026-01-24 19:38:08"
  },
  materials: {
    "P-CS-051": {
          "id": "P-CS-051",
          "name": "AISI 1117 Cold Drawn",
          "designation": {
                "aisi_sae": "1117",
                "uns": "G11170",
                "din": "1.0735",
                "jis": "SUM22",
                "en": "11SMn30"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.14,
                      "max": 0.2,
                      "typical": 0.17
                },
                "manganese": {
                      "min": 1.0,
                      "max": 1.3,
                      "typical": 1.15
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "sulfur": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1446,
                      "liquidus": 1486
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.5,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 143,
                      "rockwell_b": 88,
                      "rockwell_c": null,
                      "vickers": 150
                },
                "tensile_strength": {
                      "min": 440,
                      "typical": 485,
                      "max": 530
                },
                "yield_strength": {
                      "min": 340,
                      "typical": 380,
                      "max": 420
                },
                "elongation": {
                      "min": 16,
                      "typical": 20,
                      "max": 24
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 43,
                      "temperature": 20
                },
                "fatigue_strength": 218,
                "fracture_toughness": 95
          },
          "kienzle": {
                "kc1_1": 1520,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 330,
                "B": 460.75,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1486,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 380,
                "n": 0.3,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 2.1
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 91,
                "relative_to_1212": 0.91,
                "power_factor": 0.627,
                "tool_wear_factor": 0.527,
                "surface_finish_factor": 0.973,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 171,
                            "optimal": 218,
                            "max": 293,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 161,
                            "optimal": 199,
                            "max": 265,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 52,
                            "optimal": 76,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P15",
                      "P20"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "optional_dry_possible"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-052": {
          "id": "P-CS-052",
          "name": "AISI 1118 Cold Drawn",
          "designation": {
                "aisi_sae": "1118",
                "uns": "G11180",
                "din": "1.0736",
                "jis": "SUM23",
                "en": "11SMn37"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.14,
                      "max": 0.2,
                      "typical": 0.17
                },
                "manganese": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "sulfur": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1446,
                      "liquidus": 1486
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.1,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 156,
                      "rockwell_b": 95,
                      "rockwell_c": null,
                      "vickers": 163
                },
                "tensile_strength": {
                      "min": 485,
                      "typical": 530,
                      "max": 575
                },
                "yield_strength": {
                      "min": 365,
                      "typical": 405,
                      "max": 445
                },
                "elongation": {
                      "min": 14,
                      "typical": 18,
                      "max": 22
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 238,
                "fracture_toughness": 91
          },
          "kienzle": {
                "kc1_1": 1580,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 355,
                "B": 503.5,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1486,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 365,
                "n": 0.29,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.1
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 88,
                "relative_to_1212": 0.88,
                "power_factor": 0.636,
                "tool_wear_factor": 0.536,
                "surface_finish_factor": 0.964,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 168,
                            "optimal": 214,
                            "max": 288,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 158,
                            "optimal": 195,
                            "max": 260,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 52,
                            "optimal": 75,
                            "max": 99,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P15",
                      "P20"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "optional_dry_possible"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-053": {
          "id": "P-CS-053",
          "name": "AISI 1137 Cold Drawn",
          "designation": {
                "aisi_sae": "1137",
                "uns": "G11370",
                "din": "1.0726",
                "jis": "SUM32",
                "en": "35SMn"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.39,
                      "typical": 0.36
                },
                "manganese": {
                      "min": 1.35,
                      "max": 1.65,
                      "typical": 1.5
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "sulfur": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1408,
                      "liquidus": 1448
                },
                "specific_heat": 481,
                "thermal_conductivity": 50.0,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 192,
                      "rockwell_b": 100,
                      "rockwell_c": 13,
                      "vickers": 201
                },
                "tensile_strength": {
                      "min": 625,
                      "typical": 670,
                      "max": 715
                },
                "yield_strength": {
                      "min": 500,
                      "typical": 540,
                      "max": 580
                },
                "elongation": {
                      "min": 12,
                      "typical": 16,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 31,
                      "temperature": 20
                },
                "fatigue_strength": 301,
                "fracture_toughness": 82
          },
          "kienzle": {
                "kc1_1": 1780,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 490,
                "B": 636.5,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1448,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 320,
                "n": 0.27,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.1
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 72,
                "relative_to_1212": 0.72,
                "power_factor": 0.684,
                "tool_wear_factor": 0.5840000000000001,
                "surface_finish_factor": 0.916,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 152,
                            "optimal": 193,
                            "max": 259,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 142,
                            "optimal": 176,
                            "max": 235,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 48,
                            "optimal": 70,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P15",
                      "P20"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "optional_dry_possible"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-054": {
          "id": "P-CS-054",
          "name": "AISI 1141 Cold Drawn",
          "designation": {
                "aisi_sae": "1141",
                "uns": "G11410",
                "din": "1.0727",
                "jis": "SUM41",
                "en": "38SMn"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.37,
                      "max": 0.45,
                      "typical": 0.41
                },
                "manganese": {
                      "min": 1.35,
                      "max": 1.65,
                      "typical": 1.5
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "sulfur": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1398,
                      "liquidus": 1438
                },
                "specific_heat": 481,
                "thermal_conductivity": 49.4,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 212,
                      "rockwell_b": 100,
                      "rockwell_c": 15,
                      "vickers": 222
                },
                "tensile_strength": {
                      "min": 695,
                      "typical": 740,
                      "max": 785
                },
                "yield_strength": {
                      "min": 560,
                      "typical": 600,
                      "max": 640
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 26,
                      "temperature": 20
                },
                "fatigue_strength": 333,
                "fracture_toughness": 77
          },
          "kienzle": {
                "kc1_1": 1880,
                "mc": 0.26,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 550,
                "B": 703.0,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1438,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 295,
                "n": 0.25,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.1
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 68,
                "relative_to_1212": 0.68,
                "power_factor": 0.696,
                "tool_wear_factor": 0.5960000000000001,
                "surface_finish_factor": 0.904,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 148,
                            "optimal": 188,
                            "max": 252,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 138,
                            "optimal": 171,
                            "max": 228,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 47,
                            "optimal": 68,
                            "max": 90,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P15",
                      "P20"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "optional_dry_possible"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-055": {
          "id": "P-CS-055",
          "name": "AISI 1144 Cold Drawn (Stressproof)",
          "designation": {
                "aisi_sae": "1144",
                "uns": "G11440",
                "din": "1.0728",
                "jis": "SUM43",
                "en": "44SMn28"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn Stress Relieved",
          "composition": {
                "carbon": {
                      "min": 0.4,
                      "max": 0.48,
                      "typical": 0.44
                },
                "manganese": {
                      "min": 1.35,
                      "max": 1.65,
                      "typical": 1.5
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "sulfur": {
                      "min": 0.24,
                      "max": 0.33,
                      "typical": 0.28,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1392,
                      "liquidus": 1432
                },
                "specific_heat": 481,
                "thermal_conductivity": 49.3,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 217,
                      "rockwell_b": 100,
                      "rockwell_c": 15,
                      "vickers": 227
                },
                "tensile_strength": {
                      "min": 735,
                      "typical": 780,
                      "max": 825
                },
                "yield_strength": {
                      "min": 610,
                      "typical": 650,
                      "max": 690
                },
                "elongation": {
                      "min": 8,
                      "typical": 12,
                      "max": 16
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 23,
                      "temperature": 20
                },
                "fatigue_strength": 351,
                "fracture_toughness": 76
          },
          "kienzle": {
                "kc1_1": 1720,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 600,
                "B": 741.0,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1432,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 340,
                "n": 0.28,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.1
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 83,
                "relative_to_1212": 0.83,
                "power_factor": 0.651,
                "tool_wear_factor": 0.551,
                "surface_finish_factor": 0.949,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 163,
                            "optimal": 207,
                            "max": 279,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 153,
                            "optimal": 189,
                            "max": 252,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 50,
                            "optimal": 74,
                            "max": 97,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P15",
                      "P20"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "optional_dry_possible"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-056": {
          "id": "P-CS-056",
          "name": "AISI 12L14 Cold Drawn",
          "designation": {
                "aisi_sae": "12L14",
                "uns": "G12144",
                "din": "9SMnPb28",
                "jis": "SUM24L",
                "en": "11SMnPb30"
          },
          "iso_group": "P",
          "material_class": "Leaded Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.1,
                      "max": 0.15,
                      "typical": 0.13
                },
                "manganese": {
                      "min": 0.85,
                      "max": 1.15,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.04,
                      "max": 0.09,
                      "typical": 0.065
                },
                "sulfur": {
                      "min": 0.26,
                      "max": 0.35,
                      "typical": 0.3,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25,
                      "note": "LEAD ADDED"
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7895.0,
                "melting_point": {
                      "solidus": 1454,
                      "liquidus": 1494
                },
                "specific_heat": 481,
                "thermal_conductivity": 50.9,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 163,
                      "rockwell_b": 99,
                      "rockwell_c": 10,
                      "vickers": 171
                },
                "tensile_strength": {
                      "min": 495,
                      "typical": 540,
                      "max": 585
                },
                "yield_strength": {
                      "min": 410,
                      "typical": 450,
                      "max": 490
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 39,
                      "temperature": 20
                },
                "fatigue_strength": 243,
                "fracture_toughness": 90
          },
          "kienzle": {
                "kc1_1": 1380,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 400,
                "B": 513.0,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1494,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 480,
                "n": 0.35,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "outstanding",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 1.9
          },
          "tribology": {
                "sliding_friction": 0.32,
                "adhesion_tendency": "none",
                "galling_tendency": "none",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 170,
                "relative_to_1212": 1.7,
                "power_factor": 0.5,
                "tool_wear_factor": 0.4,
                "surface_finish_factor": 1.21,
                "chip_control_rating": "outstanding",
                "overall_rating": "outstanding",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 250,
                            "optimal": 321,
                            "max": 436,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 240,
                            "optimal": 294,
                            "max": 392,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 72,
                            "optimal": 104,
                            "max": 136,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
                ],
                "preferred_coatings": [
                      "TiN",
                      "Uncoated",
                      "TiCN"
                ],
                "coolant_recommendation": "dry_preferred"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 250,
                "confidence_level": 0.98,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "IMPOSSIBLE - Lead causes severe hot cracking",
                "heat_treatment": "NOT_APPLICABLE",
                "forging": "NOT_APPLICABLE"
          }
    },

    "P-CS-057": {
          "id": "P-CS-057",
          "name": "AISI 1211 Cold Drawn",
          "designation": {
                "aisi_sae": "1211",
                "uns": "G12110",
                "din": "9SMnPb23",
                "jis": "SUM11",
                "en": "9SMnPb23"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1
                },
                "manganese": {
                      "min": 0.6,
                      "max": 0.9,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.07,
                      "max": 0.12,
                      "typical": 0.095
                },
                "sulfur": {
                      "min": 0.1,
                      "max": 0.15,
                      "typical": 0.12,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1460,
                      "liquidus": 1500
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.7,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 137,
                      "rockwell_b": 85,
                      "rockwell_c": null,
                      "vickers": 143
                },
                "tensile_strength": {
                      "min": 415,
                      "typical": 460,
                      "max": 505
                },
                "yield_strength": {
                      "min": 315,
                      "typical": 355,
                      "max": 395
                },
                "elongation": {
                      "min": 18,
                      "typical": 22,
                      "max": 26
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 45,
                      "temperature": 20
                },
                "fatigue_strength": 207,
                "fracture_toughness": 96
          },
          "kienzle": {
                "kc1_1": 1450,
                "mc": 0.21,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 305,
                "B": 437.0,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1500,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 395,
                "n": 0.31,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.1
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 85,
                "relative_to_1212": 0.85,
                "power_factor": 0.645,
                "tool_wear_factor": 0.545,
                "surface_finish_factor": 0.955,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 165,
                            "optimal": 210,
                            "max": 283,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 155,
                            "optimal": 192,
                            "max": 256,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 51,
                            "optimal": 74,
                            "max": 98,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P15",
                      "P20"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "optional_dry_possible"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-058": {
          "id": "P-CS-058",
          "name": "AISI 1212 Cold Drawn",
          "designation": {
                "aisi_sae": "1212",
                "uns": "G12120",
                "din": "9SMn28",
                "jis": "SUM12",
                "en": "9SMn28"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1
                },
                "manganese": {
                      "min": 0.7,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.07,
                      "max": 0.12,
                      "typical": 0.095
                },
                "sulfur": {
                      "min": 0.16,
                      "max": 0.23,
                      "typical": 0.2,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1460,
                      "liquidus": 1500
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.4,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 145,
                      "rockwell_b": 89,
                      "rockwell_c": null,
                      "vickers": 152
                },
                "tensile_strength": {
                      "min": 445,
                      "typical": 490,
                      "max": 535
                },
                "yield_strength": {
                      "min": 340,
                      "typical": 380,
                      "max": 420
                },
                "elongation": {
                      "min": 16,
                      "typical": 20,
                      "max": 24
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 43,
                      "temperature": 20
                },
                "fatigue_strength": 220,
                "fracture_toughness": 94
          },
          "kienzle": {
                "kc1_1": 1400,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 330,
                "B": 465.5,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1500,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 420,
                "n": 0.33,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 2.1
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 100,
                "relative_to_1212": 1.0,
                "power_factor": 0.6000000000000001,
                "tool_wear_factor": 0.5,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 180,
                            "optimal": 230,
                            "max": 310,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 170,
                            "optimal": 210,
                            "max": 280,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 55,
                            "optimal": 80,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P15",
                      "P20"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "optional_dry_possible"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 250,
                "confidence_level": 0.98,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-059": {
          "id": "P-CS-059",
          "name": "AISI 1213 Cold Drawn",
          "designation": {
                "aisi_sae": "1213",
                "uns": "G12130",
                "din": "9SMn36",
                "jis": "SUM22L",
                "en": "9SMn36"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1
                },
                "manganese": {
                      "min": 0.7,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.07,
                      "max": 0.12,
                      "typical": 0.095
                },
                "sulfur": {
                      "min": 0.24,
                      "max": 0.33,
                      "typical": 0.28,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1460,
                      "liquidus": 1500
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.3,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 149,
                      "rockwell_b": 91,
                      "rockwell_c": null,
                      "vickers": 156
                },
                "tensile_strength": {
                      "min": 460,
                      "typical": 505,
                      "max": 550
                },
                "yield_strength": {
                      "min": 355,
                      "typical": 395,
                      "max": 435
                },
                "elongation": {
                      "min": 14,
                      "typical": 18,
                      "max": 22
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 42,
                      "temperature": 20
                },
                "fatigue_strength": 227,
                "fracture_toughness": 93
          },
          "kienzle": {
                "kc1_1": 1350,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 345,
                "B": 479.75,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1500,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 450,
                "n": 0.34,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "outstanding",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 1.9
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 136,
                "relative_to_1212": 1.36,
                "power_factor": 0.5,
                "tool_wear_factor": 0.4,
                "surface_finish_factor": 1.108,
                "chip_control_rating": "outstanding",
                "overall_rating": "outstanding",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 216,
                            "optimal": 276,
                            "max": 374,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 206,
                            "optimal": 253,
                            "max": 337,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 64,
                            "optimal": 92,
                            "max": 121,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
                ],
                "preferred_coatings": [
                      "TiN",
                      "Uncoated",
                      "TiCN"
                ],
                "coolant_recommendation": "dry_preferred"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-060": {
          "id": "P-CS-060",
          "name": "AISI 1214 Cold Drawn",
          "designation": {
                "aisi_sae": "1214",
                "uns": "G12140",
                "din": "9SMnPb36",
                "jis": "SUM23L",
                "en": "9SMnPb36"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.1,
                      "max": 0.15,
                      "typical": 0.13
                },
                "manganese": {
                      "min": 0.85,
                      "max": 1.15,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.04,
                      "max": 0.09,
                      "typical": 0.065
                },
                "sulfur": {
                      "min": 0.26,
                      "max": 0.35,
                      "typical": 0.3,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1454,
                      "liquidus": 1494
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.1,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 155,
                      "rockwell_b": 95,
                      "rockwell_c": null,
                      "vickers": 162
                },
                "tensile_strength": {
                      "min": 475,
                      "typical": 520,
                      "max": 565
                },
                "yield_strength": {
                      "min": 370,
                      "typical": 410,
                      "max": 450
                },
                "elongation": {
                      "min": 12,
                      "typical": 16,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 41,
                      "temperature": 20
                },
                "fatigue_strength": 234,
                "fracture_toughness": 92
          },
          "kienzle": {
                "kc1_1": 1380,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 360,
                "B": 494.0,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1494,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 465,
                "n": 0.34,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "outstanding",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 1.9
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 160,
                "relative_to_1212": 1.6,
                "power_factor": 0.5,
                "tool_wear_factor": 0.4,
                "surface_finish_factor": 1.18,
                "chip_control_rating": "outstanding",
                "overall_rating": "outstanding",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 240,
                            "optimal": 308,
                            "max": 418,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 230,
                            "optimal": 282,
                            "max": 376,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 70,
                            "optimal": 101,
                            "max": 132,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
                ],
                "preferred_coatings": [
                      "TiN",
                      "Uncoated",
                      "TiCN"
                ],
                "coolant_recommendation": "dry_preferred"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-061": {
          "id": "P-CS-061",
          "name": "AISI 1215 Cold Drawn",
          "designation": {
                "aisi_sae": "1215",
                "uns": "G12150",
                "din": "9SMnPb36",
                "jis": "SUM25",
                "en": "9SMnPb36"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.1,
                      "typical": 0.09
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.05,
                      "typical": 0.9
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.04,
                      "max": 0.09,
                      "typical": 0.065
                },
                "sulfur": {
                      "min": 0.26,
                      "max": 0.35,
                      "typical": 0.3,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1462,
                      "liquidus": 1502
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.2,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 152,
                      "rockwell_b": 93,
                      "rockwell_c": null,
                      "vickers": 159
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 510,
                      "max": 555
                },
                "yield_strength": {
                      "min": 360,
                      "typical": 400,
                      "max": 440
                },
                "elongation": {
                      "min": 13,
                      "typical": 17,
                      "max": 21
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 41,
                      "temperature": 20
                },
                "fatigue_strength": 229,
                "fracture_toughness": 92
          },
          "kienzle": {
                "kc1_1": 1360,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 350,
                "B": 484.5,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1502,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 455,
                "n": 0.34,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "outstanding",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 1.9
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 150,
                "relative_to_1212": 1.5,
                "power_factor": 0.5,
                "tool_wear_factor": 0.4,
                "surface_finish_factor": 1.15,
                "chip_control_rating": "outstanding",
                "overall_rating": "outstanding",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 230,
                            "optimal": 295,
                            "max": 400,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 220,
                            "optimal": 270,
                            "max": 360,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 67,
                            "optimal": 97,
                            "max": 127,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
                ],
                "preferred_coatings": [
                      "TiN",
                      "Uncoated",
                      "TiCN"
                ],
                "coolant_recommendation": "dry_preferred"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-062": {
          "id": "P-CS-062",
          "name": "AISI B1112 Cold Drawn",
          "designation": {
                "aisi_sae": "B1112",
                "uns": "G11120",
                "din": "9S20",
                "jis": "SUM21",
                "en": "9S20"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1
                },
                "manganese": {
                      "min": 0.6,
                      "max": 1.0,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.07,
                      "max": 0.12,
                      "typical": 0.1
                },
                "sulfur": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1460,
                      "liquidus": 1500
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.4,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 145,
                      "rockwell_b": 89,
                      "rockwell_c": null,
                      "vickers": 152
                },
                "tensile_strength": {
                      "min": 445,
                      "typical": 490,
                      "max": 535
                },
                "yield_strength": {
                      "min": 335,
                      "typical": 375,
                      "max": 415
                },
                "elongation": {
                      "min": 16,
                      "typical": 20,
                      "max": 24
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 43,
                      "temperature": 20
                },
                "fatigue_strength": 220,
                "fracture_toughness": 94
          },
          "kienzle": {
                "kc1_1": 1420,
                "mc": 0.21,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 325,
                "B": 465.5,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1500,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 410,
                "n": 0.32,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 2.1
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 100,
                "relative_to_1212": 1.0,
                "power_factor": 0.6000000000000001,
                "tool_wear_factor": 0.5,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "excellent",
                "overall_rating": "excellent",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 180,
                            "optimal": 230,
                            "max": 310,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 170,
                            "optimal": 210,
                            "max": 280,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 55,
                            "optimal": 80,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P15",
                      "P20"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "optional_dry_possible"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 250,
                "confidence_level": 0.98,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-063": {
          "id": "P-CS-063",
          "name": "AISI B1113 Cold Drawn",
          "designation": {
                "aisi_sae": "B1113",
                "uns": "G11130",
                "din": "9SMn28",
                "jis": "SUM22",
                "en": "9SMn28"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.1
                },
                "manganese": {
                      "min": 0.7,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.07,
                      "max": 0.12,
                      "typical": 0.1
                },
                "sulfur": {
                      "min": 0.24,
                      "max": 0.33,
                      "typical": 0.28,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1460,
                      "liquidus": 1500
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.4,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 148,
                      "rockwell_b": 91,
                      "rockwell_c": null,
                      "vickers": 155
                },
                "tensile_strength": {
                      "min": 455,
                      "typical": 500,
                      "max": 545
                },
                "yield_strength": {
                      "min": 345,
                      "typical": 385,
                      "max": 425
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 23
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 42,
                      "temperature": 20
                },
                "fatigue_strength": 225,
                "fracture_toughness": 93
          },
          "kienzle": {
                "kc1_1": 1360,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 335,
                "B": 475.0,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1500,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 445,
                "n": 0.33,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "outstanding",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 1.9
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 135,
                "relative_to_1212": 1.35,
                "power_factor": 0.5,
                "tool_wear_factor": 0.4,
                "surface_finish_factor": 1.105,
                "chip_control_rating": "outstanding",
                "overall_rating": "outstanding",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 215,
                            "optimal": 275,
                            "max": 373,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 205,
                            "optimal": 252,
                            "max": 336,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 63,
                            "optimal": 92,
                            "max": 120,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
                ],
                "preferred_coatings": [
                      "TiN",
                      "Uncoated",
                      "TiCN"
                ],
                "coolant_recommendation": "dry_preferred"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    },

    "P-CS-064": {
          "id": "P-CS-064",
          "name": "AISI 1215 Hot Rolled",
          "designation": {
                "aisi_sae": "1215",
                "uns": "G12150",
                "din": "9SMnPb36",
                "jis": "SUM25",
                "en": "9SMnPb36"
          },
          "iso_group": "P",
          "material_class": "Free Machining Steel",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.1,
                      "typical": 0.09
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.05,
                      "typical": 0.9
                },
                "silicon": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "phosphorus": {
                      "min": 0.04,
                      "max": 0.09,
                      "typical": 0.065
                },
                "sulfur": {
                      "min": 0.26,
                      "max": 0.35,
                      "typical": 0.3,
                      "note": "Elevated for machinability"
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "nickel": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.03
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "copper": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.08
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.008,
                      "typical": 0.004
                },
                "lead": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "iron": {
                      "min": 97.2,
                      "max": 98.9,
                      "typical": 98.0
                }
          },
          "physical": {
                "density": 7870,
                "melting_point": {
                      "solidus": 1462,
                      "liquidus": 1502
                },
                "specific_heat": 481,
                "thermal_conductivity": 51.9,
                "thermal_expansion": 1.17e-05,
                "electrical_resistivity": 1.7e-07,
                "magnetic_permeability": 700,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 131,
                      "rockwell_b": 82,
                      "rockwell_c": null,
                      "vickers": 137
                },
                "tensile_strength": {
                      "min": 395,
                      "typical": 440,
                      "max": 485
                },
                "yield_strength": {
                      "min": 245,
                      "typical": 285,
                      "max": 325
                },
                "elongation": {
                      "min": 21,
                      "typical": 25,
                      "max": 29
                },
                "reduction_of_area": {
                      "min": 40,
                      "typical": 52,
                      "max": 62
                },
                "impact_energy": {
                      "joules": 46,
                      "temperature": 20
                },
                "fatigue_strength": 198,
                "fracture_toughness": 98
          },
          "kienzle": {
                "kc1_1": 1300,
                "mc": 0.21,
                "kc_temp_coefficient": -0.0011,
                "kc_speed_coefficient": -0.06,
                "rake_angle_correction": 0.011,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.03,
                "engagement_factor": 1.0,
                "note": "MnS inclusions reduce cutting forces"
          },
          "johnson_cook": {
                "A": 235,
                "B": 418.0,
                "C": 0.028,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1502,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 460,
                "n": 0.35,
                "temperature_exponent": 2.0,
                "hardness_factor": 0.75,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.5,
                      "mist": 1.25
                },
                "depth_exponent": 0.1
          },
          "chip_formation": {
                "chip_type": "discontinuous",
                "serration_tendency": "none",
                "built_up_edge_tendency": "very_low",
                "chip_breaking": "outstanding",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 32,
                "friction_coefficient": 0.35,
                "chip_compression_ratio": 1.9
          },
          "tribology": {
                "sliding_friction": 0.36,
                "adhesion_tendency": "very_low",
                "galling_tendency": "very_low",
                "welding_temperature": 1000,
                "oxide_stability": "moderate",
                "lubricity_response": "outstanding"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.68,
                "heat_partition_to_chip": 0.82,
                "heat_partition_to_tool": 0.1,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 460,
                "recrystallization_temperature": 670,
                "hot_hardness_retention": "low",
                "thermal_shock_sensitivity": "very_low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.3,
                      "Ra_typical": 1.0,
                      "Ra_max": 2.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "very_low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "very_low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 145,
                "relative_to_1212": 1.45,
                "power_factor": 0.5,
                "tool_wear_factor": 0.4,
                "surface_finish_factor": 1.135,
                "chip_control_rating": "outstanding",
                "overall_rating": "outstanding",
                "difficulty_class": 1
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 225,
                            "optimal": 288,
                            "max": 391,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.5,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.5,
                            "max": 10.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 215,
                            "optimal": 264,
                            "max": 352,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.12,
                            "optimal": 0.24,
                            "max": 0.4,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.5,
                            "max": 12.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 30,
                            "optimal": 65,
                            "max": 95
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 66,
                            "optimal": 95,
                            "max": 125,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.15,
                            "optimal": 0.3,
                            "max": 0.45,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
                ],
                "preferred_coatings": [
                      "TiN",
                      "Uncoated",
                      "TiCN"
                ],
                "coolant_recommendation": "dry_preferred"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 200,
                "confidence_level": 0.96,
                "standard_deviation_kc": 50,
                "last_validated": "2025-12-01",
                "source_references": [
                      "MFGDB-2024",
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "VERY_POOR - Hot shortness due to sulfur",
                "heat_treatment": "LIMITED - Sulfur segregation",
                "forging": "Restricted temperature range"
          }
    }
  }
};
module.exports = MATERIALS_ENHANCED;
