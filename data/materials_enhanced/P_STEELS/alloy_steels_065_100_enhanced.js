/**
 * PRISM MATERIALS DATABASE - WITH CONDITION VARIANTS
 * Source: alloy_steels_065_100.js
 * Generated: 2026-01-24 19:38:08
 * Total materials: 36
 */
const MATERIALS_ENHANCED = {
  metadata: {
    source: "alloy_steels_065_100.js",
    materialCount: 36,
    generated: "2026-01-24 19:38:08"
  },
  materials: {
    "P-CS-065": {
          "id": "P-CS-065",
          "name": "AISI 4130 Chromoly",
          "designation": {
                "aisi_sae": "4130",
                "uns": "G41300",
                "din": "25CrMo4",
                "jis": "SCM430",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Normalized",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.33,
                      "typical": 0.3
                },
                "manganese": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7863,
                "melting_point": {
                      "solidus": 1440,
                      "liquidus": 1490
                },
                "specific_heat": 477,
                "thermal_conductivity": 34.3,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 197,
                      "rockwell_b": 117,
                      "rockwell_c": null,
                      "vickers": 206
                },
                "tensile_strength": {
                      "min": 620,
                      "typical": 670,
                      "max": 720
                },
                "yield_strength": {
                      "min": 395,
                      "typical": 435,
                      "max": 475
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 31,
                      "temperature": 20
                },
                "fatigue_strength": 301,
                "fracture_toughness": 55
          },
          "kienzle": {
                "kc1_1": 1720,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 510,
                "B": 680,
                "C": 0.015,
                "n": 0.28,
                "m": 1.0,
                "melting_temp": 1490,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 280,
                "n": 0.26,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1002.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7185,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 70,
                "relative_to_1212": 0.7,
                "power_factor": 1.3399999999999999,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.06,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 68,
                            "optimal": 109,
                            "max": 155,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 59,
                            "optimal": 97,
                            "max": 138,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 25,
                            "optimal": 42,
                            "max": 59,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-066": {
          "id": "P-CS-066",
          "name": "AISI 4140 Chromoly",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "42CrMo4",
                "jis": "SCM440",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7863,
                "melting_point": {
                      "solidus": 1430,
                      "liquidus": 1480
                },
                "specific_heat": 477,
                "thermal_conductivity": 34.3,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 197,
                      "rockwell_b": 117,
                      "rockwell_c": null,
                      "vickers": 206
                },
                "tensile_strength": {
                      "min": 605,
                      "typical": 655,
                      "max": 705
                },
                "yield_strength": {
                      "min": 375,
                      "typical": 415,
                      "max": 455
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 31,
                      "temperature": 20
                },
                "fatigue_strength": 294,
                "fracture_toughness": 55
          },
          "kienzle": {
                "kc1_1": 1675,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 598,
                "B": 768,
                "C": 0.014,
                "n": 0.29,
                "m": 0.99,
                "melting_temp": 1480,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 260,
                "n": 0.25,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1002.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7185,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 66,
                "relative_to_1212": 0.66,
                "power_factor": 1.3519999999999999,
                "tool_wear_factor": 1.02,
                "surface_finish_factor": 1.048,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 66,
                            "optimal": 106,
                            "max": 151,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 58,
                            "optimal": 94,
                            "max": 134,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 24,
                            "optimal": 41,
                            "max": 58,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-067": {
          "id": "P-CS-067",
          "name": "AISI 4140 Quenched & Tempered 28 HRC",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "42CrMo4",
                "jis": "SCM440",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Q&T 28 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7863,
                "melting_point": {
                      "solidus": 1430,
                      "liquidus": 1480
                },
                "specific_heat": 477,
                "thermal_conductivity": 34.3,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 277,
                      "rockwell_b": null,
                      "rockwell_c": 28,
                      "vickers": 290
                },
                "tensile_strength": {
                      "min": 915,
                      "typical": 965,
                      "max": 1015
                },
                "yield_strength": {
                      "min": 790,
                      "typical": 830,
                      "max": 870
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 434,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 750,
                "B": 850,
                "C": 0.012,
                "n": 0.26,
                "m": 1.0,
                "melting_temp": 1480,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 180,
                "n": 0.22,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1002.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7585,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.4,
                "tool_wear_factor": 1.1,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 60,
                            "optimal": 95,
                            "max": 135,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 52,
                            "optimal": 85,
                            "max": 120,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 22,
                            "optimal": 37,
                            "max": 52,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-068": {
          "id": "P-CS-068",
          "name": "AISI 4140 Quenched & Tempered 40 HRC",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "42CrMo4",
                "jis": "SCM440",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Q&T 40 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7863,
                "melting_point": {
                      "solidus": 1430,
                      "liquidus": 1480
                },
                "specific_heat": 477,
                "thermal_conductivity": 34.3,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
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
                      "min": 1060,
                      "typical": 1100,
                      "max": 1140
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 13
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 558,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 2700,
                "mc": 0.21,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 980,
                "B": 920,
                "C": 0.01,
                "n": 0.24,
                "m": 1.05,
                "melting_temp": 1480,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 120,
                "n": 0.18,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "low",
                "galling_tendency": "low",
                "welding_temperature": 1002.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.8075,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "compressive",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "moderate",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35,
                "power_factor": 1.4449999999999998,
                "tool_wear_factor": 1.175,
                "surface_finish_factor": 0.955,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 54,
                            "optimal": 84,
                            "max": 120,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 47,
                            "optimal": 76,
                            "max": 106,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 20,
                            "optimal": 33,
                            "max": 47,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-069": {
          "id": "P-CS-069",
          "name": "AISI 4145 Chromoly",
          "designation": {
                "aisi_sae": "4145",
                "uns": "G41450",
                "din": "42CrMo4",
                "jis": "SCM445",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.43,
                      "max": 0.48,
                      "typical": 0.45
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7863,
                "melting_point": {
                      "solidus": 1425,
                      "liquidus": 1475
                },
                "specific_heat": 477,
                "thermal_conductivity": 34.3,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 207,
                      "rockwell_b": 122,
                      "rockwell_c": 11,
                      "vickers": 217
                },
                "tensile_strength": {
                      "min": 660,
                      "typical": 710,
                      "max": 760
                },
                "yield_strength": {
                      "min": 420,
                      "typical": 460,
                      "max": 500
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 29,
                      "temperature": 20
                },
                "fatigue_strength": 319,
                "fracture_toughness": 51
          },
          "kienzle": {
                "kc1_1": 1750,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 620,
                "B": 790,
                "C": 0.014,
                "n": 0.28,
                "m": 1.0,
                "melting_temp": 1475,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 245,
                "n": 0.24,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1002.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7234999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 62,
                "relative_to_1212": 0.62,
                "power_factor": 1.3639999999999999,
                "tool_wear_factor": 1.04,
                "surface_finish_factor": 1.036,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 64,
                            "optimal": 103,
                            "max": 147,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 56,
                            "optimal": 92,
                            "max": 130,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 24,
                            "optimal": 40,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "POOR - Special procedures",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-070": {
          "id": "P-CS-070",
          "name": "AISI 4150 Chromoly",
          "designation": {
                "aisi_sae": "4150",
                "uns": "G41500",
                "din": "50CrMo4",
                "jis": "SCM450",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.48,
                      "max": 0.53,
                      "typical": 0.5
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7863,
                "melting_point": {
                      "solidus": 1420,
                      "liquidus": 1470
                },
                "specific_heat": 477,
                "thermal_conductivity": 34.3,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 217,
                      "rockwell_b": 127,
                      "rockwell_c": 13,
                      "vickers": 227
                },
                "tensile_strength": {
                      "min": 695,
                      "typical": 745,
                      "max": 795
                },
                "yield_strength": {
                      "min": 445,
                      "typical": 485,
                      "max": 525
                },
                "elongation": {
                      "min": 14,
                      "typical": 18,
                      "max": 24
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 26,
                      "temperature": 20
                },
                "fatigue_strength": 335,
                "fracture_toughness": 48
          },
          "kienzle": {
                "kc1_1": 1820,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 650,
                "B": 820,
                "C": 0.013,
                "n": 0.27,
                "m": 1.02,
                "melting_temp": 1470,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 230,
                "n": 0.23,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1002.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7284999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58,
                "power_factor": 1.376,
                "tool_wear_factor": 1.06,
                "surface_finish_factor": 1.024,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 63,
                            "optimal": 100,
                            "max": 143,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 55,
                            "optimal": 89,
                            "max": 127,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 23,
                            "optimal": 39,
                            "max": 55,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "POOR - Special procedures",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Narrow forging range"
          }
    },

    "P-CS-071": {
          "id": "P-CS-071",
          "name": "AISI 4320 NiCrMo Carburizing",
          "designation": {
                "aisi_sae": "4320",
                "uns": "G43200",
                "din": "18CrNiMo7-6",
                "jis": "SNCM420",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.17,
                      "max": 0.22,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.45,
                      "max": 0.65,
                      "typical": 0.55
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.83
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7914,
                "melting_point": {
                      "solidus": 1445,
                      "liquidus": 1495
                },
                "specific_heat": 477,
                "thermal_conductivity": 28.6,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 163,
                      "rockwell_b": 99,
                      "rockwell_c": null,
                      "vickers": 171
                },
                "tensile_strength": {
                      "min": 510,
                      "typical": 560,
                      "max": 610
                },
                "yield_strength": {
                      "min": 325,
                      "typical": 365,
                      "max": 405
                },
                "elongation": {
                      "min": 18,
                      "typical": 22,
                      "max": 28
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 252,
                "fracture_toughness": 66
          },
          "kienzle": {
                "kc1_1": 1580,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 480,
                "B": 620,
                "C": 0.016,
                "n": 0.3,
                "m": 0.95,
                "melting_temp": 1495,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 295,
                "n": 0.27,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1025.0,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7015,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "low",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 65,
                "relative_to_1212": 0.65,
                "power_factor": 1.355,
                "tool_wear_factor": 1.025,
                "surface_finish_factor": 1.045,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 66,
                            "optimal": 105,
                            "max": 150,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 57,
                            "optimal": 94,
                            "max": 133,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 24,
                            "optimal": 41,
                            "max": 57,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Carburizing grade - core properties shown"
    },

    "P-CS-072": {
          "id": "P-CS-072",
          "name": "AISI 4340 NiCrMo High Strength",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "34CrNiMo6",
                "jis": "SNCM439",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.6,
                      "max": 0.8,
                      "typical": 0.7
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.83
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7917,
                "melting_point": {
                      "solidus": 1422,
                      "liquidus": 1472
                },
                "specific_heat": 477,
                "thermal_conductivity": 26.2,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 217,
                      "rockwell_b": 127,
                      "rockwell_c": 13,
                      "vickers": 227
                },
                "tensile_strength": {
                      "min": 695,
                      "typical": 745,
                      "max": 795
                },
                "yield_strength": {
                      "min": 430,
                      "typical": 470,
                      "max": 510
                },
                "elongation": {
                      "min": 14,
                      "typical": 18,
                      "max": 24
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 26,
                      "temperature": 20
                },
                "fatigue_strength": 335,
                "fracture_toughness": 48
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 792,
                "B": 510,
                "C": 0.014,
                "n": 0.26,
                "m": 1.03,
                "melting_temp": 1472,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 220,
                "n": 0.24,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1010.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7284999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "low",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 54,
                "relative_to_1212": 0.54,
                "power_factor": 1.388,
                "tool_wear_factor": 1.08,
                "surface_finish_factor": 1.012,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 61,
                            "optimal": 97,
                            "max": 139,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 53,
                            "optimal": 87,
                            "max": 123,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 23,
                            "optimal": 38,
                            "max": 53,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-073": {
          "id": "P-CS-073",
          "name": "AISI 4340 Q&T 35 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "34CrNiMo6",
                "jis": "SNCM439",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Q&T 35 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.6,
                      "max": 0.8,
                      "typical": 0.7
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.83
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7917,
                "melting_point": {
                      "solidus": 1422,
                      "liquidus": 1472
                },
                "specific_heat": 477,
                "thermal_conductivity": 26.2,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 327,
                      "rockwell_b": null,
                      "rockwell_c": 35,
                      "vickers": 343
                },
                "tensile_strength": {
                      "min": 1050,
                      "typical": 1100,
                      "max": 1150
                },
                "yield_strength": {
                      "min": 890,
                      "typical": 930,
                      "max": 970
                },
                "elongation": {
                      "min": 7,
                      "typical": 11,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 495,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 2500,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 900,
                "B": 650,
                "C": 0.012,
                "n": 0.24,
                "m": 1.05,
                "melting_temp": 1472,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.2,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "low",
                "galling_tendency": "low",
                "welding_temperature": 1010.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7835,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 40,
                "relative_to_1212": 0.4,
                "power_factor": 1.43,
                "tool_wear_factor": 1.15,
                "surface_finish_factor": 0.97,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 56,
                            "optimal": 88,
                            "max": 125,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 49,
                            "optimal": 79,
                            "max": 111,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 21,
                            "optimal": 35,
                            "max": 49,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-074": {
          "id": "P-CS-074",
          "name": "AISI 4340 Q&T 45 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "34CrNiMo6",
                "jis": "SNCM439",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Q&T 45 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.6,
                      "max": 0.8,
                      "typical": 0.7
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.83
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7917,
                "melting_point": {
                      "solidus": 1422,
                      "liquidus": 1472
                },
                "specific_heat": 477,
                "thermal_conductivity": 26.2,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 430,
                      "rockwell_b": null,
                      "rockwell_c": 45,
                      "vickers": 451
                },
                "tensile_strength": {
                      "min": 1400,
                      "typical": 1450,
                      "max": 1500
                },
                "yield_strength": {
                      "min": 1260,
                      "typical": 1300,
                      "max": 1340
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 12
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 652,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 3200,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1100,
                "B": 720,
                "C": 0.01,
                "n": 0.22,
                "m": 1.1,
                "melting_temp": 1472,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 100,
                "n": 0.16,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "low",
                "galling_tendency": "low",
                "welding_temperature": 1010.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.835,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "compressive",
                "white_layer_tendency": "high",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28,
                "power_factor": 1.466,
                "tool_wear_factor": 1.21,
                "surface_finish_factor": 0.9339999999999999,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 51,
                            "optimal": 79,
                            "max": 113,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 44,
                            "optimal": 71,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 32,
                            "max": 44,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-075": {
          "id": "P-CS-075",
          "name": "AISI 4620 NiMo Carburizing",
          "designation": {
                "aisi_sae": "4620",
                "uns": "G46200",
                "din": "20NiMo",
                "jis": "SNCM220",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.17,
                      "max": 0.22,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.45,
                      "max": 0.65,
                      "typical": 0.55
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.83
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7909,
                "melting_point": {
                      "solidus": 1450,
                      "liquidus": 1500
                },
                "specific_heat": 477,
                "thermal_conductivity": 32.6,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 149,
                      "rockwell_b": 92,
                      "rockwell_c": null,
                      "vickers": 156
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 305,
                      "typical": 345,
                      "max": 385
                },
                "elongation": {
                      "min": 19,
                      "typical": 23,
                      "max": 29
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 43,
                      "temperature": 20
                },
                "fatigue_strength": 231,
                "fracture_toughness": 71
          },
          "kienzle": {
                "kc1_1": 1520,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 440,
                "B": 580,
                "C": 0.017,
                "n": 0.31,
                "m": 0.92,
                "melting_temp": 1500,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 310,
                "n": 0.28,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1050,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.6945,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "low",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 68,
                "relative_to_1212": 0.68,
                "power_factor": 1.346,
                "tool_wear_factor": 1.01,
                "surface_finish_factor": 1.054,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 67,
                            "optimal": 107,
                            "max": 153,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 58,
                            "optimal": 95,
                            "max": 136,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 25,
                            "optimal": 42,
                            "max": 58,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Carburizing grade - core properties shown"
    },

    "P-CS-076": {
          "id": "P-CS-076",
          "name": "AISI 4815 NiMo Carburizing",
          "designation": {
                "aisi_sae": "4815",
                "uns": "G48150",
                "din": "15NiMo",
                "jis": "SNCM415",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.13,
                      "max": 0.18,
                      "typical": 0.15
                },
                "manganese": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.25,
                      "max": 3.75,
                      "typical": 3.5
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7960,
                "melting_point": {
                      "solidus": 1447,
                      "liquidus": 1497
                },
                "specific_heat": 477,
                "thermal_conductivity": 24.2,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 163,
                      "rockwell_b": 99,
                      "rockwell_c": null,
                      "vickers": 171
                },
                "tensile_strength": {
                      "min": 510,
                      "typical": 560,
                      "max": 610
                },
                "yield_strength": {
                      "min": 340,
                      "typical": 380,
                      "max": 420
                },
                "elongation": {
                      "min": 18,
                      "typical": 22,
                      "max": 28
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 40,
                      "temperature": 20
                },
                "fatigue_strength": 252,
                "fracture_toughness": 66
          },
          "kienzle": {
                "kc1_1": 1560,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 470,
                "B": 600,
                "C": 0.016,
                "n": 0.3,
                "m": 0.95,
                "melting_temp": 1497,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 290,
                "n": 0.27,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1050,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7015,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "low",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 62,
                "relative_to_1212": 0.62,
                "power_factor": 1.3639999999999999,
                "tool_wear_factor": 1.04,
                "surface_finish_factor": 1.036,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 64,
                            "optimal": 103,
                            "max": 147,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 56,
                            "optimal": 92,
                            "max": 130,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 24,
                            "optimal": 40,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Carburizing grade - higher Ni for tough core"
    },

    "P-CS-077": {
          "id": "P-CS-077",
          "name": "AISI 4820 NiMo Carburizing",
          "designation": {
                "aisi_sae": "4820",
                "uns": "G48200",
                "din": "20NiMo",
                "jis": "SNCM420",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.5,
                      "max": 0.7,
                      "typical": 0.6
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.25,
                      "max": 3.75,
                      "typical": 3.5
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7960,
                "melting_point": {
                      "solidus": 1442,
                      "liquidus": 1492
                },
                "specific_heat": 477,
                "thermal_conductivity": 24.2,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 170,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 178
                },
                "tensile_strength": {
                      "min": 535,
                      "typical": 585,
                      "max": 635
                },
                "yield_strength": {
                      "min": 360,
                      "typical": 400,
                      "max": 440
                },
                "elongation": {
                      "min": 17,
                      "typical": 21,
                      "max": 27
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 38,
                      "temperature": 20
                },
                "fatigue_strength": 263,
                "fracture_toughness": 64
          },
          "kienzle": {
                "kc1_1": 1600,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 490,
                "B": 620,
                "C": 0.015,
                "n": 0.29,
                "m": 0.96,
                "melting_temp": 1492,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 275,
                "n": 0.26,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1050,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.705,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "low",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 60,
                "relative_to_1212": 0.6,
                "power_factor": 1.3699999999999999,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 1.03,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 64,
                            "optimal": 102,
                            "max": 145,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 56,
                            "optimal": 91,
                            "max": 129,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 24,
                            "optimal": 40,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-078": {
          "id": "P-CS-078",
          "name": "AISI 5120 Chromium Carburizing",
          "designation": {
                "aisi_sae": "5120",
                "uns": "G51200",
                "din": "20Cr4",
                "jis": "SCr420",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.17,
                      "max": 0.22,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7858,
                "melting_point": {
                      "solidus": 1452,
                      "liquidus": 1502
                },
                "specific_heat": 477,
                "thermal_conductivity": 36.1,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 156,
                      "rockwell_b": 96,
                      "rockwell_c": null,
                      "vickers": 163
                },
                "tensile_strength": {
                      "min": 490,
                      "typical": 540,
                      "max": 590
                },
                "yield_strength": {
                      "min": 320,
                      "typical": 360,
                      "max": 400
                },
                "elongation": {
                      "min": 18,
                      "typical": 22,
                      "max": 28
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 41,
                      "temperature": 20
                },
                "fatigue_strength": 243,
                "fracture_toughness": 68
          },
          "kienzle": {
                "kc1_1": 1540,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 455,
                "B": 590,
                "C": 0.016,
                "n": 0.3,
                "m": 0.94,
                "melting_temp": 1502,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 305,
                "n": 0.28,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1010.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.698,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 72,
                "relative_to_1212": 0.72,
                "power_factor": 1.334,
                "tool_wear_factor": 0.99,
                "surface_finish_factor": 1.066,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 68,
                            "optimal": 110,
                            "max": 157,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 60,
                            "optimal": 98,
                            "max": 139,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 25,
                            "optimal": 43,
                            "max": 60,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-079": {
          "id": "P-CS-079",
          "name": "AISI 5140 Chromium",
          "designation": {
                "aisi_sae": "5140",
                "uns": "G51400",
                "din": "41Cr4",
                "jis": "SCr440",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7858,
                "melting_point": {
                      "solidus": 1432,
                      "liquidus": 1482
                },
                "specific_heat": 477,
                "thermal_conductivity": 36.1,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 197,
                      "rockwell_b": 117,
                      "rockwell_c": null,
                      "vickers": 206
                },
                "tensile_strength": {
                      "min": 620,
                      "typical": 670,
                      "max": 720
                },
                "yield_strength": {
                      "min": 390,
                      "typical": 430,
                      "max": 470
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 31,
                      "temperature": 20
                },
                "fatigue_strength": 301,
                "fracture_toughness": 55
          },
          "kienzle": {
                "kc1_1": 1700,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 560,
                "B": 720,
                "C": 0.014,
                "n": 0.28,
                "m": 0.98,
                "melting_temp": 1482,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 255,
                "n": 0.25,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1010.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7185,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 60,
                "relative_to_1212": 0.6,
                "power_factor": 1.3699999999999999,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 1.03,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 64,
                            "optimal": 102,
                            "max": 145,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 56,
                            "optimal": 91,
                            "max": 129,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 24,
                            "optimal": 40,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-080": {
          "id": "P-CS-080",
          "name": "AISI 5160 Spring Steel",
          "designation": {
                "aisi_sae": "5160",
                "uns": "G51600",
                "din": "55Cr3",
                "jis": "SUP9",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.56,
                      "max": 0.64,
                      "typical": 0.6
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7858,
                "melting_point": {
                      "solidus": 1412,
                      "liquidus": 1462
                },
                "specific_heat": 477,
                "thermal_conductivity": 36.1,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 229,
                      "rockwell_b": 134,
                      "rockwell_c": 15,
                      "vickers": 240
                },
                "tensile_strength": {
                      "min": 745,
                      "typical": 795,
                      "max": 845
                },
                "yield_strength": {
                      "min": 480,
                      "typical": 520,
                      "max": 560
                },
                "elongation": {
                      "min": 13,
                      "typical": 17,
                      "max": 23
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 23,
                      "temperature": 20
                },
                "fatigue_strength": 357,
                "fracture_toughness": 44
          },
          "kienzle": {
                "kc1_1": 1950,
                "mc": 0.26,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 700,
                "B": 880,
                "C": 0.012,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1462,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 210,
                "n": 0.22,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1010.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7344999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.4,
                "tool_wear_factor": 1.1,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 60,
                            "optimal": 95,
                            "max": 135,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 52,
                            "optimal": 85,
                            "max": 120,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 22,
                            "optimal": 37,
                            "max": 52,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "POOR - Special procedures",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Narrow forging range"
          },
          "notes": "Spring steel - high fatigue resistance"
    },

    "P-CS-081": {
          "id": "P-CS-081",
          "name": "AISI 52100 Bearing Steel Annealed",
          "designation": {
                "aisi_sae": "52100",
                "uns": "G52986",
                "din": "100Cr6",
                "jis": "SUJ2",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Spheroidize Annealed",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.1,
                      "typical": 1.0
                },
                "manganese": {
                      "min": 0.25,
                      "max": 0.45,
                      "typical": 0.35
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7864,
                "melting_point": {
                      "solidus": 1365,
                      "liquidus": 1415
                },
                "specific_heat": 477,
                "thermal_conductivity": 30.9,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 197,
                      "rockwell_b": 117,
                      "rockwell_c": null,
                      "vickers": 206
                },
                "tensile_strength": {
                      "min": 635,
                      "typical": 685,
                      "max": 735
                },
                "yield_strength": {
                      "min": 380,
                      "typical": 420,
                      "max": 460
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 31,
                      "temperature": 20
                },
                "fatigue_strength": 308,
                "fracture_toughness": 55
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 900,
                "B": 650,
                "C": 0.012,
                "n": 0.25,
                "m": 1.1,
                "melting_temp": 1415,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 180,
                "n": 0.22,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 977.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7185,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 40,
                "relative_to_1212": 0.4,
                "power_factor": 1.43,
                "tool_wear_factor": 1.15,
                "surface_finish_factor": 0.97,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 56,
                            "optimal": 88,
                            "max": 125,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 49,
                            "optimal": 79,
                            "max": 111,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 21,
                            "optimal": 35,
                            "max": 49,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "POOR - Special procedures",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Narrow forging range"
          }
    },

    "P-CS-082": {
          "id": "P-CS-082",
          "name": "AISI 52100 Bearing Steel Hardened 60 HRC",
          "designation": {
                "aisi_sae": "52100",
                "uns": "G52986",
                "din": "100Cr6",
                "jis": "SUJ2",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Hardened 60 HRC",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.1,
                      "typical": 1.0
                },
                "manganese": {
                      "min": 0.25,
                      "max": 0.45,
                      "typical": 0.35
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7864,
                "melting_point": {
                      "solidus": 1365,
                      "liquidus": 1415
                },
                "specific_heat": 477,
                "thermal_conductivity": 30.9,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 615,
                      "rockwell_b": null,
                      "rockwell_c": 60,
                      "vickers": 645
                },
                "tensile_strength": {
                      "min": 2050,
                      "typical": 2100,
                      "max": 2150
                },
                "yield_strength": {
                      "min": 1760,
                      "typical": 1800,
                      "max": 1840
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 12
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 945,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 4600,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1600,
                "B": 800,
                "C": 0.008,
                "n": 0.2,
                "m": 1.15,
                "melting_temp": 1415,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 50,
                "n": 0.1,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "low",
                "galling_tendency": "low",
                "welding_temperature": 977.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.9275,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "compressive",
                "white_layer_tendency": "high",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "moderate",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 12,
                "relative_to_1212": 0.12,
                "power_factor": 1.514,
                "tool_wear_factor": 1.29,
                "surface_finish_factor": 0.886,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 44,
                            "optimal": 68,
                            "max": 97,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 39,
                            "optimal": 62,
                            "max": 85,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 28,
                            "max": 39,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "POOR - Special procedures",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Narrow forging range"
          },
          "notes": "Hard turning only - CBN/ceramic required"
    },

    "P-CS-083": {
          "id": "P-CS-083",
          "name": "AISI 8615 NiCrMo Carburizing",
          "designation": {
                "aisi_sae": "8615",
                "uns": "G86150",
                "din": "15NiCrMo6",
                "jis": "SNCM415",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.13,
                      "max": 0.18,
                      "typical": 0.15
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7875,
                "melting_point": {
                      "solidus": 1457,
                      "liquidus": 1507
                },
                "specific_heat": 477,
                "thermal_conductivity": 35.1,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 149,
                      "rockwell_b": 92,
                      "rockwell_c": null,
                      "vickers": 156
                },
                "tensile_strength": {
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 300,
                      "typical": 340,
                      "max": 380
                },
                "elongation": {
                      "min": 19,
                      "typical": 23,
                      "max": 29
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 43,
                      "temperature": 20
                },
                "fatigue_strength": 231,
                "fracture_toughness": 71
          },
          "kienzle": {
                "kc1_1": 1520,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 430,
                "B": 570,
                "C": 0.017,
                "n": 0.31,
                "m": 0.93,
                "melting_temp": 1507,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 310,
                "n": 0.28,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1025.0,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.6945,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 70,
                "relative_to_1212": 0.7,
                "power_factor": 1.3399999999999999,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.06,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 68,
                            "optimal": 109,
                            "max": 155,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 59,
                            "optimal": 97,
                            "max": 138,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 25,
                            "optimal": 42,
                            "max": 59,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-084": {
          "id": "P-CS-084",
          "name": "AISI 8620 NiCrMo Carburizing",
          "designation": {
                "aisi_sae": "8620",
                "uns": "G86200",
                "din": "21NiCrMo2",
                "jis": "SNCM220",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7875,
                "melting_point": {
                      "solidus": 1452,
                      "liquidus": 1502
                },
                "specific_heat": 477,
                "thermal_conductivity": 35.1,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 156,
                      "rockwell_b": 96,
                      "rockwell_c": null,
                      "vickers": 163
                },
                "tensile_strength": {
                      "min": 490,
                      "typical": 540,
                      "max": 590
                },
                "yield_strength": {
                      "min": 320,
                      "typical": 360,
                      "max": 400
                },
                "elongation": {
                      "min": 18,
                      "typical": 22,
                      "max": 28
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 41,
                      "temperature": 20
                },
                "fatigue_strength": 243,
                "fracture_toughness": 68
          },
          "kienzle": {
                "kc1_1": 1560,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 450,
                "B": 590,
                "C": 0.016,
                "n": 0.3,
                "m": 0.94,
                "melting_temp": 1502,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 300,
                "n": 0.27,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1025.0,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.698,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 68,
                "relative_to_1212": 0.68,
                "power_factor": 1.346,
                "tool_wear_factor": 1.01,
                "surface_finish_factor": 1.054,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 67,
                            "optimal": 107,
                            "max": 153,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 58,
                            "optimal": 95,
                            "max": 136,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 25,
                            "optimal": 42,
                            "max": 58,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Most common carburizing grade"
    },

    "P-CS-085": {
          "id": "P-CS-085",
          "name": "AISI 8620 Case Hardened 58 HRC",
          "designation": {
                "aisi_sae": "8620",
                "uns": "G86200",
                "din": "21NiCrMo2",
                "jis": "SNCM220",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Case Hardened 58 HRC",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7875,
                "melting_point": {
                      "solidus": 1452,
                      "liquidus": 1502
                },
                "specific_heat": 477,
                "thermal_conductivity": 35.1,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 555,
                      "rockwell_b": null,
                      "rockwell_c": 58,
                      "vickers": 582
                },
                "tensile_strength": {
                      "min": 1900,
                      "typical": 1950,
                      "max": 2000
                },
                "yield_strength": {
                      "min": 1610,
                      "typical": 1650,
                      "max": 1690
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 12
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 877,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 4200,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1450,
                "B": 750,
                "C": 0.008,
                "n": 0.21,
                "m": 1.12,
                "melting_temp": 1502,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 55,
                "n": 0.1,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "low",
                "welding_temperature": 1025.0,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.8975,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "compressive",
                "white_layer_tendency": "high",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "moderate",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 15,
                "relative_to_1212": 0.15,
                "power_factor": 1.505,
                "tool_wear_factor": 1.275,
                "surface_finish_factor": 0.895,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 46,
                            "optimal": 70,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 40,
                            "optimal": 64,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 28,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Case properties - hard turning/grinding"
    },

    "P-CS-086": {
          "id": "P-CS-086",
          "name": "AISI 8630 NiCrMo",
          "designation": {
                "aisi_sae": "8630",
                "uns": "G86300",
                "din": "30NiCrMo2",
                "jis": "SNCM431",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Normalized",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.33,
                      "typical": 0.3
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7875,
                "melting_point": {
                      "solidus": 1442,
                      "liquidus": 1492
                },
                "specific_heat": 477,
                "thermal_conductivity": 35.1,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 187,
                      "rockwell_b": 112,
                      "rockwell_c": null,
                      "vickers": 196
                },
                "tensile_strength": {
                      "min": 585,
                      "typical": 635,
                      "max": 685
                },
                "yield_strength": {
                      "min": 360,
                      "typical": 400,
                      "max": 440
                },
                "elongation": {
                      "min": 16,
                      "typical": 20,
                      "max": 26
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 34,
                      "temperature": 20
                },
                "fatigue_strength": 285,
                "fracture_toughness": 58
          },
          "kienzle": {
                "kc1_1": 1650,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 520,
                "B": 680,
                "C": 0.015,
                "n": 0.29,
                "m": 0.97,
                "melting_temp": 1492,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 280,
                "n": 0.26,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1025.0,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7135,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 64,
                "relative_to_1212": 0.64,
                "power_factor": 1.358,
                "tool_wear_factor": 1.03,
                "surface_finish_factor": 1.042,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 65,
                            "optimal": 104,
                            "max": 149,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 57,
                            "optimal": 93,
                            "max": 132,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 24,
                            "optimal": 41,
                            "max": 57,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-087": {
          "id": "P-CS-087",
          "name": "AISI 8640 NiCrMo",
          "designation": {
                "aisi_sae": "8640",
                "uns": "G86400",
                "din": "36NiCrMo4",
                "jis": "SNCM439",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7875,
                "melting_point": {
                      "solidus": 1432,
                      "liquidus": 1482
                },
                "specific_heat": 477,
                "thermal_conductivity": 35.1,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 201,
                      "rockwell_b": 119,
                      "rockwell_c": 10,
                      "vickers": 211
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 400,
                      "typical": 440,
                      "max": 480
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 30,
                      "temperature": 20
                },
                "fatigue_strength": 310,
                "fracture_toughness": 53
          },
          "kienzle": {
                "kc1_1": 1720,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 570,
                "B": 730,
                "C": 0.014,
                "n": 0.28,
                "m": 0.99,
                "melting_temp": 1482,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 260,
                "n": 0.25,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1025.0,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7204999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 60,
                "relative_to_1212": 0.6,
                "power_factor": 1.3699999999999999,
                "tool_wear_factor": 1.05,
                "surface_finish_factor": 1.03,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 64,
                            "optimal": 102,
                            "max": 145,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 56,
                            "optimal": 91,
                            "max": 129,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 24,
                            "optimal": 40,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-088": {
          "id": "P-CS-088",
          "name": "AISI 8740 NiCrMo",
          "designation": {
                "aisi_sae": "8740",
                "uns": "G87400",
                "din": "40NiCrMo4",
                "jis": "SNCM447",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7876,
                "melting_point": {
                      "solidus": 1432,
                      "liquidus": 1482
                },
                "specific_heat": 477,
                "thermal_conductivity": 35.0,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 207,
                      "rockwell_b": 122,
                      "rockwell_c": 11,
                      "vickers": 217
                },
                "tensile_strength": {
                      "min": 665,
                      "typical": 715,
                      "max": 765
                },
                "yield_strength": {
                      "min": 420,
                      "typical": 460,
                      "max": 500
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 29,
                      "temperature": 20
                },
                "fatigue_strength": 321,
                "fracture_toughness": 51
          },
          "kienzle": {
                "kc1_1": 1780,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 590,
                "B": 760,
                "C": 0.014,
                "n": 0.28,
                "m": 1.0,
                "melting_temp": 1482,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 250,
                "n": 0.24,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1025.0,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7234999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58,
                "power_factor": 1.376,
                "tool_wear_factor": 1.06,
                "surface_finish_factor": 1.024,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 63,
                            "optimal": 100,
                            "max": 143,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 55,
                            "optimal": 89,
                            "max": 127,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 23,
                            "optimal": 39,
                            "max": 55,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-089": {
          "id": "P-CS-089",
          "name": "AISI 9254 Silicon Spring Steel",
          "designation": {
                "aisi_sae": "9254",
                "uns": "G92540",
                "din": "55Si7",
                "jis": "SUP7",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.51,
                      "max": 0.59,
                      "typical": 0.55
                },
                "manganese": {
                      "min": 0.6,
                      "max": 0.9,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 1.2,
                      "max": 1.6,
                      "typical": 1.4
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.6,
                      "max": 0.8,
                      "typical": 0.7
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7857,
                "melting_point": {
                      "solidus": 1418,
                      "liquidus": 1468
                },
                "specific_heat": 477,
                "thermal_conductivity": 36.9,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 235,
                      "rockwell_b": 137,
                      "rockwell_c": 17,
                      "vickers": 246
                },
                "tensile_strength": {
                      "min": 765,
                      "typical": 815,
                      "max": 865
                },
                "yield_strength": {
                      "min": 500,
                      "typical": 540,
                      "max": 580
                },
                "elongation": {
                      "min": 13,
                      "typical": 17,
                      "max": 23
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 22,
                      "temperature": 20
                },
                "fatigue_strength": 366,
                "fracture_toughness": 42
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 720,
                "B": 890,
                "C": 0.012,
                "n": 0.26,
                "m": 1.03,
                "melting_temp": 1468,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 200,
                "n": 0.22,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1015.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7374999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48,
                "power_factor": 1.406,
                "tool_wear_factor": 1.1099999999999999,
                "surface_finish_factor": 0.994,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 59,
                            "optimal": 93,
                            "max": 133,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 51,
                            "optimal": 83,
                            "max": 118,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 22,
                            "optimal": 37,
                            "max": 51,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "POOR - Special procedures",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Narrow forging range"
          },
          "notes": "Spring steel - high silicon for fatigue resistance"
    },

    "P-CS-090": {
          "id": "P-CS-090",
          "name": "AISI 9260 Silicon Spring Steel",
          "designation": {
                "aisi_sae": "9260",
                "uns": "G92600",
                "din": "60Si7",
                "jis": "SUP7",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.56,
                      "max": 0.64,
                      "typical": 0.6
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.88
                },
                "silicon": {
                      "min": 1.8,
                      "max": 2.2,
                      "typical": 2.0
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7850,
                "melting_point": {
                      "solidus": 1420,
                      "liquidus": 1470
                },
                "specific_heat": 477,
                "thermal_conductivity": 42.5,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 241,
                      "rockwell_b": 140,
                      "rockwell_c": 18,
                      "vickers": 253
                },
                "tensile_strength": {
                      "min": 785,
                      "typical": 835,
                      "max": 885
                },
                "yield_strength": {
                      "min": 520,
                      "typical": 560,
                      "max": 600
                },
                "elongation": {
                      "min": 12,
                      "typical": 16,
                      "max": 22
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 375,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 750,
                "B": 910,
                "C": 0.011,
                "n": 0.25,
                "m": 1.05,
                "melting_temp": 1470,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 190,
                "n": 0.21,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "moderate",
                "galling_tendency": "moderate",
                "welding_temperature": 1050,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7404999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "moderate",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.415,
                "tool_wear_factor": 1.125,
                "surface_finish_factor": 0.985,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 58,
                            "optimal": 91,
                            "max": 130,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 50,
                            "optimal": 82,
                            "max": 115,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 21,
                            "optimal": 36,
                            "max": 50,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "POOR - Special procedures",
                "heat_treatment": "STANDARD_PROCEDURES",
                "forging": "Narrow forging range"
          },
          "notes": "High silicon spring steel"
    },

    "P-CS-091": {
          "id": "P-CS-091",
          "name": "300M Ultra-High-Strength",
          "designation": {
                "aisi_sae": "300M",
                "uns": "K44220",
                "din": "40NiCrMo8-4",
                "jis": "SNCM447",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.4,
                      "max": 0.46,
                      "typical": 0.43
                },
                "manganese": {
                      "min": 0.65,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 1.45,
                      "max": 1.8,
                      "typical": 1.65
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.95,
                      "typical": 0.85
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.83
                },
                "molybdenum": {
                      "min": 0.35,
                      "max": 0.45,
                      "typical": 0.4
                },
                "vanadium": {
                      "min": 0.05,
                      "max": 0.1,
                      "typical": 0.08
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7921,
                "melting_point": {
                      "solidus": 1419,
                      "liquidus": 1469
                },
                "specific_heat": 477,
                "thermal_conductivity": 25.4,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 293,
                      "rockwell_b": null,
                      "rockwell_c": 28,
                      "vickers": 307
                },
                "tensile_strength": {
                      "min": 960,
                      "typical": 1010,
                      "max": 1060
                },
                "yield_strength": {
                      "min": 720,
                      "typical": 760,
                      "max": 800
                },
                "elongation": {
                      "min": 9,
                      "typical": 13,
                      "max": 19
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 454,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1150,
                "B": 700,
                "C": 0.011,
                "n": 0.24,
                "m": 1.15,
                "melting_temp": 1469,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.2,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "low",
                "galling_tendency": "low",
                "welding_temperature": 1007.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7665,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "low",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35,
                "power_factor": 1.4449999999999998,
                "tool_wear_factor": 1.175,
                "surface_finish_factor": 0.955,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 54,
                            "optimal": 84,
                            "max": 120,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 47,
                            "optimal": 76,
                            "max": 106,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 20,
                            "optimal": 33,
                            "max": 47,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Aircraft landing gear steel"
    },

    "P-CS-092": {
          "id": "P-CS-092",
          "name": "300M Q&T 52 HRC",
          "designation": {
                "aisi_sae": "300M",
                "uns": "K44220",
                "din": "40NiCrMo8-4",
                "jis": "SNCM447",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Q&T 52 HRC",
          "composition": {
                "carbon": {
                      "min": 0.4,
                      "max": 0.46,
                      "typical": 0.43
                },
                "manganese": {
                      "min": 0.65,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 1.45,
                      "max": 1.8,
                      "typical": 1.65
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.95,
                      "typical": 0.85
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.83
                },
                "molybdenum": {
                      "min": 0.35,
                      "max": 0.45,
                      "typical": 0.4
                },
                "vanadium": {
                      "min": 0.05,
                      "max": 0.1,
                      "typical": 0.08
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7921,
                "melting_point": {
                      "solidus": 1419,
                      "liquidus": 1469
                },
                "specific_heat": 477,
                "thermal_conductivity": 25.4,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 495,
                      "rockwell_b": null,
                      "rockwell_c": 52,
                      "vickers": 519
                },
                "tensile_strength": {
                      "min": 2000,
                      "typical": 2050,
                      "max": 2100
                },
                "yield_strength": {
                      "min": 1685,
                      "typical": 1725,
                      "max": 1765
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 12
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 922,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 3800,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1500,
                "B": 850,
                "C": 0.008,
                "n": 0.21,
                "m": 1.18,
                "melting_temp": 1469,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 70,
                "n": 0.12,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "low",
                "galling_tendency": "low",
                "welding_temperature": 1007.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.8674999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "compressive",
                "white_layer_tendency": "high",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 18,
                "relative_to_1212": 0.18,
                "power_factor": 1.496,
                "tool_wear_factor": 1.26,
                "surface_finish_factor": 0.904,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 47,
                            "optimal": 72,
                            "max": 103,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 41,
                            "optimal": 65,
                            "max": 91,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 29,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-093": {
          "id": "P-CS-093",
          "name": "4330V Modified (Hy-Tuf)",
          "designation": {
                "aisi_sae": "4330V",
                "uns": "K33517",
                "din": "N/A",
                "jis": "N/A",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.35,
                      "typical": 0.32
                },
                "manganese": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.3
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.9
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.83
                },
                "molybdenum": {
                      "min": 0.35,
                      "max": 0.55,
                      "typical": 0.45
                },
                "vanadium": {
                      "min": 0.05,
                      "max": 0.12,
                      "typical": 0.08
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7922,
                "melting_point": {
                      "solidus": 1429,
                      "liquidus": 1479
                },
                "specific_heat": 477,
                "thermal_conductivity": 24.8,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 255,
                      "rockwell_b": null,
                      "rockwell_c": 21,
                      "vickers": 267
                },
                "tensile_strength": {
                      "min": 830,
                      "typical": 880,
                      "max": 930
                },
                "yield_strength": {
                      "min": 620,
                      "typical": 660,
                      "max": 700
                },
                "elongation": {
                      "min": 11,
                      "typical": 15,
                      "max": 21
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 396,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 1850,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 820,
                "B": 720,
                "C": 0.013,
                "n": 0.26,
                "m": 1.05,
                "melting_temp": 1479,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 180,
                "n": 0.22,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 1005.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7474999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "low",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.415,
                "tool_wear_factor": 1.125,
                "surface_finish_factor": 0.985,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 58,
                            "optimal": 91,
                            "max": 130,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 50,
                            "optimal": 82,
                            "max": 115,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 21,
                            "optimal": 36,
                            "max": 50,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "High toughness aircraft steel"
    },

    "P-CS-094": {
          "id": "P-CS-094",
          "name": "Maraging 250",
          "designation": {
                "aisi_sae": "",
                "uns": "K92890",
                "din": "X2NiCoMo18-9-5",
                "jis": "N/A",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Solution Treated",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0
                },
                "nickel": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.0
                },
                "molybdenum": {
                      "min": 4.5,
                      "max": 5.5,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "cobalt": {
                      "min": 7.0,
                      "max": 9.0,
                      "typical": 8.0
                },
                "titanium": {
                      "min": 0.3,
                      "max": 0.5,
                      "typical": 0.4
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 8490,
                "melting_point": {
                      "solidus": 1389,
                      "liquidus": 1439
                },
                "specific_heat": 477,
                "thermal_conductivity": -62.5,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 290,
                      "rockwell_b": null,
                      "rockwell_c": 28,
                      "vickers": 304
                },
                "tensile_strength": {
                      "min": 950,
                      "typical": 1000,
                      "max": 1050
                },
                "yield_strength": {
                      "min": 910,
                      "typical": 950,
                      "max": 990
                },
                "elongation": {
                      "min": 9,
                      "typical": 13,
                      "max": 19
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 450,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 1750,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1050,
                "B": 480,
                "C": 0.01,
                "n": 0.21,
                "m": 1.15,
                "melting_temp": 1439,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 160,
                "n": 0.22,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "low",
                "welding_temperature": 1050,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.765,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "low",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 38,
                "relative_to_1212": 0.38,
                "power_factor": 1.436,
                "tool_wear_factor": 1.16,
                "surface_finish_factor": 0.964,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 55,
                            "optimal": 86,
                            "max": 123,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 48,
                            "optimal": 77,
                            "max": 109,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 20,
                            "optimal": 34,
                            "max": 48,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Machine in solution treated - ages to 50 HRC"
    },

    "P-CS-095": {
          "id": "P-CS-095",
          "name": "Maraging 300",
          "designation": {
                "aisi_sae": "",
                "uns": "K93120",
                "din": "X2NiCoMo18-9-5",
                "jis": "N/A",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Solution Treated",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0
                },
                "nickel": {
                      "min": 18.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "molybdenum": {
                      "min": 4.7,
                      "max": 5.3,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "cobalt": {
                      "min": 8.5,
                      "max": 9.5,
                      "typical": 9.0
                },
                "titanium": {
                      "min": 0.5,
                      "max": 0.8,
                      "typical": 0.65
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 8505,
                "melting_point": {
                      "solidus": 1386,
                      "liquidus": 1436
                },
                "specific_heat": 477,
                "thermal_conductivity": -65.0,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 315,
                      "rockwell_b": null,
                      "rockwell_c": 33,
                      "vickers": 330
                },
                "tensile_strength": {
                      "min": 1050,
                      "typical": 1100,
                      "max": 1150
                },
                "yield_strength": {
                      "min": 990,
                      "typical": 1030,
                      "max": 1070
                },
                "elongation": {
                      "min": 7,
                      "typical": 11,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 495,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 1800,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1200,
                "B": 500,
                "C": 0.01,
                "n": 0.2,
                "m": 1.2,
                "melting_temp": 1436,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 140,
                "n": 0.2,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "low",
                "welding_temperature": 1050,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7775,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 32,
                "relative_to_1212": 0.32,
                "power_factor": 1.454,
                "tool_wear_factor": 1.19,
                "surface_finish_factor": 0.946,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 52,
                            "optimal": 82,
                            "max": 117,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 46,
                            "optimal": 74,
                            "max": 103,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 33,
                            "max": 46,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-096": {
          "id": "P-CS-096",
          "name": "Maraging 300 Aged 54 HRC",
          "designation": {
                "aisi_sae": "",
                "uns": "K93120",
                "din": "X2NiCoMo18-9-5",
                "jis": "N/A",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Aged 54 HRC",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0
                },
                "nickel": {
                      "min": 18.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "molybdenum": {
                      "min": 4.7,
                      "max": 5.3,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "cobalt": {
                      "min": 8.5,
                      "max": 9.5,
                      "typical": 9.0
                },
                "titanium": {
                      "min": 0.5,
                      "max": 0.8,
                      "typical": 0.65
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 8505,
                "melting_point": {
                      "solidus": 1386,
                      "liquidus": 1436
                },
                "specific_heat": 477,
                "thermal_conductivity": -65.0,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 512,
                      "rockwell_b": null,
                      "rockwell_c": 54,
                      "vickers": 537
                },
                "tensile_strength": {
                      "min": 2000,
                      "typical": 2050,
                      "max": 2100
                },
                "yield_strength": {
                      "min": 1960,
                      "typical": 2000,
                      "max": 2040
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 12
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 922,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 3500,
                "mc": 0.21,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1650,
                "B": 600,
                "C": 0.008,
                "n": 0.18,
                "m": 1.25,
                "melting_temp": 1436,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 60,
                "n": 0.12,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "low",
                "welding_temperature": 1050,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.876,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "compressive",
                "white_layer_tendency": "high",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 15,
                "relative_to_1212": 0.15,
                "power_factor": 1.505,
                "tool_wear_factor": 1.275,
                "surface_finish_factor": 0.895,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 46,
                            "optimal": 70,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 40,
                            "optimal": 64,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 28,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P05",
                      "P10",
                      "P15"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-097": {
          "id": "P-CS-097",
          "name": "Maraging 350",
          "designation": {
                "aisi_sae": "",
                "uns": "K93160",
                "din": "X2NiCoMo18-12-4",
                "jis": "N/A",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Solution Treated",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0
                },
                "nickel": {
                      "min": 17.5,
                      "max": 19.0,
                      "typical": 18.5
                },
                "molybdenum": {
                      "min": 4.5,
                      "max": 5.2,
                      "typical": 4.8
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0
                },
                "cobalt": {
                      "min": 11.5,
                      "max": 12.5,
                      "typical": 12.0
                },
                "titanium": {
                      "min": 1.3,
                      "max": 1.7,
                      "typical": 1.5
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 8501,
                "melting_point": {
                      "solidus": 1386,
                      "liquidus": 1436
                },
                "specific_heat": 477,
                "thermal_conductivity": -64.4,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 330,
                      "rockwell_b": null,
                      "rockwell_c": 36,
                      "vickers": 346
                },
                "tensile_strength": {
                      "min": 1100,
                      "typical": 1150,
                      "max": 1200
                },
                "yield_strength": {
                      "min": 1040,
                      "typical": 1080,
                      "max": 1120
                },
                "elongation": {
                      "min": 6,
                      "typical": 10,
                      "max": 16
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 517,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 1850,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 1280,
                "B": 520,
                "C": 0.009,
                "n": 0.19,
                "m": 1.22,
                "melting_temp": 1436,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 130,
                "n": 0.19,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.12,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "moderate",
                "galling_tendency": "low",
                "welding_temperature": 1050,
                "oxide_stability": "moderate",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7849999999999999,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 450,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.2,
                      "Ra_typical": 0.6,
                      "Ra_max": 1.6
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.04,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "low",
                "polishability": "excellent"
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28,
                "power_factor": 1.466,
                "tool_wear_factor": 1.21,
                "surface_finish_factor": 0.9339999999999999,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 51,
                            "optimal": 79,
                            "max": 113,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 44,
                            "optimal": 71,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 32,
                            "max": 44,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
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
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "GOOD - Preheat required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    },

    "P-CS-098": {
          "id": "P-CS-098",
          "name": "Nitralloy 135M",
          "designation": {
                "aisi_sae": "Nitralloy 135M",
                "uns": "K24065",
                "din": "34CrAlNi7",
                "jis": "SACM645",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Q&T Pre-Nitride",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.45,
                      "typical": 0.41
                },
                "manganese": {
                      "min": 0.4,
                      "max": 0.65,
                      "typical": 0.55
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 1.4,
                      "max": 1.8,
                      "typical": 1.6
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.45,
                      "typical": 0.4
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.01,
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
                      "min": 0.95,
                      "max": 1.3,
                      "typical": 1.15
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7874,
                "melting_point": {
                      "solidus": 1423,
                      "liquidus": 1473
                },
                "specific_heat": 477,
                "thermal_conductivity": 28.5,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_b": null,
                      "rockwell_c": 27,
                      "vickers": 299
                },
                "tensile_strength": {
                      "min": 935,
                      "typical": 985,
                      "max": 1035
                },
                "yield_strength": {
                      "min": 785,
                      "typical": 825,
                      "max": 865
                },
                "elongation": {
                      "min": 9,
                      "typical": 13,
                      "max": 19
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 443,
                "fracture_toughness": 40
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 870,
                "B": 780,
                "C": 0.012,
                "n": 0.25,
                "m": 1.05,
                "melting_temp": 1473,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 175,
                "n": 0.21,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "moderate",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 28,
                "friction_coefficient": 0.45,
                "chip_compression_ratio": 2.5
          },
          "tribology": {
                "sliding_friction": 0.42,
                "adhesion_tendency": "low",
                "galling_tendency": "low",
                "welding_temperature": 970.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7625,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "minimal",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42,
                "power_factor": 1.424,
                "tool_wear_factor": 1.14,
                "surface_finish_factor": 0.976,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 56,
                            "optimal": 89,
                            "max": 127,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 49,
                            "optimal": 80,
                            "max": 112,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 21,
                            "optimal": 35,
                            "max": 49,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Machine before nitriding - case reaches 67+ HRC"
    },

    "P-CS-099": {
          "id": "P-CS-099",
          "name": "AISI H11 Hot Work Tool Steel",
          "designation": {
                "aisi_sae": "H11",
                "uns": "T20811",
                "din": "X38CrMoV5-1",
                "jis": "SKD6",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.33,
                      "max": 0.43,
                      "typical": 0.38
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 1.1,
                      "max": 1.6,
                      "typical": 1.3
                },
                "vanadium": {
                      "min": 0.3,
                      "max": 0.6,
                      "typical": 0.4
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7926,
                "melting_point": {
                      "solidus": 1392,
                      "liquidus": 1442
                },
                "specific_heat": 477,
                "thermal_conductivity": -1.4,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 192,
                      "rockwell_b": 114,
                      "rockwell_c": null,
                      "vickers": 201
                },
                "tensile_strength": {
                      "min": 615,
                      "typical": 665,
                      "max": 715
                },
                "yield_strength": {
                      "min": 380,
                      "typical": 420,
                      "max": 460
                },
                "elongation": {
                      "min": 16,
                      "typical": 20,
                      "max": 26
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 32,
                      "temperature": 20
                },
                "fatigue_strength": 299,
                "fracture_toughness": 56
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 900,
                "B": 720,
                "C": 0.011,
                "n": 0.25,
                "m": 1.08,
                "melting_temp": 1442,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 220,
                "n": 0.23,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 800.0,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.716,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.385,
                "tool_wear_factor": 1.075,
                "surface_finish_factor": 1.015,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 62,
                            "optimal": 98,
                            "max": 140,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 54,
                            "optimal": 88,
                            "max": 124,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 23,
                            "optimal": 38,
                            "max": 54,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P15",
                      "P20",
                      "P25"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          },
          "notes": "Hot work die steel - good hot hardness"
    },

    "P-CS-100": {
          "id": "P-CS-100",
          "name": "AISI H13 Hot Work Tool Steel",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "X40CrMoV5-1",
                "jis": "SKD61",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Alloy Steel",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.45,
                      "typical": 0.4
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "nickel": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 1.1,
                      "max": 1.75,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
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
                      "max": 0.05,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0.25,
                      "typical": 0.1
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nitrogen": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "iron": {
                      "min": 94.0,
                      "max": 98.5,
                      "typical": 96.5
                }
          },
          "physical": {
                "density": 7930,
                "melting_point": {
                      "solidus": 1387,
                      "liquidus": 1437
                },
                "specific_heat": 477,
                "thermal_conductivity": -3.7,
                "thermal_expansion": 1.22e-05,
                "electrical_resistivity": 2.2e-07,
                "magnetic_permeability": 150,
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 197,
                      "rockwell_b": 117,
                      "rockwell_c": null,
                      "vickers": 206
                },
                "tensile_strength": {
                      "min": 630,
                      "typical": 680,
                      "max": 730
                },
                "yield_strength": {
                      "min": 400,
                      "typical": 440,
                      "max": 480
                },
                "elongation": {
                      "min": 15,
                      "typical": 19,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 35,
                      "typical": 50,
                      "max": 65
                },
                "impact_energy": {
                      "joules": 31,
                      "temperature": 20
                },
                "fatigue_strength": 306,
                "fracture_toughness": 55
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0012,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.75,
                "cutting_edge_correction": 1.04,
                "engagement_factor": 1.0,
                "note": "Validated from VDI 3323 and Sandvik data"
          },
          "johnson_cook": {
                "A": 950,
                "B": 750,
                "C": 0.01,
                "n": 0.24,
                "m": 1.05,
                "melting_temp": 1437,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 210,
                "n": 0.22,
                "temperature_exponent": 2.5,
                "hardness_factor": 0.8,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.4,
                      "mist": 1.2
                },
                "depth_exponent": 0.15
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "fair",
                "optimal_chip_thickness": 0.18,
                "shear_angle": 30,
                "friction_coefficient": 0.4,
                "chip_compression_ratio": 2.2
          },
          "tribology": {
                "sliding_friction": 0.38,
                "adhesion_tendency": "low",
                "galling_tendency": "moderate",
                "welding_temperature": 787.5,
                "oxide_stability": "good",
                "lubricity_response": "good"
          },
          "thermal_machining": {
                "cutting_temperature_coefficient": 0.7185,
                "heat_partition_to_chip": 0.78,
                "heat_partition_to_tool": 0.14,
                "heat_partition_to_workpiece": 0.08,
                "thermal_softening_onset": 500,
                "recrystallization_temperature": 700,
                "hot_hardness_retention": "high",
                "thermal_shock_sensitivity": "low"
          },
          "surface_integrity": {
                "achievable_roughness": {
                      "Ra_min": 0.4,
                      "Ra_typical": 1.2,
                      "Ra_max": 3.2
                },
                "residual_stress_tendency": "neutral",
                "white_layer_tendency": "low",
                "work_hardening_depth": 0.08,
                "microstructure_stability": "good",
                "burr_formation": "moderate",
                "surface_defect_sensitivity": "moderate",
                "polishability": "good"
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.4,
                "tool_wear_factor": 1.1,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 60,
                            "optimal": 95,
                            "max": 135,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.25,
                            "max": 0.45,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 3.0,
                            "max": 8.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 52,
                            "optimal": 85,
                            "max": 120,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.08,
                            "optimal": 0.18,
                            "max": 0.32,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 4.0,
                            "max": 10.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 25,
                            "optimal": 55,
                            "max": 85
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 22,
                            "optimal": 37,
                            "max": 52,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.1,
                            "optimal": 0.22,
                            "max": 0.35,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P25",
                      "P30"
                ],
                "preferred_coatings": [
                      "TiN",
                      "TiCN",
                      "TiAlN"
                ],
                "coolant_recommendation": "flood_or_mist"
          },
          "statistics": {
                "data_quality": "highest",
                "sample_size": 180,
                "confidence_level": 0.96,
                "standard_deviation_kc": 65,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "VDI-3323",
                      "PRISM-v8.89"
                ]
          },
          "warnings": {
                "weldability": "FAIR - Preheat + PWHT required",
                "heat_treatment": "RESPONDS_WELL",
                "forging": "Standard forging range"
          }
    }
  }
};
module.exports = MATERIALS_ENHANCED;
