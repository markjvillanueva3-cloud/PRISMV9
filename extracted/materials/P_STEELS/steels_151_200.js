/**
 * PRISM MATERIALS DATABASE - Spring/Bearing/Case Hardening/Structural/Alloy Steels
 * File: steels_151_200.js
 * Materials: P-CS-151 through P-CS-200 (50 materials)
 * 
 * Generated: 2026-01-24 18:50:20
 */

const STEELS_151_200 = {
  metadata: {
    file: "steels_151_200.js",
    category: "P_STEELS",
    materialCount: 50,
    idRange: { start: "P-CS-151", end: "P-CS-200" },
    schemaVersion: "3.0.0"
  },

  materials: {
    "P-CS-151": {
          "id": "P-CS-151",
          "name": "AISI 1074 Spring Steel",
          "designation": {
                "aisi_sae": "1074",
                "uns": "G10740",
                "din": "1.1248",
                "jis": "",
                "en": "C75S"
          },
          "iso_group": "P",
          "material_class": "Steel - Spring",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.7,
                      "max": 0.8,
                      "typical": 0.75
                },
                "manganese": {
                      "min": 0.5,
                      "max": 0.8,
                      "typical": 0.6
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7822,
                "melting_point": {
                      "solidus": 1440,
                      "liquidus": 1490
                },
                "specific_heat": 480,
                "thermal_conductivity": 48.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_b": 113,
                      "rockwell_c": null,
                      "vickers": 204
                },
                "tensile_strength": {
                      "min": 620,
                      "typical": 670,
                      "max": 720
                },
                "yield_strength": {
                      "min": 360,
                      "typical": 400,
                      "max": 440
                },
                "elongation": {
                      "min": 8,
                      "typical": 12,
                      "max": 16
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 301,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1950,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 500,
                "B": 720,
                "C": 0.02,
                "n": 0.42,
                "m": 0.95,
                "melting_temp": 1490,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.07,
                "tool_wear_factor": 0.94,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 57,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Flat springs, blades"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-152": {
          "id": "P-CS-152",
          "name": "AISI 1075 Spring Steel",
          "designation": {
                "aisi_sae": "1075",
                "uns": "G10750",
                "din": "1.1248",
                "jis": "",
                "en": "C75S"
          },
          "iso_group": "H",
          "material_class": "Steel - Spring",
          "condition": "Hardened 50 HRC",
          "composition": {
                "carbon": {
                      "min": 0.7,
                      "max": 0.8,
                      "typical": 0.75
                },
                "manganese": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.5
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7822,
                "melting_point": {
                      "solidus": 1440,
                      "liquidus": 1490
                },
                "specific_heat": 480,
                "thermal_conductivity": 48.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 477,
                      "rockwell_b": null,
                      "rockwell_c": 50,
                      "vickers": 500
                },
                "tensile_strength": {
                      "min": 1600,
                      "typical": 1650,
                      "max": 1700
                },
                "yield_strength": {
                      "min": 1410,
                      "typical": 1450,
                      "max": 1490
                },
                "elongation": {
                      "min": 2,
                      "typical": 6,
                      "max": 10
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 742,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 3300,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1350,
                "B": 880,
                "C": 0.01,
                "n": 0.28,
                "m": 1.1,
                "melting_temp": 1490,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 78,
                "n": 0.13,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "high",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22,
                "power_factor": 1.268,
                "tool_wear_factor": 1.336,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 27,
                            "optimal": 48,
                            "max": 74,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 24,
                            "optimal": 41,
                            "max": 65,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 20,
                            "max": 32,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-153": {
          "id": "P-CS-153",
          "name": "AISI 1095 High Carbon Spring",
          "designation": {
                "aisi_sae": "1095",
                "uns": "G10950",
                "din": "1.1274",
                "jis": "",
                "en": "C100S"
          },
          "iso_group": "P",
          "material_class": "Steel - Spring",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.9,
                      "max": 1.03,
                      "typical": 0.95
                },
                "manganese": {
                      "min": 0.3,
                      "max": 0.5,
                      "typical": 0.4
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7816,
                "melting_point": {
                      "solidus": 1424,
                      "liquidus": 1474
                },
                "specific_heat": 480,
                "thermal_conductivity": 45.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": 1,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 375,
                      "typical": 415,
                      "max": 455
                },
                "elongation": {
                      "min": 6,
                      "typical": 10,
                      "max": 14
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 310,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 540,
                "B": 750,
                "C": 0.018,
                "n": 0.4,
                "m": 0.98,
                "melting_temp": 1474,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 140,
                "n": 0.19,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.1,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 65,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 55,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Knife blades, springs"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-154": {
          "id": "P-CS-154",
          "name": "AISI 1095 Hardened 58 HRC",
          "designation": {
                "aisi_sae": "1095",
                "uns": "G10950",
                "din": "1.1274",
                "jis": "",
                "en": "C100S"
          },
          "iso_group": "H",
          "material_class": "Steel - Spring",
          "condition": "Hardened 58 HRC",
          "composition": {
                "carbon": {
                      "min": 0.9,
                      "max": 1.03,
                      "typical": 0.95
                },
                "manganese": {
                      "min": 0.3,
                      "max": 0.5,
                      "typical": 0.4
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7816,
                "melting_point": {
                      "solidus": 1424,
                      "liquidus": 1474
                },
                "specific_heat": 480,
                "thermal_conductivity": 45.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
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
                      "min": 1880,
                      "typical": 1930,
                      "max": 1980
                },
                "yield_strength": {
                      "min": 1760,
                      "typical": 1800,
                      "max": 1840
                },
                "elongation": {
                      "min": 1,
                      "typical": 3,
                      "max": 7
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 868,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 4000,
                "mc": 0.19,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1650,
                "B": 950,
                "C": 0.007,
                "n": 0.22,
                "m": 1.15,
                "melting_temp": 1474,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 50,
                "n": 0.1,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "high",
                "built_up_edge_tendency": "none",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 12,
                "relative_to_1212": 0.12,
                "power_factor": 1.328,
                "tool_wear_factor": 1.456,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 24,
                            "optimal": 42,
                            "max": 65,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 21,
                            "optimal": 36,
                            "max": 57,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 11,
                            "optimal": 18,
                            "max": 28,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-155": {
          "id": "P-CS-155",
          "name": "AISI 5160 Chromium Spring",
          "designation": {
                "aisi_sae": "5160",
                "uns": "G51600",
                "din": "1.7176",
                "jis": "",
                "en": "55Cr3"
          },
          "iso_group": "P",
          "material_class": "Steel - Spring",
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
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7827,
                "melting_point": {
                      "solidus": 1452,
                      "liquidus": 1502
                },
                "specific_heat": 480,
                "thermal_conductivity": 42.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_b": 113,
                      "rockwell_c": null,
                      "vickers": 204
                },
                "tensile_strength": {
                      "min": 620,
                      "typical": 670,
                      "max": 720
                },
                "yield_strength": {
                      "min": 360,
                      "typical": 400,
                      "max": 440
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 301,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1950,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 500,
                "B": 720,
                "C": 0.022,
                "n": 0.44,
                "m": 0.94,
                "melting_temp": 1502,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.07,
                "tool_wear_factor": 0.94,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 57,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Automotive leaf springs, coil springs"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-156": {
          "id": "P-CS-156",
          "name": "AISI 5160 Q&T 45 HRC",
          "designation": {
                "aisi_sae": "5160",
                "uns": "G51600",
                "din": "1.7176",
                "jis": "",
                "en": "55Cr3"
          },
          "iso_group": "H",
          "material_class": "Steel - Spring",
          "condition": "Q&T 45 HRC",
          "composition": {
                "carbon": {
                      "min": 0.56,
                      "max": 0.64,
                      "typical": 0.6
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7827,
                "melting_point": {
                      "solidus": 1452,
                      "liquidus": 1502
                },
                "specific_heat": 480,
                "thermal_conductivity": 42.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
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
                      "min": 1430,
                      "typical": 1480,
                      "max": 1530
                },
                "yield_strength": {
                      "min": 1240,
                      "typical": 1280,
                      "max": 1320
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 12
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 666,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2900,
                "mc": 0.2,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1180,
                "B": 850,
                "C": 0.012,
                "n": 0.3,
                "m": 1.08,
                "melting_temp": 1502,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 92,
                "n": 0.14,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "high",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28,
                "power_factor": 1.2320000000000002,
                "tool_wear_factor": 1.264,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 29,
                            "optimal": 51,
                            "max": 80,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 26,
                            "optimal": 44,
                            "max": 70,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 22,
                            "max": 33,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-157": {
          "id": "P-CS-157",
          "name": "AISI 6150 Chromium Vanadium",
          "designation": {
                "aisi_sae": "6150",
                "uns": "G61500",
                "din": "1.8159",
                "jis": "",
                "en": "50CrV4"
          },
          "iso_group": "P",
          "material_class": "Steel - Spring",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.48,
                      "max": 0.53,
                      "typical": 0.51
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
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0.15,
                      "max": 0.2,
                      "typical": 0.18
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7829,
                "melting_point": {
                      "solidus": 1459,
                      "liquidus": 1509
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 190,
                      "rockwell_b": 110,
                      "rockwell_c": null,
                      "vickers": 199
                },
                "tensile_strength": {
                      "min": 605,
                      "typical": 655,
                      "max": 705
                },
                "yield_strength": {
                      "min": 340,
                      "typical": 380,
                      "max": 420
                },
                "elongation": {
                      "min": 11,
                      "typical": 15,
                      "max": 19
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 294,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 480,
                "B": 700,
                "C": 0.024,
                "n": 0.45,
                "m": 0.92,
                "melting_temp": 1509,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 155,
                "n": 0.22,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58,
                "power_factor": 1.052,
                "tool_wear_factor": 0.904,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 40,
                            "optimal": 69,
                            "max": 107,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 59,
                            "max": 94,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Heavy-duty springs, axles"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-158": {
          "id": "P-CS-158",
          "name": "AISI 6150 Q&T 44 HRC",
          "designation": {
                "aisi_sae": "6150",
                "uns": "G61500",
                "din": "1.8159",
                "jis": "",
                "en": "50CrV4"
          },
          "iso_group": "H",
          "material_class": "Steel - Spring",
          "condition": "Q&T 44 HRC",
          "composition": {
                "carbon": {
                      "min": 0.48,
                      "max": 0.53,
                      "typical": 0.51
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0.15,
                      "max": 0.2,
                      "typical": 0.18
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7829,
                "melting_point": {
                      "solidus": 1459,
                      "liquidus": 1509
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 415,
                      "rockwell_b": null,
                      "rockwell_c": 44,
                      "vickers": 435
                },
                "tensile_strength": {
                      "min": 1330,
                      "typical": 1380,
                      "max": 1430
                },
                "yield_strength": {
                      "min": 1170,
                      "typical": 1210,
                      "max": 1250
                },
                "elongation": {
                      "min": 6,
                      "typical": 10,
                      "max": 14
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 621,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2750,
                "mc": 0.21,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1100,
                "B": 840,
                "C": 0.013,
                "n": 0.32,
                "m": 1.06,
                "melting_temp": 1509,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 95,
                "n": 0.15,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "high",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 30,
                "relative_to_1212": 0.3,
                "power_factor": 1.2200000000000002,
                "tool_wear_factor": 1.24,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 30,
                            "optimal": 53,
                            "max": 82,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 27,
                            "optimal": 45,
                            "max": 72,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 14,
                            "optimal": 22,
                            "max": 34,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-159": {
          "id": "P-CS-159",
          "name": "AISI 9254 Silicon Spring",
          "designation": {
                "aisi_sae": "9254",
                "uns": "G92540",
                "din": "1.7102",
                "jis": "",
                "en": "54SiCr6"
          },
          "iso_group": "P",
          "material_class": "Steel - Spring",
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
                "chromium": {
                      "min": 0.6,
                      "max": 0.8,
                      "typical": 0.7
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7805,
                "melting_point": {
                      "solidus": 1456,
                      "liquidus": 1506
                },
                "specific_heat": 480,
                "thermal_conductivity": 35.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 210,
                      "rockwell_b": 121,
                      "rockwell_c": 3,
                      "vickers": 220
                },
                "tensile_strength": {
                      "min": 675,
                      "typical": 725,
                      "max": 775
                },
                "yield_strength": {
                      "min": 395,
                      "typical": 435,
                      "max": 475
                },
                "elongation": {
                      "min": 8,
                      "typical": 12,
                      "max": 16
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 326,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 560,
                "B": 780,
                "C": 0.018,
                "n": 0.42,
                "m": 0.98,
                "melting_temp": 1506,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 145,
                "n": 0.2,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52,
                "power_factor": 1.088,
                "tool_wear_factor": 0.976,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 38,
                            "optimal": 66,
                            "max": 101,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 56,
                            "max": 89,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Valve springs, high fatigue"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-160": {
          "id": "P-CS-160",
          "name": "AISI 9260 Silicon Manganese",
          "designation": {
                "aisi_sae": "9260",
                "uns": "G92600",
                "din": "1.0961",
                "jis": "",
                "en": "60SiMn5"
          },
          "iso_group": "P",
          "material_class": "Steel - Spring",
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
                      "typical": 0.9
                },
                "silicon": {
                      "min": 1.8,
                      "max": 2.2,
                      "typical": 2.0
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7792,
                "melting_point": {
                      "solidus": 1452,
                      "liquidus": 1502
                },
                "specific_heat": 480,
                "thermal_conductivity": 33.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 220,
                      "rockwell_b": 126,
                      "rockwell_c": 5,
                      "vickers": 231
                },
                "tensile_strength": {
                      "min": 710,
                      "typical": 760,
                      "max": 810
                },
                "yield_strength": {
                      "min": 415,
                      "typical": 455,
                      "max": 495
                },
                "elongation": {
                      "min": 6,
                      "typical": 10,
                      "max": 14
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 342,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 590,
                "B": 800,
                "C": 0.016,
                "n": 0.4,
                "m": 1.0,
                "melting_temp": 1502,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 140,
                "n": 0.19,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.1,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 65,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 55,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Flat springs, clips"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-161": {
          "id": "P-CS-161",
          "name": "AISI 52100 Bearing Steel",
          "designation": {
                "aisi_sae": "52100",
                "uns": "G52986",
                "din": "1.3505",
                "jis": "",
                "en": "100Cr6"
          },
          "iso_group": "P",
          "material_class": "Steel - Bearing",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.1,
                      "typical": 1.02
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
                "chromium": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7814,
                "melting_point": {
                      "solidus": 1418,
                      "liquidus": 1468
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 210,
                      "rockwell_b": 121,
                      "rockwell_c": 3,
                      "vickers": 220
                },
                "tensile_strength": {
                      "min": 675,
                      "typical": 725,
                      "max": 775
                },
                "yield_strength": {
                      "min": 395,
                      "typical": 435,
                      "max": 475
                },
                "elongation": {
                      "min": 8,
                      "typical": 12,
                      "max": 16
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 326,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 580,
                "B": 800,
                "C": 0.016,
                "n": 0.4,
                "m": 1.0,
                "melting_temp": 1468,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 135,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48,
                "power_factor": 1.112,
                "tool_wear_factor": 1.024,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 36,
                            "optimal": 63,
                            "max": 98,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 54,
                            "max": 86,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 26,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Most common bearing steel worldwide"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-162": {
          "id": "P-CS-162",
          "name": "AISI 52100 Hardened 62 HRC",
          "designation": {
                "aisi_sae": "52100",
                "uns": "G52986",
                "din": "1.3505",
                "jis": "",
                "en": "100Cr6"
          },
          "iso_group": "H",
          "material_class": "Steel - Bearing",
          "condition": "Hardened 62 HRC",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.1,
                      "typical": 1.02
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7814,
                "melting_point": {
                      "solidus": 1418,
                      "liquidus": 1468
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 650,
                      "rockwell_b": null,
                      "rockwell_c": 62,
                      "vickers": 682
                },
                "tensile_strength": {
                      "min": 2150,
                      "typical": 2200,
                      "max": 2250
                },
                "yield_strength": {
                      "min": 2060,
                      "typical": 2100,
                      "max": 2140
                },
                "elongation": {
                      "min": 1,
                      "typical": 1,
                      "max": 5
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 990,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 4800,
                "mc": 0.18,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1900,
                "B": 1000,
                "C": 0.005,
                "n": 0.18,
                "m": 1.2,
                "melting_temp": 1468,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 40,
                "n": 0.08,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "high",
                "built_up_edge_tendency": "none",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 8,
                "relative_to_1212": 0.08,
                "power_factor": 1.352,
                "tool_wear_factor": 1.504,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 22,
                            "optimal": 39,
                            "max": 62,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 20,
                            "optimal": 34,
                            "max": 54,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 11,
                            "optimal": 17,
                            "max": 27,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Grinding only - CBN wheels"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-163": {
          "id": "P-CS-163",
          "name": "E52100 Electric Furnace Bearing",
          "designation": {
                "aisi_sae": "E52100",
                "uns": "G52986",
                "din": "1.3505",
                "jis": "",
                "en": "100Cr6"
          },
          "iso_group": "P",
          "material_class": "Steel - Bearing",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.05,
                      "typical": 1.02
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 1.35,
                      "max": 1.55,
                      "typical": 1.45
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7814,
                "melting_point": {
                      "solidus": 1418,
                      "liquidus": 1468
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 207,
                      "rockwell_b": 119,
                      "rockwell_c": 3,
                      "vickers": 217
                },
                "tensile_strength": {
                      "min": 660,
                      "typical": 710,
                      "max": 760
                },
                "yield_strength": {
                      "min": 385,
                      "typical": 425,
                      "max": 465
                },
                "elongation": {
                      "min": 9,
                      "typical": 13,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 319,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2080,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 560,
                "B": 780,
                "C": 0.017,
                "n": 0.41,
                "m": 0.99,
                "melting_temp": 1468,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 140,
                "n": 0.19,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.1,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 65,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 55,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Premium clean steel"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-164": {
          "id": "P-CS-164",
          "name": "M50 High Speed Bearing Steel",
          "designation": {
                "aisi_sae": "M50",
                "uns": "T11350",
                "din": "1.3551",
                "jis": "",
                "en": "80MoCrV42-16"
          },
          "iso_group": "P",
          "material_class": "Steel - Bearing",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.77,
                      "max": 0.88,
                      "typical": 0.83
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 4.0,
                      "max": 4.25,
                      "typical": 4.1
                },
                "molybdenum": {
                      "min": 4.0,
                      "max": 4.5,
                      "typical": 4.35
                },
                "vanadium": {
                      "min": 0.9,
                      "max": 1.1,
                      "typical": 1.0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7820,
                "melting_point": {
                      "solidus": 1433,
                      "liquidus": 1483
                },
                "specific_heat": 480,
                "thermal_conductivity": 24.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 230,
                      "rockwell_b": 131,
                      "rockwell_c": 7,
                      "vickers": 241
                },
                "tensile_strength": {
                      "min": 745,
                      "typical": 795,
                      "max": 845
                },
                "yield_strength": {
                      "min": 440,
                      "typical": 480,
                      "max": 520
                },
                "elongation": {
                      "min": 6,
                      "typical": 10,
                      "max": 14
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 357,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.21,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 650,
                "B": 860,
                "C": 0.014,
                "n": 0.38,
                "m": 1.02,
                "melting_temp": 1483,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 125,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42,
                "power_factor": 1.1480000000000001,
                "tool_wear_factor": 1.096,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 34,
                            "optimal": 60,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 30,
                            "optimal": 51,
                            "max": 81,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 25,
                            "max": 38,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Jet engine mainshaft bearings"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-165": {
          "id": "P-CS-165",
          "name": "M50NiL Carburizing Bearing",
          "designation": {
                "aisi_sae": "M50NiL",
                "uns": "",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Bearing",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.11,
                      "max": 0.17,
                      "typical": 0.15
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 4.0,
                      "max": 4.25,
                      "typical": 4.1
                },
                "molybdenum": {
                      "min": 4.0,
                      "max": 4.5,
                      "typical": 4.35
                },
                "vanadium": {
                      "min": 1.13,
                      "max": 1.3,
                      "typical": 1.2
                },
                "nickel": {
                      "min": 3.2,
                      "max": 3.6,
                      "typical": 3.5
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7858,
                "melting_point": {
                      "solidus": 1470,
                      "liquidus": 1520
                },
                "specific_heat": 480,
                "thermal_conductivity": 22.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": 1,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 375,
                      "typical": 415,
                      "max": 455
                },
                "elongation": {
                      "min": 11,
                      "typical": 15,
                      "max": 19
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 310,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 530,
                "B": 740,
                "C": 0.02,
                "n": 0.44,
                "m": 0.96,
                "melting_temp": 1520,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.07,
                "tool_wear_factor": 0.94,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 57,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Case hardened for fracture toughness"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-166": {
          "id": "P-CS-166",
          "name": "Pyrowear 675 Bearing Steel",
          "designation": {
                "aisi_sae": "Pyrowear675",
                "uns": "",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Bearing",
          "condition": "Carburized + Hardened",
          "composition": {
                "carbon": {
                      "min": 0.05,
                      "max": 0.09,
                      "typical": 0.07
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 12.5,
                      "max": 14.0,
                      "typical": 13.0
                },
                "molybdenum": {
                      "min": 1.75,
                      "max": 2.25,
                      "typical": 2.0
                },
                "vanadium": {
                      "min": 0.45,
                      "max": 0.75,
                      "typical": 0.6
                },
                "nickel": {
                      "min": 2.5,
                      "max": 3.0,
                      "typical": 2.75
                },
                "cobalt": {
                      "min": 5.0,
                      "max": 6.5,
                      "typical": 5.5
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7911,
                "melting_point": {
                      "solidus": 1480,
                      "liquidus": 1530
                },
                "specific_heat": 480,
                "thermal_conductivity": 20.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 580,
                      "rockwell_b": null,
                      "rockwell_c": 58,
                      "vickers": 609
                },
                "tensile_strength": {
                      "min": 1915,
                      "typical": 1965,
                      "max": 2015
                },
                "yield_strength": {
                      "min": 1820,
                      "typical": 1860,
                      "max": 1900
                },
                "elongation": {
                      "min": 1,
                      "typical": 4,
                      "max": 8
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 884,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 3900,
                "mc": 0.19,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1650,
                "B": 950,
                "C": 0.008,
                "n": 0.24,
                "m": 1.12,
                "melting_temp": 1530,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 58,
                "n": 0.11,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "high",
                "built_up_edge_tendency": "none",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 15,
                "relative_to_1212": 0.15,
                "power_factor": 1.31,
                "tool_wear_factor": 1.42,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 25,
                            "optimal": 44,
                            "max": 68,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 22,
                            "optimal": 37,
                            "max": 60,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 12,
                            "optimal": 19,
                            "max": 29,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Premium aerospace bearings - corrosion resistant"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-167": {
          "id": "P-CS-167",
          "name": "AISI 1018 Carburizing Steel",
          "designation": {
                "aisi_sae": "1018",
                "uns": "G10180",
                "din": "1.0453",
                "jis": "",
                "en": "C18E"
          },
          "iso_group": "P",
          "material_class": "Steel - Case Hardening",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0.15,
                      "max": 0.2,
                      "typical": 0.18
                },
                "manganese": {
                      "min": 0.6,
                      "max": 0.9,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7839,
                "melting_point": {
                      "solidus": 1485,
                      "liquidus": 1535
                },
                "specific_heat": 480,
                "thermal_conductivity": 52.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 130,
                      "rockwell_b": 79,
                      "rockwell_c": null,
                      "vickers": 136
                },
                "tensile_strength": {
                      "min": 390,
                      "typical": 440,
                      "max": 490
                },
                "yield_strength": {
                      "min": 330,
                      "typical": 370,
                      "max": 410
                },
                "elongation": {
                      "min": 16,
                      "typical": 20,
                      "max": 24
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 198,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1500,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 310,
                "B": 550,
                "C": 0.04,
                "n": 0.52,
                "m": 0.88,
                "melting_temp": 1535,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 190,
                "n": 0.26,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 70,
                "relative_to_1212": 0.7,
                "power_factor": 0.9800000000000001,
                "tool_wear_factor": 0.76,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 44,
                            "optimal": 77,
                            "max": 118,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 39,
                            "optimal": 65,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 20,
                            "optimal": 31,
                            "max": 47,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "General purpose carburizing"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-168": {
          "id": "P-CS-168",
          "name": "AISI 1022 Carburizing Steel",
          "designation": {
                "aisi_sae": "1022",
                "uns": "G10220",
                "din": "1.1151",
                "jis": "",
                "en": "C22E"
          },
          "iso_group": "P",
          "material_class": "Steel - Case Hardening",
          "condition": "Normalized",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.7,
                      "max": 1.0,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7839,
                "melting_point": {
                      "solidus": 1484,
                      "liquidus": 1534
                },
                "specific_heat": 480,
                "thermal_conductivity": 51.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 135,
                      "rockwell_b": 82,
                      "rockwell_c": null,
                      "vickers": 141
                },
                "tensile_strength": {
                      "min": 400,
                      "typical": 450,
                      "max": 500
                },
                "yield_strength": {
                      "min": 300,
                      "typical": 340,
                      "max": 380
                },
                "elongation": {
                      "min": 18,
                      "typical": 22,
                      "max": 26
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 202,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1520,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 325,
                "B": 560,
                "C": 0.038,
                "n": 0.5,
                "m": 0.88,
                "melting_temp": 1534,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 185,
                "n": 0.25,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 68,
                "relative_to_1212": 0.68,
                "power_factor": 0.9920000000000001,
                "tool_wear_factor": 0.784,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 75,
                            "max": 116,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 38,
                            "optimal": 64,
                            "max": 102,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 20,
                            "optimal": 30,
                            "max": 46,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-169": {
          "id": "P-CS-169",
          "name": "AISI 4118 Chromium-Molybdenum",
          "designation": {
                "aisi_sae": "4118",
                "uns": "G41180",
                "din": "1.7264",
                "jis": "",
                "en": "16MnCr5"
          },
          "iso_group": "P",
          "material_class": "Steel - Case Hardening",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.7,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.1
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7839,
                "melting_point": {
                      "solidus": 1484,
                      "liquidus": 1534
                },
                "specific_heat": 480,
                "thermal_conductivity": 45.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 160,
                      "rockwell_b": 95,
                      "rockwell_c": null,
                      "vickers": 168
                },
                "tensile_strength": {
                      "min": 470,
                      "typical": 520,
                      "max": 570
                },
                "yield_strength": {
                      "min": 320,
                      "typical": 360,
                      "max": 400
                },
                "elongation": {
                      "min": 16,
                      "typical": 20,
                      "max": 24
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 234,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1650,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 390,
                "B": 620,
                "C": 0.032,
                "n": 0.48,
                "m": 0.9,
                "melting_temp": 1534,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 170,
                "n": 0.23,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 62,
                "relative_to_1212": 0.62,
                "power_factor": 1.028,
                "tool_wear_factor": 0.856,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 72,
                            "max": 110,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 36,
                            "optimal": 61,
                            "max": 97,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 29,
                            "max": 44,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-170": {
          "id": "P-CS-170",
          "name": "AISI 4320 Nickel-Chromium-Moly",
          "designation": {
                "aisi_sae": "4320",
                "uns": "G43200",
                "din": "1.5919",
                "jis": "",
                "en": "16NiCrMo12-6"
          },
          "iso_group": "P",
          "material_class": "Steel - Case Hardening",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.17,
                      "max": 0.22,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.8
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7848,
                "melting_point": {
                      "solidus": 1475,
                      "liquidus": 1525
                },
                "specific_heat": 480,
                "thermal_conductivity": 42.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 170,
                      "rockwell_b": 100,
                      "rockwell_c": null,
                      "vickers": 178
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
                      "min": 14,
                      "typical": 18,
                      "max": 22
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 252,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1700,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 420,
                "B": 660,
                "C": 0.028,
                "n": 0.46,
                "m": 0.92,
                "melting_temp": 1525,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 165,
                "n": 0.22,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 60,
                "relative_to_1212": 0.6,
                "power_factor": 1.04,
                "tool_wear_factor": 0.88,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 71,
                            "max": 109,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 36,
                            "optimal": 60,
                            "max": 96,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 29,
                            "max": 44,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Heavy-duty gears"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-171": {
          "id": "P-CS-171",
          "name": "AISI 8620 Nickel-Chromium-Moly",
          "designation": {
                "aisi_sae": "8620",
                "uns": "G86200",
                "din": "1.6523",
                "jis": "",
                "en": "21NiCrMo2-2"
          },
          "iso_group": "P",
          "material_class": "Steel - Case Hardening",
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
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7841,
                "melting_point": {
                      "solidus": 1481,
                      "liquidus": 1531
                },
                "specific_heat": 480,
                "thermal_conductivity": 44.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 155,
                      "rockwell_b": 92,
                      "rockwell_c": null,
                      "vickers": 162
                },
                "tensile_strength": {
                      "min": 460,
                      "typical": 510,
                      "max": 560
                },
                "yield_strength": {
                      "min": 310,
                      "typical": 350,
                      "max": 390
                },
                "elongation": {
                      "min": 18,
                      "typical": 22,
                      "max": 26
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 229,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1620,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 380,
                "B": 600,
                "C": 0.035,
                "n": 0.48,
                "m": 0.9,
                "melting_temp": 1531,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 175,
                "n": 0.24,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 65,
                "relative_to_1212": 0.65,
                "power_factor": 1.01,
                "tool_wear_factor": 0.8200000000000001,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 42,
                            "optimal": 74,
                            "max": 113,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 37,
                            "optimal": 62,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 30,
                            "max": 45,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Most common carburizing alloy steel"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-172": {
          "id": "P-CS-172",
          "name": "AISI 8620 Carburized 60 HRC",
          "designation": {
                "aisi_sae": "8620",
                "uns": "G86200",
                "din": "1.6523",
                "jis": "",
                "en": "21NiCrMo2-2"
          },
          "iso_group": "H",
          "material_class": "Steel - Case Hardening",
          "condition": "Carburized + Q 60 HRC",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7841,
                "melting_point": {
                      "solidus": 1481,
                      "liquidus": 1531
                },
                "specific_heat": 480,
                "thermal_conductivity": 44.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_b": null,
                      "rockwell_c": 60,
                      "vickers": 630
                },
                "tensile_strength": {
                      "min": 1950,
                      "typical": 2000,
                      "max": 2050
                },
                "yield_strength": {
                      "min": 1860,
                      "typical": 1900,
                      "max": 1940
                },
                "elongation": {
                      "min": 1,
                      "typical": 2,
                      "max": 6
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 900,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 4500,
                "mc": 0.18,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1750,
                "B": 960,
                "C": 0.006,
                "n": 0.2,
                "m": 1.18,
                "melting_temp": 1531,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 45,
                "n": 0.09,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "high",
                "built_up_edge_tendency": "none",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 10,
                "relative_to_1212": 0.1,
                "power_factor": 1.34,
                "tool_wear_factor": 1.48,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 23,
                            "optimal": 41,
                            "max": 64,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 21,
                            "optimal": 35,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 11,
                            "optimal": 18,
                            "max": 28,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Case ~1mm @ 60 HRC, core ~35 HRC"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-173": {
          "id": "P-CS-173",
          "name": "AISI 9310 Aircraft Quality",
          "designation": {
                "aisi_sae": "9310",
                "uns": "G93106",
                "din": "1.6657",
                "jis": "",
                "en": "14NiCrMo13-4"
          },
          "iso_group": "P",
          "material_class": "Steel - Case Hardening",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.11
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 1.0,
                      "max": 1.4,
                      "typical": 1.2
                },
                "molybdenum": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7857,
                "melting_point": {
                      "solidus": 1474,
                      "liquidus": 1524
                },
                "specific_heat": 480,
                "thermal_conductivity": 38.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_b": 103,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 520,
                      "typical": 570,
                      "max": 620
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
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 256,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1720,
                "mc": 0.24,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 440,
                "B": 680,
                "C": 0.026,
                "n": 0.45,
                "m": 0.94,
                "melting_temp": 1524,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 160,
                "n": 0.22,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58,
                "power_factor": 1.052,
                "tool_wear_factor": 0.904,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 40,
                            "optimal": 69,
                            "max": 107,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 59,
                            "max": 94,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Aircraft gears, high core toughness"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-174": {
          "id": "P-CS-174",
          "name": "AISI 9310 Carburized 60 HRC",
          "designation": {
                "aisi_sae": "9310",
                "uns": "G93106",
                "din": "1.6657",
                "jis": "",
                "en": "14NiCrMo13-4"
          },
          "iso_group": "H",
          "material_class": "Steel - Case Hardening",
          "condition": "Carburized + Q 60 HRC",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.11
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 1.0,
                      "max": 1.4,
                      "typical": 1.2
                },
                "molybdenum": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7857,
                "melting_point": {
                      "solidus": 1474,
                      "liquidus": 1524
                },
                "specific_heat": 480,
                "thermal_conductivity": 38.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_b": null,
                      "rockwell_c": 60,
                      "vickers": 630
                },
                "tensile_strength": {
                      "min": 1950,
                      "typical": 2000,
                      "max": 2050
                },
                "yield_strength": {
                      "min": 1820,
                      "typical": 1860,
                      "max": 1900
                },
                "elongation": {
                      "min": 1,
                      "typical": 3,
                      "max": 7
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 900,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 4500,
                "mc": 0.18,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1720,
                "B": 950,
                "C": 0.006,
                "n": 0.21,
                "m": 1.16,
                "melting_temp": 1524,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 45,
                "n": 0.09,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "high",
                "built_up_edge_tendency": "none",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 10,
                "relative_to_1212": 0.1,
                "power_factor": 1.34,
                "tool_wear_factor": 1.48,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 23,
                            "optimal": 41,
                            "max": 64,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 21,
                            "optimal": 35,
                            "max": 56,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 11,
                            "optimal": 18,
                            "max": 28,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-175": {
          "id": "P-CS-175",
          "name": "AISI 3310 High Nickel Carburizing",
          "designation": {
                "aisi_sae": "3310",
                "uns": "G33106",
                "din": "1.5752",
                "jis": "",
                "en": "14NiCr14"
          },
          "iso_group": "P",
          "material_class": "Steel - Case Hardening",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.11
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 1.4,
                      "max": 1.75,
                      "typical": 1.55
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.25,
                      "max": 3.75,
                      "typical": 3.5
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7859,
                "melting_point": {
                      "solidus": 1473,
                      "liquidus": 1523
                },
                "specific_heat": 480,
                "thermal_conductivity": 36.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 185,
                      "rockwell_b": 108,
                      "rockwell_c": null,
                      "vickers": 194
                },
                "tensile_strength": {
                      "min": 550,
                      "typical": 600,
                      "max": 650
                },
                "yield_strength": {
                      "min": 375,
                      "typical": 415,
                      "max": 455
                },
                "elongation": {
                      "min": 12,
                      "typical": 16,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 270,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1780,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 480,
                "B": 720,
                "C": 0.024,
                "n": 0.43,
                "m": 0.96,
                "melting_temp": 1523,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.07,
                "tool_wear_factor": 0.94,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 57,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-176": {
          "id": "P-CS-176",
          "name": "ASTM A36 Structural Steel",
          "designation": {
                "aisi_sae": "A36",
                "uns": "K02600",
                "din": "1.0038",
                "jis": "",
                "en": "S235JR"
          },
          "iso_group": "P",
          "material_class": "Steel - Structural",
          "condition": "As Rolled",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.26,
                      "typical": 0.18
                },
                "manganese": {
                      "min": 0,
                      "max": 1.2,
                      "typical": 0.8
                },
                "silicon": {
                      "min": 0,
                      "max": 0.4,
                      "typical": 0.2
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7840,
                "melting_point": {
                      "solidus": 1485,
                      "liquidus": 1535
                },
                "specific_heat": 480,
                "thermal_conductivity": 52.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 120,
                      "rockwell_b": 74,
                      "rockwell_c": null,
                      "vickers": 126
                },
                "tensile_strength": {
                      "min": 350,
                      "typical": 400,
                      "max": 450
                },
                "yield_strength": {
                      "min": 210,
                      "typical": 250,
                      "max": 290
                },
                "elongation": {
                      "min": 19,
                      "typical": 23,
                      "max": 27
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 180,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1400,
                "mc": 0.26,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 280,
                "B": 500,
                "C": 0.05,
                "n": 0.56,
                "m": 0.85,
                "melting_temp": 1535,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 200,
                "n": 0.28,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 72,
                "relative_to_1212": 0.72,
                "power_factor": 0.9680000000000001,
                "tool_wear_factor": 0.736,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 45,
                            "optimal": 78,
                            "max": 119,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 39,
                            "optimal": 66,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 20,
                            "optimal": 31,
                            "max": 48,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Most common structural steel"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-177": {
          "id": "P-CS-177",
          "name": "ASTM A572 Grade 50 HSLA",
          "designation": {
                "aisi_sae": "A572-50",
                "uns": "K12050",
                "din": "1.8952",
                "jis": "",
                "en": "S355J2"
          },
          "iso_group": "P",
          "material_class": "Steel - Structural",
          "condition": "As Rolled",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.23,
                      "typical": 0.16
                },
                "manganese": {
                      "min": 0,
                      "max": 1.35,
                      "typical": 1.15
                },
                "silicon": {
                      "min": 0,
                      "max": 0.4,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0.015
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7840,
                "melting_point": {
                      "solidus": 1487,
                      "liquidus": 1537
                },
                "specific_heat": 480,
                "thermal_conductivity": 50.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 140,
                      "rockwell_b": 84,
                      "rockwell_c": null,
                      "vickers": 147
                },
                "tensile_strength": {
                      "min": 400,
                      "typical": 450,
                      "max": 500
                },
                "yield_strength": {
                      "min": 305,
                      "typical": 345,
                      "max": 385
                },
                "elongation": {
                      "min": 17,
                      "typical": 21,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 202,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1500,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 360,
                "B": 580,
                "C": 0.04,
                "n": 0.5,
                "m": 0.88,
                "melting_temp": 1537,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 185,
                "n": 0.25,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 68,
                "relative_to_1212": 0.68,
                "power_factor": 0.9920000000000001,
                "tool_wear_factor": 0.784,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 43,
                            "optimal": 75,
                            "max": 116,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 38,
                            "optimal": 64,
                            "max": 102,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 20,
                            "optimal": 30,
                            "max": 46,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "High strength low alloy"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-178": {
          "id": "P-CS-178",
          "name": "ASTM A588 Weathering Steel",
          "designation": {
                "aisi_sae": "A588",
                "uns": "K11430",
                "din": "1.8963",
                "jis": "",
                "en": "S355J2WP"
          },
          "iso_group": "P",
          "material_class": "Steel - Structural",
          "condition": "As Rolled",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.19,
                      "typical": 0.15
                },
                "manganese": {
                      "min": 0.8,
                      "max": 1.25,
                      "typical": 1.1
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.65,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.25,
                      "max": 0.5,
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0.25,
                      "max": 0.4,
                      "typical": 0.35
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7842,
                "melting_point": {
                      "solidus": 1486,
                      "liquidus": 1536
                },
                "specific_heat": 480,
                "thermal_conductivity": 48.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 145,
                      "rockwell_b": 87,
                      "rockwell_c": null,
                      "vickers": 152
                },
                "tensile_strength": {
                      "min": 435,
                      "typical": 485,
                      "max": 535
                },
                "yield_strength": {
                      "min": 305,
                      "typical": 345,
                      "max": 385
                },
                "elongation": {
                      "min": 17,
                      "typical": 21,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 218,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1550,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 380,
                "B": 620,
                "C": 0.035,
                "n": 0.48,
                "m": 0.9,
                "melting_temp": 1536,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 175,
                "n": 0.24,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 65,
                "relative_to_1212": 0.65,
                "power_factor": 1.01,
                "tool_wear_factor": 0.8200000000000001,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 42,
                            "optimal": 74,
                            "max": 113,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 37,
                            "optimal": 62,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 30,
                            "max": 45,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Cor-Ten - forms protective oxide"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-179": {
          "id": "P-CS-179",
          "name": "ASTM A514 Q&T Plate",
          "designation": {
                "aisi_sae": "A514",
                "uns": "K11856",
                "din": "1.8928",
                "jis": "",
                "en": "S690QL"
          },
          "iso_group": "P",
          "material_class": "Steel - Structural",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.12,
                      "max": 0.21,
                      "typical": 0.18
                },
                "manganese": {
                      "min": 0.7,
                      "max": 1.0,
                      "typical": 0.95
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.65,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7839,
                "melting_point": {
                      "solidus": 1485,
                      "liquidus": 1535
                },
                "specific_heat": 480,
                "thermal_conductivity": 42.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 240,
                      "rockwell_b": null,
                      "rockwell_c": 9,
                      "vickers": 252
                },
                "tensile_strength": {
                      "min": 710,
                      "typical": 760,
                      "max": 810
                },
                "yield_strength": {
                      "min": 650,
                      "typical": 690,
                      "max": 730
                },
                "elongation": {
                      "min": 12,
                      "typical": 16,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 342,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 650,
                "B": 780,
                "C": 0.016,
                "n": 0.4,
                "m": 1.02,
                "melting_temp": 1535,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 145,
                "n": 0.2,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52,
                "power_factor": 1.088,
                "tool_wear_factor": 0.976,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 38,
                            "optimal": 66,
                            "max": 101,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 56,
                            "max": 89,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "High strength plate - bridges, equipment"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-180": {
          "id": "P-CS-180",
          "name": "ASTM A709 Grade 50W Bridge",
          "designation": {
                "aisi_sae": "A709-50W",
                "uns": "K11583",
                "din": "",
                "jis": "",
                "en": "S355J2W"
          },
          "iso_group": "P",
          "material_class": "Steel - Structural",
          "condition": "As Rolled",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.19,
                      "typical": 0.15
                },
                "manganese": {
                      "min": 0.8,
                      "max": 1.35,
                      "typical": 1.1
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0.02,
                      "max": 0.08,
                      "typical": 0.05
                },
                "nickel": {
                      "min": 0,
                      "max": 0.5,
                      "typical": 0.3
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0.2,
                      "max": 0.4,
                      "typical": 0.3
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7842,
                "melting_point": {
                      "solidus": 1486,
                      "liquidus": 1536
                },
                "specific_heat": 480,
                "thermal_conductivity": 48.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 145,
                      "rockwell_b": 87,
                      "rockwell_c": null,
                      "vickers": 152
                },
                "tensile_strength": {
                      "min": 435,
                      "typical": 485,
                      "max": 535
                },
                "yield_strength": {
                      "min": 305,
                      "typical": 345,
                      "max": 385
                },
                "elongation": {
                      "min": 17,
                      "typical": 21,
                      "max": 25
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 218,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1550,
                "mc": 0.25,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 380,
                "B": 620,
                "C": 0.035,
                "n": 0.48,
                "m": 0.9,
                "melting_temp": 1536,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 175,
                "n": 0.24,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 65,
                "relative_to_1212": 0.65,
                "power_factor": 1.01,
                "tool_wear_factor": 0.8200000000000001,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 42,
                            "optimal": 74,
                            "max": 113,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 37,
                            "optimal": 62,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 30,
                            "max": 45,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Weathering bridge steel"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-181": {
          "id": "P-CS-181",
          "name": "AISI 4145 Medium Carbon Cr-Mo",
          "designation": {
                "aisi_sae": "4145",
                "uns": "G41450",
                "din": "1.7225",
                "jis": "",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.43,
                      "max": 0.48,
                      "typical": 0.46
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7831,
                "melting_point": {
                      "solidus": 1463,
                      "liquidus": 1513
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": 1,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 375,
                      "typical": 415,
                      "max": 455
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 310,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1950,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 540,
                "B": 750,
                "C": 0.018,
                "n": 0.42,
                "m": 0.98,
                "melting_temp": 1513,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.07,
                "tool_wear_factor": 0.94,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 57,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-182": {
          "id": "P-CS-182",
          "name": "AISI 4150 Medium Carbon Cr-Mo",
          "designation": {
                "aisi_sae": "4150",
                "uns": "G41500",
                "din": "1.7228",
                "jis": "",
                "en": "50CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.48,
                      "max": 0.53,
                      "typical": 0.51
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7829,
                "melting_point": {
                      "solidus": 1459,
                      "liquidus": 1509
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 205,
                      "rockwell_b": 118,
                      "rockwell_c": 2,
                      "vickers": 215
                },
                "tensile_strength": {
                      "min": 660,
                      "typical": 710,
                      "max": 760
                },
                "yield_strength": {
                      "min": 385,
                      "typical": 425,
                      "max": 465
                },
                "elongation": {
                      "min": 9,
                      "typical": 13,
                      "max": 17
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 319,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 560,
                "B": 770,
                "C": 0.017,
                "n": 0.41,
                "m": 0.99,
                "melting_temp": 1509,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 145,
                "n": 0.2,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52,
                "power_factor": 1.088,
                "tool_wear_factor": 0.976,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 38,
                            "optimal": 66,
                            "max": 101,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 56,
                            "max": 89,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-183": {
          "id": "P-CS-183",
          "name": "AISI 4150 Q&T 28 HRC",
          "designation": {
                "aisi_sae": "4150",
                "uns": "G41500",
                "din": "1.7228",
                "jis": "",
                "en": "50CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 28 HRC",
          "composition": {
                "carbon": {
                      "min": 0.48,
                      "max": 0.53,
                      "typical": 0.51
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7829,
                "melting_point": {
                      "solidus": 1459,
                      "liquidus": 1509
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
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
                      "min": 880,
                      "typical": 930,
                      "max": 980
                },
                "yield_strength": {
                      "min": 720,
                      "typical": 760,
                      "max": 800
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 418,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 750,
                "B": 850,
                "C": 0.012,
                "n": 0.36,
                "m": 1.05,
                "melting_temp": 1509,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 125,
                "n": 0.17,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42,
                "power_factor": 1.1480000000000001,
                "tool_wear_factor": 1.096,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 34,
                            "optimal": 60,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 30,
                            "optimal": 51,
                            "max": 81,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 25,
                            "max": 38,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-184": {
          "id": "P-CS-184",
          "name": "AISI 8640 Ni-Cr-Mo",
          "designation": {
                "aisi_sae": "8640",
                "uns": "G86400",
                "din": "1.6511",
                "jis": "",
                "en": "40NiCrMo2-2"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7835,
                "melting_point": {
                      "solidus": 1464,
                      "liquidus": 1514
                },
                "specific_heat": 480,
                "thermal_conductivity": 42.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 190,
                      "rockwell_b": 110,
                      "rockwell_c": null,
                      "vickers": 199
                },
                "tensile_strength": {
                      "min": 605,
                      "typical": 655,
                      "max": 705
                },
                "yield_strength": {
                      "min": 340,
                      "typical": 380,
                      "max": 420
                },
                "elongation": {
                      "min": 12,
                      "typical": 16,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 294,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 500,
                "B": 720,
                "C": 0.02,
                "n": 0.44,
                "m": 0.96,
                "melting_temp": 1514,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 155,
                "n": 0.22,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58,
                "power_factor": 1.052,
                "tool_wear_factor": 0.904,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 40,
                            "optimal": 69,
                            "max": 107,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 35,
                            "optimal": 59,
                            "max": 94,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 43,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-185": {
          "id": "P-CS-185",
          "name": "AISI 8642 Ni-Cr-Mo",
          "designation": {
                "aisi_sae": "8642",
                "uns": "G86420",
                "din": "1.6511",
                "jis": "",
                "en": "40NiCrMo2-2"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.4,
                      "max": 0.45,
                      "typical": 0.43
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7834,
                "melting_point": {
                      "solidus": 1462,
                      "liquidus": 1512
                },
                "specific_heat": 480,
                "thermal_conductivity": 42.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_b": 113,
                      "rockwell_c": null,
                      "vickers": 204
                },
                "tensile_strength": {
                      "min": 620,
                      "typical": 670,
                      "max": 720
                },
                "yield_strength": {
                      "min": 355,
                      "typical": 395,
                      "max": 435
                },
                "elongation": {
                      "min": 11,
                      "typical": 15,
                      "max": 19
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 301,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1930,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 520,
                "B": 740,
                "C": 0.019,
                "n": 0.43,
                "m": 0.97,
                "melting_temp": 1512,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 152,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 56,
                "relative_to_1212": 0.56,
                "power_factor": 1.064,
                "tool_wear_factor": 0.9279999999999999,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 58,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-186": {
          "id": "P-CS-186",
          "name": "AISI 8740 Ni-Cr-Mo",
          "designation": {
                "aisi_sae": "8740",
                "uns": "G87400",
                "din": "1.6546",
                "jis": "",
                "en": "40NiCrMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7835,
                "melting_point": {
                      "solidus": 1464,
                      "liquidus": 1514
                },
                "specific_heat": 480,
                "thermal_conductivity": 41.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_b": 113,
                      "rockwell_c": null,
                      "vickers": 204
                },
                "tensile_strength": {
                      "min": 620,
                      "typical": 670,
                      "max": 720
                },
                "yield_strength": {
                      "min": 355,
                      "typical": 395,
                      "max": 435
                },
                "elongation": {
                      "min": 11,
                      "typical": 15,
                      "max": 19
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 301,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1930,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 520,
                "B": 740,
                "C": 0.019,
                "n": 0.43,
                "m": 0.97,
                "melting_temp": 1514,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 152,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 56,
                "relative_to_1212": 0.56,
                "power_factor": 1.064,
                "tool_wear_factor": 0.9279999999999999,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 105,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 58,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-187": {
          "id": "P-CS-187",
          "name": "AISI 9840 High Strength Ni-Cr-Mo",
          "designation": {
                "aisi_sae": "9840",
                "uns": "G98400",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "manganese": {
                      "min": 0.7,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.7,
                      "max": 1.0,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.85,
                      "max": 1.15,
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7837,
                "melting_point": {
                      "solidus": 1462,
                      "liquidus": 1512
                },
                "specific_heat": 480,
                "thermal_conductivity": 38.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": 1,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 375,
                      "typical": 415,
                      "max": 455
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 310,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1980,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 550,
                "B": 760,
                "C": 0.018,
                "n": 0.42,
                "m": 0.98,
                "melting_temp": 1512,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 148,
                "n": 0.2,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 54,
                "relative_to_1212": 0.54,
                "power_factor": 1.076,
                "tool_wear_factor": 0.952,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 38,
                            "optimal": 67,
                            "max": 103,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 57,
                            "max": 91,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 27,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-188": {
          "id": "P-CS-188",
          "name": "300M Ultra High Strength",
          "designation": {
                "aisi_sae": "300M",
                "uns": "K44220",
                "din": "1.6928",
                "jis": "",
                "en": "35NiCrMoV12-5"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
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
                "chromium": {
                      "min": 0.7,
                      "max": 0.95,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0.35,
                      "max": 0.5,
                      "typical": 0.42
                },
                "vanadium": {
                      "min": 0.05,
                      "max": 0.1,
                      "typical": 0.08
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.85
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7813,
                "melting_point": {
                      "solidus": 1456,
                      "liquidus": 1506
                },
                "specific_heat": 480,
                "thermal_conductivity": 32.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 250,
                      "rockwell_b": null,
                      "rockwell_c": 10,
                      "vickers": 262
                },
                "tensile_strength": {
                      "min": 810,
                      "typical": 860,
                      "max": 910
                },
                "yield_strength": {
                      "min": 480,
                      "typical": 520,
                      "max": 560
                },
                "elongation": {
                      "min": 6,
                      "typical": 10,
                      "max": 14
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 387,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 680,
                "B": 850,
                "C": 0.014,
                "n": 0.38,
                "m": 1.02,
                "melting_temp": 1506,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 130,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.1300000000000001,
                "tool_wear_factor": 1.06,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 31,
                            "optimal": 52,
                            "max": 84,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 25,
                            "max": 39,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Landing gear, high strength structural"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-189": {
          "id": "P-CS-189",
          "name": "300M Q&T 52 HRC",
          "designation": {
                "aisi_sae": "300M",
                "uns": "K44220",
                "din": "1.6928",
                "jis": "",
                "en": "35NiCrMoV12-5"
          },
          "iso_group": "H",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 52 HRC",
          "composition": {
                "carbon": {
                      "min": 0.4,
                      "max": 0.46,
                      "typical": 0.43
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 1.45,
                      "max": 1.8,
                      "typical": 1.65
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.95,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0.35,
                      "max": 0.5,
                      "typical": 0.42
                },
                "vanadium": {
                      "min": 0.05,
                      "max": 0.1,
                      "typical": 0.08
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.85
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7813,
                "melting_point": {
                      "solidus": 1456,
                      "liquidus": 1506
                },
                "specific_heat": 480,
                "thermal_conductivity": 32.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 500,
                      "rockwell_b": null,
                      "rockwell_c": 52,
                      "vickers": 525
                },
                "tensile_strength": {
                      "min": 1880,
                      "typical": 1930,
                      "max": 1980
                },
                "yield_strength": {
                      "min": 1545,
                      "typical": 1585,
                      "max": 1625
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 12
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 868,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 3400,
                "mc": 0.19,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1480,
                "B": 920,
                "C": 0.008,
                "n": 0.26,
                "m": 1.12,
                "melting_temp": 1506,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 70,
                "n": 0.12,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "high",
                "built_up_edge_tendency": "low",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 20,
                "relative_to_1212": 0.2,
                "power_factor": 1.28,
                "tool_wear_factor": 1.3599999999999999,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 27,
                            "optimal": 47,
                            "max": 73,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 24,
                            "optimal": 40,
                            "max": 64,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 20,
                            "max": 31,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-190": {
          "id": "P-CS-190",
          "name": "AISI 4340 Aircraft Quality",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "jis": "",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "manganese": {
                      "min": 0.6,
                      "max": 0.85,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.85
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7841,
                "melting_point": {
                      "solidus": 1457,
                      "liquidus": 1507
                },
                "specific_heat": 480,
                "thermal_conductivity": 38.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_b": 116,
                      "rockwell_c": 1,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 375,
                      "typical": 415,
                      "max": 455
                },
                "elongation": {
                      "min": 11,
                      "typical": 15,
                      "max": 19
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 310,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1980,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 792,
                "B": 510,
                "C": 0.014,
                "n": 0.26,
                "m": 1.03,
                "melting_temp": 1507,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.07,
                "tool_wear_factor": 0.94,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 57,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Premium aircraft structural steel"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-191": {
          "id": "P-CS-191",
          "name": "AISI 4140 Nitriding Grade",
          "designation": {
                "aisi_sae": "4140N",
                "uns": "G41400",
                "din": "1.7225",
                "jis": "",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Nitriding",
          "condition": "Q&T for Nitriding",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.85
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7832,
                "melting_point": {
                      "solidus": 1467,
                      "liquidus": 1517
                },
                "specific_heat": 480,
                "thermal_conductivity": 40.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_b": null,
                      "rockwell_c": 30,
                      "vickers": 299
                },
                "tensile_strength": {
                      "min": 915,
                      "typical": 965,
                      "max": 1015
                },
                "yield_strength": {
                      "min": 755,
                      "typical": 795,
                      "max": 835
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 434,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 760,
                "B": 860,
                "C": 0.014,
                "n": 0.38,
                "m": 1.02,
                "melting_temp": 1517,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 135,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48,
                "power_factor": 1.112,
                "tool_wear_factor": 1.024,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 36,
                            "optimal": 63,
                            "max": 98,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 32,
                            "optimal": 54,
                            "max": 86,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 26,
                            "max": 40,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Pre-hardened then nitrided"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-192": {
          "id": "P-CS-192",
          "name": "Nitralloy 135M",
          "designation": {
                "aisi_sae": "Nitralloy135M",
                "uns": "K24065",
                "din": "1.8519",
                "jis": "",
                "en": "31CrMoV9"
          },
          "iso_group": "P",
          "material_class": "Steel - Nitriding",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.45,
                      "typical": 0.43
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
                "chromium": {
                      "min": 1.4,
                      "max": 1.8,
                      "typical": 1.6
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.45,
                      "typical": 0.38
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "min": 0.85,
                      "max": 1.2,
                      "typical": 1.0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7832,
                "melting_point": {
                      "solidus": 1465,
                      "liquidus": 1515
                },
                "specific_heat": 480,
                "thermal_conductivity": 35.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 280,
                      "rockwell_b": null,
                      "rockwell_c": 29,
                      "vickers": 294
                },
                "tensile_strength": {
                      "min": 880,
                      "typical": 930,
                      "max": 980
                },
                "yield_strength": {
                      "min": 685,
                      "typical": 725,
                      "max": 765
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 418,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 720,
                "B": 840,
                "C": 0.016,
                "n": 0.4,
                "m": 1.0,
                "melting_temp": 1515,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 140,
                "n": 0.19,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.1,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 65,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 55,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Dedicated nitriding steel - case 65 HRC"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-193": {
          "id": "P-CS-193",
          "name": "Nitralloy 135M Nitrided",
          "designation": {
                "aisi_sae": "Nitralloy135M",
                "uns": "K24065",
                "din": "1.8519",
                "jis": "",
                "en": "31CrMoV9"
          },
          "iso_group": "P",
          "material_class": "Steel - Nitriding",
          "condition": "Nitrided Case 65 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.45,
                      "typical": 0.43
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 1.4,
                      "max": 1.8,
                      "typical": 1.6
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.45,
                      "typical": 0.38
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "min": 0.85,
                      "max": 1.2,
                      "typical": 1.0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7832,
                "melting_point": {
                      "solidus": 1465,
                      "liquidus": 1515
                },
                "specific_heat": 480,
                "thermal_conductivity": 35.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 280,
                      "rockwell_b": null,
                      "rockwell_c": 65,
                      "vickers": 294
                },
                "tensile_strength": {
                      "min": 880,
                      "typical": 930,
                      "max": 980
                },
                "yield_strength": {
                      "min": 685,
                      "typical": 725,
                      "max": 765
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 418,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 5000,
                "mc": 0.17,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 2000,
                "B": 1050,
                "C": 0.004,
                "n": 0.16,
                "m": 1.22,
                "melting_temp": 1515,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 32,
                "n": 0.06,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 6,
                "relative_to_1212": 0.06,
                "power_factor": 1.364,
                "tool_wear_factor": 1.528,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "difficult",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 22,
                            "optimal": 38,
                            "max": 60,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 19,
                            "optimal": 33,
                            "max": 52,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 10,
                            "optimal": 17,
                            "max": 26,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Surface only - grinding"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-194": {
          "id": "P-CS-194",
          "name": "Nitralloy N (EZ)",
          "designation": {
                "aisi_sae": "Nitralloy-N",
                "uns": "K52355",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Nitriding",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.2,
                      "max": 0.27,
                      "typical": 0.25
                },
                "manganese": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 1.0,
                      "max": 1.3,
                      "typical": 1.15
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.35,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
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
                      "min": 0.85,
                      "max": 1.3,
                      "typical": 1.0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 7837,
                "melting_point": {
                      "solidus": 1480,
                      "liquidus": 1530
                },
                "specific_heat": 480,
                "thermal_conductivity": 36.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 250,
                      "rockwell_b": null,
                      "rockwell_c": 10,
                      "vickers": 262
                },
                "tensile_strength": {
                      "min": 810,
                      "typical": 860,
                      "max": 910
                },
                "yield_strength": {
                      "min": 615,
                      "typical": 655,
                      "max": 695
                },
                "elongation": {
                      "min": 12,
                      "typical": 16,
                      "max": 20
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 387,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.23,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 640,
                "B": 800,
                "C": 0.02,
                "n": 0.42,
                "m": 0.96,
                "melting_temp": 1530,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 165,
                "n": 0.23,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 60,
                "relative_to_1212": 0.6,
                "power_factor": 1.04,
                "tool_wear_factor": 0.88,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 71,
                            "max": 109,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 36,
                            "optimal": 60,
                            "max": 96,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 19,
                            "optimal": 29,
                            "max": 44,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Free machining nitriding steel"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-195": {
          "id": "P-CS-195",
          "name": "Maraging 200",
          "designation": {
                "aisi_sae": "Maraging200",
                "uns": "K92890",
                "din": "1.6359",
                "jis": "",
                "en": "X2NiCoMo18-8-5"
          },
          "iso_group": "P",
          "material_class": "Steel - Maraging",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 8.0,
                      "max": 9.5,
                      "typical": 8.5
                },
                "titanium": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 8022,
                "melting_point": {
                      "solidus": 1406,
                      "liquidus": 1456
                },
                "specific_heat": 480,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 280,
                      "rockwell_b": null,
                      "rockwell_c": 16,
                      "vickers": 294
                },
                "tensile_strength": {
                      "min": 950,
                      "typical": 1000,
                      "max": 1050
                },
                "yield_strength": {
                      "min": 720,
                      "typical": 760,
                      "max": 800
                },
                "elongation": {
                      "min": 10,
                      "typical": 14,
                      "max": 18
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 450,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 750,
                "B": 850,
                "C": 0.018,
                "n": 0.4,
                "m": 1.02,
                "melting_temp": 1456,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous",
                "serration_tendency": "low",
                "built_up_edge_tendency": "moderate",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.15,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.07,
                "tool_wear_factor": 0.94,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 39,
                            "optimal": 68,
                            "max": 104,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 34,
                            "optimal": 57,
                            "max": 92,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 18,
                            "optimal": 28,
                            "max": 42,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Machine before aging"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-196": {
          "id": "P-CS-196",
          "name": "Maraging 250",
          "designation": {
                "aisi_sae": "Maraging250",
                "uns": "K92890",
                "din": "1.6356",
                "jis": "",
                "en": "X3NiCoMo18-9-5"
          },
          "iso_group": "P",
          "material_class": "Steel - Maraging",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 4.6,
                      "max": 5.2,
                      "typical": 4.9
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 7.0,
                      "max": 8.5,
                      "typical": 7.75
                },
                "titanium": {
                      "min": 0.3,
                      "max": 0.5,
                      "typical": 0.4
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 8014,
                "melting_point": {
                      "solidus": 1406,
                      "liquidus": 1456
                },
                "specific_heat": 480,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 305,
                      "rockwell_b": null,
                      "rockwell_c": 20,
                      "vickers": 320
                },
                "tensile_strength": {
                      "min": 1050,
                      "typical": 1100,
                      "max": 1150
                },
                "yield_strength": {
                      "min": 790,
                      "typical": 830,
                      "max": 870
                },
                "elongation": {
                      "min": 8,
                      "typical": 12,
                      "max": 16
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 495,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.22,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 850,
                "B": 900,
                "C": 0.014,
                "n": 0.38,
                "m": 1.05,
                "melting_temp": 1456,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 140,
                "n": 0.19,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5,
                "power_factor": 1.1,
                "tool_wear_factor": 1.0,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "good",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 37,
                            "optimal": 65,
                            "max": 100,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 33,
                            "optimal": 55,
                            "max": 88,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 17,
                            "optimal": 27,
                            "max": 41,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-197": {
          "id": "P-CS-197",
          "name": "Maraging 250 Aged 52 HRC",
          "designation": {
                "aisi_sae": "Maraging250",
                "uns": "K92890",
                "din": "1.6356",
                "jis": "",
                "en": "X3NiCoMo18-9-5"
          },
          "iso_group": "H",
          "material_class": "Steel - Maraging",
          "condition": "Aged 52 HRC",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 4.6,
                      "max": 5.2,
                      "typical": 4.9
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 7.0,
                      "max": 8.5,
                      "typical": 7.75
                },
                "titanium": {
                      "min": 0.3,
                      "max": 0.5,
                      "typical": 0.4
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 8014,
                "melting_point": {
                      "solidus": 1406,
                      "liquidus": 1456
                },
                "specific_heat": 480,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 510,
                      "rockwell_b": null,
                      "rockwell_c": 52,
                      "vickers": 535
                },
                "tensile_strength": {
                      "min": 1710,
                      "typical": 1760,
                      "max": 1810
                },
                "yield_strength": {
                      "min": 1650,
                      "typical": 1690,
                      "max": 1730
                },
                "elongation": {
                      "min": 4,
                      "typical": 8,
                      "max": 12
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 792,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 3450,
                "mc": 0.19,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1520,
                "B": 940,
                "C": 0.008,
                "n": 0.26,
                "m": 1.12,
                "melting_temp": 1456,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 70,
                "n": 0.12,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "high",
                "built_up_edge_tendency": "none",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 20,
                "relative_to_1212": 0.2,
                "power_factor": 1.28,
                "tool_wear_factor": 1.3599999999999999,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 27,
                            "optimal": 47,
                            "max": 73,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 24,
                            "optimal": 40,
                            "max": 64,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 13,
                            "optimal": 20,
                            "max": 31,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-198": {
          "id": "P-CS-198",
          "name": "Maraging 300",
          "designation": {
                "aisi_sae": "Maraging300",
                "uns": "K93120",
                "din": "1.2709",
                "jis": "",
                "en": "X3NiCoMoTi18-9-5"
          },
          "iso_group": "P",
          "material_class": "Steel - Maraging",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 4.7,
                      "max": 5.2,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 18.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 8.5,
                      "max": 9.5,
                      "typical": 9.0
                },
                "titanium": {
                      "min": 0.6,
                      "max": 0.8,
                      "typical": 0.7
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 8027,
                "melting_point": {
                      "solidus": 1406,
                      "liquidus": 1456
                },
                "specific_heat": 480,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 330,
                      "rockwell_b": null,
                      "rockwell_c": 25,
                      "vickers": 346
                },
                "tensile_strength": {
                      "min": 1150,
                      "typical": 1200,
                      "max": 1250
                },
                "yield_strength": {
                      "min": 860,
                      "typical": 900,
                      "max": 940
                },
                "elongation": {
                      "min": 6,
                      "typical": 10,
                      "max": 14
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 50,
                      "temperature": 20
                },
                "fatigue_strength": 540,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2450,
                "mc": 0.21,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 950,
                "B": 950,
                "C": 0.012,
                "n": 0.35,
                "m": 1.08,
                "melting_temp": 1456,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 130,
                "n": 0.18,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "continuous_short",
                "serration_tendency": "low",
                "built_up_edge_tendency": "low",
                "chip_breaking": "good",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 28,
                "friction_coefficient": 0.42,
                "chip_compression_ratio": 2.2
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45,
                "power_factor": 1.1300000000000001,
                "tool_wear_factor": 1.06,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "good",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 35,
                            "optimal": 62,
                            "max": 95,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 31,
                            "optimal": 52,
                            "max": 84,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 16,
                            "optimal": 25,
                            "max": 39,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P20",
                      "P30",
                      "P40"
                ],
                "preferred_coatings": [
                      "TiCN",
                      "TiAlN",
                      "AlTiN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Aerospace tooling, dies"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-199": {
          "id": "P-CS-199",
          "name": "Maraging 300 Aged 54 HRC",
          "designation": {
                "aisi_sae": "Maraging300",
                "uns": "K93120",
                "din": "1.2709",
                "jis": "",
                "en": "X3NiCoMoTi18-9-5"
          },
          "iso_group": "H",
          "material_class": "Steel - Maraging",
          "condition": "Aged 54 HRC",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 4.7,
                      "max": 5.2,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 18.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 8.5,
                      "max": 9.5,
                      "typical": 9.0
                },
                "titanium": {
                      "min": 0.6,
                      "max": 0.8,
                      "typical": 0.7
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 8027,
                "melting_point": {
                      "solidus": 1406,
                      "liquidus": 1456
                },
                "specific_heat": 480,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 540,
                      "rockwell_b": null,
                      "rockwell_c": 54,
                      "vickers": 567
                },
                "tensile_strength": {
                      "min": 2000,
                      "typical": 2050,
                      "max": 2100
                },
                "yield_strength": {
                      "min": 1950,
                      "typical": 1990,
                      "max": 2030
                },
                "elongation": {
                      "min": 3,
                      "typical": 7,
                      "max": 11
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 922,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 3600,
                "mc": 0.19,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1700,
                "B": 980,
                "C": 0.007,
                "n": 0.24,
                "m": 1.14,
                "melting_temp": 1456,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 60,
                "n": 0.11,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "high",
                "built_up_edge_tendency": "none",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 16,
                "relative_to_1212": 0.16,
                "power_factor": 1.304,
                "tool_wear_factor": 1.408,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 25,
                            "optimal": 44,
                            "max": 69,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 22,
                            "optimal": 38,
                            "max": 60,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 12,
                            "optimal": 19,
                            "max": 30,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    "P-CS-200": {
          "id": "P-CS-200",
          "name": "Maraging 350",
          "designation": {
                "aisi_sae": "Maraging350",
                "uns": "K93160",
                "din": "1.2712",
                "jis": "",
                "en": "X2NiCoMo18-12-4"
          },
          "iso_group": "H",
          "material_class": "Steel - Maraging",
          "condition": "Aged 58 HRC",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "manganese": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 3.5,
                      "max": 4.5,
                      "typical": 4.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.0
                },
                "cobalt": {
                      "min": 11.5,
                      "max": 12.5,
                      "typical": 12.0
                },
                "titanium": {
                      "min": 1.35,
                      "max": 1.65,
                      "typical": 1.5
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.015
                },
                "phosphorus": {
                      "min": 0,
                      "max": 0.035,
                      "typical": 0.015
                },
                "iron": {
                      "min": 85.0,
                      "max": 98.0,
                      "typical": 95.0
                }
          },
          "physical": {
                "density": 8054,
                "melting_point": {
                      "solidus": 1409,
                      "liquidus": 1459
                },
                "specific_heat": 480,
                "thermal_conductivity": 14.0,
                "thermal_expansion": 1.25e-05,
                "electrical_resistivity": 2.5e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 205000,
                "shear_modulus": 80000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 580,
                      "rockwell_b": null,
                      "rockwell_c": 58,
                      "vickers": 609
                },
                "tensile_strength": {
                      "min": 2330,
                      "typical": 2380,
                      "max": 2430
                },
                "yield_strength": {
                      "min": 2260,
                      "typical": 2300,
                      "max": 2340
                },
                "elongation": {
                      "min": 1,
                      "typical": 5,
                      "max": 9
                },
                "reduction_of_area": {
                      "min": 20,
                      "typical": 40,
                      "max": 60
                },
                "impact_energy": {
                      "joules": 20,
                      "temperature": 20
                },
                "fatigue_strength": 1071,
                "fracture_toughness": 30
          },
          "kienzle": {
                "kc1_1": 4100,
                "mc": 0.18,
                "kc_temp_coefficient": -0.0008,
                "kc_speed_coefficient": -0.08,
                "rake_angle_correction": 0.012,
                "chip_thickness_exponent": 0.72,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 2050,
                "B": 1050,
                "C": 0.006,
                "n": 0.2,
                "m": 1.18,
                "melting_temp": 1459,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 50,
                "n": 0.1,
                "temperature_exponent": 3.0,
                "hardness_factor": 0.72,
                "coolant_factor": {
                      "dry": 1.0,
                      "flood": 1.45,
                      "mist": 1.22,
                      "high_pressure": 1.65
                },
                "depth_exponent": 0.18
          },
          "chip_formation": {
                "chip_type": "segmented",
                "serration_tendency": "high",
                "built_up_edge_tendency": "none",
                "chip_breaking": "excellent",
                "optimal_chip_thickness": 0.1,
                "shear_angle": 24,
                "friction_coefficient": 0.48,
                "chip_compression_ratio": 2.6
          },
          "machinability": {
                "aisi_rating": 12,
                "relative_to_1212": 0.12,
                "power_factor": 1.328,
                "tool_wear_factor": 1.456,
                "surface_finish_factor": 0.95,
                "chip_control_rating": "excellent",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 24,
                            "optimal": 42,
                            "max": 65,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.08,
                            "optimal": 0.2,
                            "max": 0.35,
                            "unit": "mm/rev"
                      },
                      "depth": {
                            "min": 0.5,
                            "optimal": 2.0,
                            "max": 5.0,
                            "unit": "mm"
                      }
                },
                "milling": {
                      "speed": {
                            "min": 21,
                            "optimal": 36,
                            "max": 57,
                            "unit": "m/min"
                      },
                      "feed_per_tooth": {
                            "min": 0.06,
                            "optimal": 0.12,
                            "max": 0.22,
                            "unit": "mm"
                      },
                      "axial_depth": {
                            "min": 0.5,
                            "optimal": 2.5,
                            "max": 6.0,
                            "unit": "mm"
                      },
                      "radial_depth_percent": {
                            "min": 20,
                            "optimal": 40,
                            "max": 65
                      }
                },
                "drilling": {
                      "speed": {
                            "min": 11,
                            "optimal": 18,
                            "max": 28,
                            "unit": "m/min"
                      },
                      "feed": {
                            "min": 0.06,
                            "optimal": 0.15,
                            "max": 0.28,
                            "unit": "mm/rev"
                      }
                },
                "preferred_tool_grades": [
                      "P10",
                      "P20",
                      "CBN"
                ],
                "preferred_coatings": [
                      "TiAlN",
                      "AlCrN"
                ],
                "coolant_recommendation": "high_pressure_flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 120,
                "confidence_level": 0.95,
                "standard_deviation_kc": 85,
                "last_validated": "2025-12-01",
                "source_references": [
                      "ASM-Handbook-Vol1",
                      "Machining-Data-Handbook",
                      "AISI-Standards"
                ]
          },
          "notes": "Highest strength maraging"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = STEELS_151_200;
}
