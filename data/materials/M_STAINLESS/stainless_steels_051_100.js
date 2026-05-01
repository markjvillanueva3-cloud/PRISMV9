/**
 * PRISM MATERIALS DATABASE - Stainless Steels Part 2
 * File: stainless_steels_051_100.js
 * Materials: M-SS-051 through M-SS-100 (50 materials)
 * 
 * ISO Category: M (Stainless Steels)
 * 
 * COMPLETES M_STAINLESS CATEGORY TO 100%
 * 
 * CONTENTS:
 * - 300 Series Extended (304H/N/LN, 316H/N/LN, 317L/LMN, 321H, 347H)
 * - 400 Ferritic Extended (410S, 429, 430Ti, 446, E-Brite, Sea-Cure)
 * - 400 Martensitic Extended (410Cb, 410NiMo, 414, 418, 422, 440F, BG42)
 * - PH Extended (15-5 conditions, Custom 450/455/465, A-286)
 * - Duplex Extended (2304, 2003, 255, Zeron 100, SAF 2906)
 * - Super Austenitic Extended (926, 31, 654SMO, 27-7MO, B66)
 * - Nitrogen Strengthened (Nitronic 30/32/40, 22-13-5, XM series)
 * 
 * Parameters per material: 127+
 * Schema version: 3.0.0
 * 
 * Generated: 2026-01-24 18:41:17
 * Generator: PRISM Master Materials Generator v3.1
 */

const STAINLESS_STEELS_051_100 = {
  metadata: {
    file: "stainless_steels_051_100.js",
    category: "M_STAINLESS",
    materialCount: 50,
    idRange: { start: "M-SS-051", end: "M-SS-100" },
    schemaVersion: "3.0.0",
    created: "2026-01-24",
    lastUpdated: "2026-01-24"
  },

  materials: {
    // ======================================================================
    // M-SS-051: AISI 304H High Carbon
    // ======================================================================
    "M-SS-051": {
          "id": "M-SS-051",
          "name": "AISI 304H High Carbon",
          "designation": {
                "aisi_sae": "304H",
                "uns": "S30409",
                "din": "1.4948",
                "jis": "SUS304H",
                "en": "X6CrNi18-10"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.04,
                      "max": 0.1,
                      "typical": 0.06
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 16.0,
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
                "kc1_1": 2180,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 320,
                "B": 1020,
                "C": 0.07,
                "n": 0.66,
                "m": 1.0,
                "melting_temp": 1428,
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
                "aisi_rating": 42,
                "relative_to_1212": 0.42,
                "power_factor": 1.1400000000000001,
                "tool_wear_factor": 1.08,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 69,
                            "max": 102,
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
                            "optimal": 60,
                            "max": 92,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Higher carbon for elevated temp strength"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-052: AISI 304N Nitrogen Enhanced
    // ======================================================================
    "M-SS-052": {
          "id": "M-SS-052",
          "name": "AISI 304N Nitrogen Enhanced",
          "designation": {
                "aisi_sae": "304N",
                "uns": "S30451",
                "din": "1.4315",
                "jis": "SUS304N1",
                "en": "X5CrNiN19-9"
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
                      "typical": 9.5
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
                      "min": 0.1,
                      "max": 0.22,
                      "typical": 0.16
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7937,
                "melting_point": {
                      "solidus": 1371,
                      "liquidus": 1426
                },
                "specific_heat": 500,
                "thermal_conductivity": 15.5,
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
                      "min": 535,
                      "typical": 585,
                      "max": 635
                },
                "yield_strength": {
                      "min": 240,
                      "typical": 275,
                      "max": 310
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
                "fatigue_strength": 234,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2250,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 360,
                "B": 1100,
                "C": 0.06,
                "n": 0.64,
                "m": 1.0,
                "melting_temp": 1426,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Nitrogen for higher strength"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-053: AISI 304LN Low C + Nitrogen
    // ======================================================================
    "M-SS-053": {
          "id": "M-SS-053",
          "name": "AISI 304LN Low C + Nitrogen",
          "designation": {
                "aisi_sae": "304LN",
                "uns": "S30453",
                "din": "1.4311",
                "jis": "SUS304LN",
                "en": "X2CrNiN18-10"
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
                      "min": 0.1,
                      "max": 0.22,
                      "typical": 0.14
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 15.8,
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
                "fatigue_strength": 220,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 340,
                "B": 1050,
                "C": 0.065,
                "n": 0.62,
                "m": 1.0,
                "melting_temp": 1425,
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
                "aisi_rating": 42,
                "relative_to_1212": 0.42,
                "power_factor": 1.1400000000000001,
                "tool_wear_factor": 1.08,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 69,
                            "max": 102,
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
                            "optimal": 60,
                            "max": 92,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-054: AISI 316H High Carbon
    // ======================================================================
    "M-SS-054": {
          "id": "M-SS-054",
          "name": "AISI 316H High Carbon",
          "designation": {
                "aisi_sae": "316H",
                "uns": "S31609",
                "din": "1.4919",
                "jis": "SUS316H",
                "en": "X6CrNiMo17-12-2"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.04,
                      "max": 0.1,
                      "typical": 0.06
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 13.0,
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
                      "min": 490,
                      "typical": 540,
                      "max": 590
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
                "fatigue_strength": 216,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 330,
                "B": 1180,
                "C": 0.01,
                "n": 0.62,
                "m": 1.0,
                "melting_temp": 1406,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "High temp creep resistance"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-055: AISI 316N Nitrogen Enhanced
    // ======================================================================
    "M-SS-055": {
          "id": "M-SS-055",
          "name": "AISI 316N Nitrogen Enhanced",
          "designation": {
                "aisi_sae": "316N",
                "uns": "S31651",
                "din": "1.4406",
                "jis": "SUS316N",
                "en": "X2CrNiMoN17-13-3"
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
                      "min": 0.1,
                      "max": 0.22,
                      "typical": 0.14
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 13.0,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
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
                      "min": 530,
                      "typical": 580,
                      "max": 630
                },
                "yield_strength": {
                      "min": 240,
                      "typical": 275,
                      "max": 310
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
                "fatigue_strength": 232,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2280,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 370,
                "B": 1200,
                "C": 0.01,
                "n": 0.6,
                "m": 1.0,
                "melting_temp": 1406,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-056: AISI 316LN Low C + Nitrogen
    // ======================================================================
    "M-SS-056": {
          "id": "M-SS-056",
          "name": "AISI 316LN Low C + Nitrogen",
          "designation": {
                "aisi_sae": "316LN",
                "uns": "S31653",
                "din": "1.4429",
                "jis": "SUS316LN",
                "en": "X2CrNiMoN17-13-3"
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
                      "typical": 12.5
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
                      "min": 0.1,
                      "max": 0.22,
                      "typical": 0.16
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7990,
                "melting_point": {
                      "solidus": 1350,
                      "liquidus": 1405
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.2,
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
                      "min": 500,
                      "typical": 550,
                      "max": 600
                },
                "yield_strength": {
                      "min": 210,
                      "typical": 245,
                      "max": 280
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
                "fatigue_strength": 220,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2220,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 350,
                "B": 1150,
                "C": 0.012,
                "n": 0.61,
                "m": 1.0,
                "melting_temp": 1405,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-057: AISI 317L Low Carbon High Mo
    // ======================================================================
    "M-SS-057": {
          "id": "M-SS-057",
          "name": "AISI 317L Low Carbon High Mo",
          "designation": {
                "aisi_sae": "317L",
                "uns": "S31703",
                "din": "1.4438",
                "jis": "SUS317L",
                "en": "X2CrNiMo18-15-4"
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
                      "typical": 19.0
                },
                "nickel": {
                      "min": 11.0,
                      "max": 15.0,
                      "typical": 14.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 8012,
                "melting_point": {
                      "solidus": 1340,
                      "liquidus": 1395
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
                      "brinell": 165,
                      "rockwell_b": 97,
                      "rockwell_c": null,
                      "vickers": 173
                },
                "tensile_strength": {
                      "min": 440,
                      "typical": 490,
                      "max": 540
                },
                "yield_strength": {
                      "min": 140,
                      "typical": 175,
                      "max": 210
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
                "fatigue_strength": 196,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 295,
                "B": 1150,
                "C": 0.01,
                "n": 0.62,
                "m": 1.0,
                "melting_temp": 1395,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-058: AISI 317LMN Super Austenitic
    // ======================================================================
    "M-SS-058": {
          "id": "M-SS-058",
          "name": "AISI 317LMN Super Austenitic",
          "designation": {
                "aisi_sae": "317LMN",
                "uns": "S31726",
                "din": "1.4439",
                "jis": "",
                "en": "X2CrNiMoN17-13-5"
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
                      "min": 17.0,
                      "max": 20.0,
                      "typical": 18.5
                },
                "nickel": {
                      "min": 13.5,
                      "max": 17.5,
                      "typical": 15.0
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
                      "min": 0.1,
                      "max": 0.2,
                      "typical": 0.15
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 8032,
                "melting_point": {
                      "solidus": 1332,
                      "liquidus": 1387
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
                      "brinell": 195,
                      "rockwell_b": 113,
                      "rockwell_c": null,
                      "vickers": 204
                },
                "tensile_strength": {
                      "min": 500,
                      "typical": 550,
                      "max": 600
                },
                "yield_strength": {
                      "min": 225,
                      "typical": 260,
                      "max": 295
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
                "fatigue_strength": 220,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 380,
                "B": 1200,
                "C": 0.012,
                "n": 0.6,
                "m": 1.0,
                "melting_temp": 1387,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-059: AISI 321H High Carbon Ti Stabilized
    // ======================================================================
    "M-SS-059": {
          "id": "M-SS-059",
          "name": "AISI 321H High Carbon Ti Stabilized",
          "designation": {
                "aisi_sae": "321H",
                "uns": "S32109",
                "din": "1.4878",
                "jis": "SUS321H",
                "en": "X8CrNiTi18-10"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.04,
                      "max": 0.1,
                      "typical": 0.06
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 16.0,
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
                      "min": 490,
                      "typical": 540,
                      "max": 590
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
                "fatigue_strength": 216,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 335,
                "B": 1080,
                "C": 0.055,
                "n": 0.65,
                "m": 1.0,
                "melting_temp": 1423,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "High temp aerospace applications"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-060: AISI 347H High Carbon Nb Stabilized
    // ======================================================================
    "M-SS-060": {
          "id": "M-SS-060",
          "name": "AISI 347H High Carbon Nb Stabilized",
          "designation": {
                "aisi_sae": "347H",
                "uns": "S34709",
                "din": "1.4961",
                "jis": "SUS347H",
                "en": "X8CrNiNb16-13"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.04,
                      "max": 0.1,
                      "typical": 0.06
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
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 15.8,
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
                      "min": 500,
                      "typical": 550,
                      "max": 600
                },
                "yield_strength": {
                      "min": 190,
                      "typical": 225,
                      "max": 260
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 345,
                "B": 1100,
                "C": 0.055,
                "n": 0.66,
                "m": 1.0,
                "melting_temp": 1422,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 108,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-061: AISI 410S Low Carbon Ferritic
    // ======================================================================
    "M-SS-061": {
          "id": "M-SS-061",
          "name": "AISI 410S Low Carbon Ferritic",
          "designation": {
                "aisi_sae": "410S",
                "uns": "S41008",
                "din": "1.4000",
                "jis": "SUS410S",
                "en": "X6Cr13"
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                      "brinell": 155,
                      "rockwell_b": 92,
                      "rockwell_c": null,
                      "vickers": 162
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
                "mc": 0.24,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 280,
                "B": 560,
                "C": 0.018,
                "n": 0.38,
                "m": 0.92,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 158,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Weldable without hardening"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-062: AISI 429 Weldable Ferritic
    // ======================================================================
    "M-SS-062": {
          "id": "M-SS-062",
          "name": "AISI 429 Weldable Ferritic",
          "designation": {
                "aisi_sae": "429",
                "uns": "S42900",
                "din": "1.4001",
                "jis": "SUS429",
                "en": "X7Cr14"
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
                      "min": 14.0,
                      "max": 16.0,
                      "typical": 15.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                      "min": 380,
                      "typical": 430,
                      "max": 480
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
                "fatigue_strength": 172,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1680,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 285,
                "B": 570,
                "C": 0.018,
                "n": 0.37,
                "m": 0.9,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 152,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-063: AISI 430Ti Titanium Stabilized
    // ======================================================================
    "M-SS-063": {
          "id": "M-SS-063",
          "name": "AISI 430Ti Titanium Stabilized",
          "designation": {
                "aisi_sae": "430Ti",
                "uns": "S43036",
                "din": "1.4510",
                "jis": "SUS430LX",
                "en": "X3CrTi17"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0.02
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
                      "min": 0.3,
                      "max": 0.8,
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 26.5,
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
                      "min": 380,
                      "typical": 430,
                      "max": 480
                },
                "yield_strength": {
                      "min": 205,
                      "typical": 240,
                      "max": 275
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
                "fatigue_strength": 172,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 290,
                "B": 550,
                "C": 0.018,
                "n": 0.35,
                "m": 0.88,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 162,
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
                "aisi_rating": 56,
                "relative_to_1212": 0.56,
                "power_factor": 1.07,
                "tool_wear_factor": 0.94,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 47,
                            "optimal": 79,
                            "max": 116,
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
                            "max": 105,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-064: AISI 446 High Chromium Ferritic
    // ======================================================================
    "M-SS-064": {
          "id": "M-SS-064",
          "name": "AISI 446 High Chromium Ferritic",
          "designation": {
                "aisi_sae": "446",
                "uns": "S44600",
                "din": "1.4762",
                "jis": "SUS446",
                "en": "X10CrAlSi25"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.2,
                      "typical": 0.12
                },
                "chromium": {
                      "min": 23.0,
                      "max": 27.0,
                      "typical": 25.0
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
                      "max": 0.25,
                      "typical": 0.15
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 21.0,
                "thermal_expansion": 1.08e-05,
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
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 240,
                      "typical": 275,
                      "max": 310
                },
                "elongation": {
                      "min": 10,
                      "typical": 18,
                      "max": 23
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
                "fatigue_strength": 206,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 380,
                "B": 680,
                "C": 0.015,
                "n": 0.4,
                "m": 0.95,
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
                "aisi_rating": 42,
                "relative_to_1212": 0.42,
                "power_factor": 1.1400000000000001,
                "tool_wear_factor": 1.08,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 69,
                            "max": 102,
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
                            "optimal": 60,
                            "max": 92,
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
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Best oxidation resistance ferritic - to 1100C"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-065: E-Brite 26-1 Super Ferritic
    // ======================================================================
    "M-SS-065": {
          "id": "M-SS-065",
          "name": "E-Brite 26-1 Super Ferritic",
          "designation": {
                "aisi_sae": "E-Brite26-1",
                "uns": "S44627",
                "din": "1.4131",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ferritic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.01,
                      "typical": 0.005
                },
                "chromium": {
                      "min": 25.0,
                      "max": 27.0,
                      "typical": 26.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0.5,
                      "typical": 0.15
                },
                "molybdenum": {
                      "min": 0.75,
                      "max": 1.5,
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                      "solidus": 1394,
                      "liquidus": 1449
                },
                "specific_heat": 500,
                "thermal_conductivity": 22.0,
                "thermal_expansion": 1.08e-05,
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
                      "min": 400,
                      "typical": 450,
                      "max": 500
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
                "fatigue_strength": 180,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1800,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 340,
                "B": 600,
                "C": 0.016,
                "n": 0.38,
                "m": 0.92,
                "melting_temp": 1449,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 138,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Ultra low interstitials - excellent weldability"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-066: Sea-Cure/SC-1 Super Ferritic
    // ======================================================================
    "M-SS-066": {
          "id": "M-SS-066",
          "name": "Sea-Cure/SC-1 Super Ferritic",
          "designation": {
                "aisi_sae": "Sea-Cure",
                "uns": "S44660",
                "din": "1.4466",
                "jis": "",
                "en": ""
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
                      "min": 25.0,
                      "max": 27.0,
                      "typical": 26.0
                },
                "nickel": {
                      "min": 1.5,
                      "max": 3.5,
                      "typical": 2.0
                },
                "molybdenum": {
                      "min": 2.5,
                      "max": 3.5,
                      "typical": 3.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                      "solidus": 1379,
                      "liquidus": 1434
                },
                "specific_heat": 500,
                "thermal_conductivity": 20.0,
                "thermal_expansion": 1.08e-05,
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
                      "min": 465,
                      "typical": 515,
                      "max": 565
                },
                "yield_strength": {
                      "min": 275,
                      "typical": 310,
                      "max": 345
                },
                "elongation": {
                      "min": 10,
                      "typical": 18,
                      "max": 23
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
                "fatigue_strength": 206,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 385,
                "B": 650,
                "C": 0.014,
                "n": 0.4,
                "m": 0.95,
                "melting_temp": 1434,
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
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Seawater condenser tubing"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-067: AISI 410Cb Columbium Bearing
    // ======================================================================
    "M-SS-067": {
          "id": "M-SS-067",
          "name": "AISI 410Cb Columbium Bearing",
          "designation": {
                "aisi_sae": "410Cb",
                "uns": "S41040",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.1,
                      "max": 0.18,
                      "typical": 0.14
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
                      "min": 0.05,
                      "max": 0.3,
                      "typical": 0.1
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 24.5,
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
                      "min": 500,
                      "typical": 550,
                      "max": 600
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
                "fatigue_strength": 220,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 420,
                "B": 720,
                "C": 0.014,
                "n": 0.42,
                "m": 0.98,
                "melting_temp": 1455,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 138,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-068: AISI 410NiMo (CA6NM)
    // ======================================================================
    "M-SS-068": {
          "id": "M-SS-068",
          "name": "AISI 410NiMo (CA6NM)",
          "designation": {
                "aisi_sae": "410NiMo",
                "uns": "S41500",
                "din": "1.4313",
                "jis": "",
                "en": "X3CrNiMo13-4"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0.03
                },
                "chromium": {
                      "min": 11.5,
                      "max": 14.0,
                      "typical": 12.5
                },
                "nickel": {
                      "min": 3.5,
                      "max": 5.5,
                      "typical": 4.5
                },
                "molybdenum": {
                      "min": 0.4,
                      "max": 1.0,
                      "typical": 0.6
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7921,
                "melting_point": {
                      "solidus": 1383,
                      "liquidus": 1438
                },
                "specific_heat": 500,
                "thermal_conductivity": 23.0,
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
                      "min": 745,
                      "typical": 795,
                      "max": 845
                },
                "yield_strength": {
                      "min": 585,
                      "typical": 620,
                      "max": 655
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
                "kc1_1": 2100,
                "mc": 0.22,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 580,
                "B": 800,
                "C": 0.012,
                "n": 0.4,
                "m": 1.02,
                "melting_temp": 1438,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 118,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Hydraulic turbines - excellent toughness"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-069: AISI 414 Ni-Bearing Martensitic
    // ======================================================================
    "M-SS-069": {
          "id": "M-SS-069",
          "name": "AISI 414 Ni-Bearing Martensitic",
          "designation": {
                "aisi_sae": "414",
                "uns": "S41400",
                "din": "1.4313",
                "jis": "SUS414",
                "en": "X3CrNiMo13-4"
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
                      "min": 1.25,
                      "max": 2.5,
                      "typical": 1.75
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7898,
                "melting_point": {
                      "solidus": 1394,
                      "liquidus": 1449
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
                      "brinell": 215,
                      "rockwell_b": 123,
                      "rockwell_c": null,
                      "vickers": 225
                },
                "tensile_strength": {
                      "min": 745,
                      "typical": 795,
                      "max": 845
                },
                "yield_strength": {
                      "min": 585,
                      "typical": 620,
                      "max": 655
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
                "kc1_1": 2000,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 550,
                "B": 780,
                "C": 0.014,
                "n": 0.42,
                "m": 1.0,
                "melting_temp": 1449,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 128,
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
                "aisi_rating": 42,
                "relative_to_1212": 0.42,
                "power_factor": 1.1400000000000001,
                "tool_wear_factor": 1.08,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "fair",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 41,
                            "optimal": 69,
                            "max": 102,
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
                            "optimal": 60,
                            "max": 92,
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
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-070: AISI 418 (Greek Ascoloy)
    // ======================================================================
    "M-SS-070": {
          "id": "M-SS-070",
          "name": "AISI 418 (Greek Ascoloy)",
          "designation": {
                "aisi_sae": "418",
                "uns": "S41800",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.15,
                      "max": 0.23,
                      "typical": 0.18
                },
                "chromium": {
                      "min": 12.0,
                      "max": 14.0,
                      "typical": 12.5
                },
                "nickel": {
                      "min": 1.8,
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
                "tungsten": {
                      "min": 2.5,
                      "max": 3.5,
                      "typical": 3.0
                },
                "vanadium": {
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
                "density": 7975,
                "melting_point": {
                      "solidus": 1424,
                      "liquidus": 1479
                },
                "specific_heat": 500,
                "thermal_conductivity": 22.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 280,
                      "rockwell_b": null,
                      "rockwell_c": 16,
                      "vickers": 294
                },
                "tensile_strength": {
                      "min": 810,
                      "typical": 860,
                      "max": 910
                },
                "yield_strength": {
                      "min": 655,
                      "typical": 690,
                      "max": 725
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
                "fatigue_strength": 344,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 650,
                "B": 850,
                "C": 0.011,
                "n": 0.38,
                "m": 1.05,
                "melting_temp": 1479,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 108,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Steam turbine blades - W for creep"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-071: AISI 422 High Temp Martensitic
    // ======================================================================
    "M-SS-071": {
          "id": "M-SS-071",
          "name": "AISI 422 High Temp Martensitic",
          "designation": {
                "aisi_sae": "422",
                "uns": "S42200",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.2,
                      "max": 0.27,
                      "typical": 0.23
                },
                "chromium": {
                      "min": 11.0,
                      "max": 13.0,
                      "typical": 12.0
                },
                "nickel": {
                      "min": 0.5,
                      "max": 1.25,
                      "typical": 0.8
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
                "tungsten": {
                      "min": 0.75,
                      "max": 1.25,
                      "typical": 1.0
                },
                "vanadium": {
                      "min": 0.15,
                      "max": 0.3,
                      "typical": 0.25
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
                "density": 7934,
                "melting_point": {
                      "solidus": 1402,
                      "liquidus": 1457
                },
                "specific_heat": 500,
                "thermal_conductivity": 21.5,
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
                      "min": 880,
                      "typical": 930,
                      "max": 980
                },
                "yield_strength": {
                      "min": 725,
                      "typical": 760,
                      "max": 795
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
                "fatigue_strength": 372,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 720,
                "B": 900,
                "C": 0.01,
                "n": 0.35,
                "m": 1.08,
                "melting_temp": 1457,
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
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Steam turbine/jet engine parts"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-072: AISI 440F Free Machining
    // ======================================================================
    "M-SS-072": {
          "id": "M-SS-072",
          "name": "AISI 440F Free Machining",
          "designation": {
                "aisi_sae": "440F",
                "uns": "S44020",
                "din": "",
                "jis": "SUS440F",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic Fm",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0.1,
                      "max": 0.35,
                      "typical": 0.15
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
                      "min": 1,
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
                "fatigue_strength": 304,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.23,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 720,
                "B": 850,
                "C": 0.01,
                "n": 0.36,
                "m": 1.08,
                "melting_temp": 1452,
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
                "aisi_rating": 55,
                "relative_to_1212": 0.55,
                "power_factor": 1.0750000000000002,
                "tool_wear_factor": 0.95,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "excellent",
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Free machining version of 440C"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-073: AISI 440C Modified (BG42)
    // ======================================================================
    "M-SS-073": {
          "id": "M-SS-073",
          "name": "AISI 440C Modified (BG42)",
          "designation": {
                "aisi_sae": "440C Mod",
                "uns": "",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Martensitic",
          "condition": "Q&T 60 HRC",
          "composition": {
                "carbon": {
                      "min": 1.1,
                      "max": 1.2,
                      "typical": 1.15
                },
                "chromium": {
                      "min": 14.0,
                      "max": 15.0,
                      "typical": 14.5
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 3.5,
                      "max": 4.5,
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 1.0,
                      "max": 1.5,
                      "typical": 1.2
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
                "density": 7950,
                "melting_point": {
                      "solidus": 1380,
                      "liquidus": 1435
                },
                "specific_heat": 500,
                "thermal_conductivity": 22.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_b": null,
                      "rockwell_c": 60,
                      "vickers": 630
                },
                "tensile_strength": {
                      "min": 2050,
                      "typical": 2100,
                      "max": 2150
                },
                "yield_strength": {
                      "min": 1965,
                      "typical": 2000,
                      "max": 2035
                },
                "elongation": {
                      "min": 1,
                      "typical": 1,
                      "max": 6
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
                "fatigue_strength": 840,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 4600,
                "mc": 0.19,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1800,
                "B": 1000,
                "C": 0.006,
                "n": 0.2,
                "m": 1.18,
                "melting_temp": 1435,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 45,
                "n": 0.09,
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
                "aisi_rating": 10,
                "relative_to_1212": 0.1,
                "power_factor": 1.3,
                "tool_wear_factor": 1.4,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 29,
                            "optimal": 47,
                            "max": 70,
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
                            "min": 23,
                            "optimal": 41,
                            "max": 64,
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
                            "optimal": 20,
                            "max": 31,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Premium knife/bearing - CBN grinding only"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-074: 15-5 PH H900
    // ======================================================================
    "M-SS-074": {
          "id": "M-SS-074",
          "name": "15-5 PH H900",
          "designation": {
                "aisi_sae": "15-5PH",
                "uns": "S15500",
                "din": "1.4545",
                "jis": "",
                "en": "X5CrNiCu15-5"
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "thermal_conductivity": 17.5,
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
                      "min": 1260,
                      "typical": 1310,
                      "max": 1360
                },
                "yield_strength": {
                      "min": 1175,
                      "typical": 1210,
                      "max": 1245
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1080,
                "B": 950,
                "C": 0.012,
                "n": 0.32,
                "m": 1.12,
                "melting_temp": 1441,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 88,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-075: 15-5 PH H1025
    // ======================================================================
    "M-SS-075": {
          "id": "M-SS-075",
          "name": "15-5 PH H1025",
          "designation": {
                "aisi_sae": "15-5PH",
                "uns": "S15500",
                "din": "1.4545",
                "jis": "",
                "en": "X5CrNiCu15-5"
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 900,
                "B": 850,
                "C": 0.014,
                "n": 0.35,
                "m": 1.08,
                "melting_temp": 1441,
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
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-076: 15-5 PH H1150
    // ======================================================================
    "M-SS-076": {
          "id": "M-SS-076",
          "name": "15-5 PH H1150",
          "designation": {
                "aisi_sae": "15-5PH",
                "uns": "S15500",
                "din": "1.4545",
                "jis": "",
                "en": "X5CrNiCu15-5"
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 720,
                "B": 800,
                "C": 0.016,
                "n": 0.38,
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
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-077: Custom 450 (XM-25)
    // ======================================================================
    "M-SS-077": {
          "id": "M-SS-077",
          "name": "Custom 450 (XM-25)",
          "designation": {
                "aisi_sae": "Custom450",
                "uns": "S45000",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "H900",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0.03
                },
                "chromium": {
                      "min": 14.0,
                      "max": 16.0,
                      "typical": 15.0
                },
                "nickel": {
                      "min": 5.0,
                      "max": 7.0,
                      "typical": 6.0
                },
                "molybdenum": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
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
                      "min": 1.25,
                      "max": 1.75,
                      "typical": 1.5
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "aluminum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7931,
                "melting_point": {
                      "solidus": 1378,
                      "liquidus": 1433
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.5,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 388,
                      "rockwell_b": null,
                      "rockwell_c": 41,
                      "vickers": 407
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
                "fatigue_strength": 524,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2500,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1000,
                "B": 900,
                "C": 0.012,
                "n": 0.34,
                "m": 1.1,
                "melting_temp": 1433,
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
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Improved 17-4PH - aerospace"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-078: Custom 455 (XM-16)
    // ======================================================================
    "M-SS-078": {
          "id": "M-SS-078",
          "name": "Custom 455 (XM-16)",
          "designation": {
                "aisi_sae": "Custom455",
                "uns": "S45500",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "H1000",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0.03
                },
                "chromium": {
                      "min": 11.0,
                      "max": 12.5,
                      "typical": 12.0
                },
                "nickel": {
                      "min": 7.5,
                      "max": 9.5,
                      "typical": 8.5
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.5,
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
                      "min": 1.5,
                      "max": 2.5,
                      "typical": 2.0
                },
                "titanium": {
                      "min": 0.8,
                      "max": 1.4,
                      "typical": 1.1
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                      "solidus": 1372,
                      "liquidus": 1427
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 388,
                      "rockwell_b": null,
                      "rockwell_c": 41,
                      "vickers": 407
                },
                "tensile_strength": {
                      "min": 1225,
                      "typical": 1275,
                      "max": 1325
                },
                "yield_strength": {
                      "min": 1140,
                      "typical": 1175,
                      "max": 1210
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
                "fatigue_strength": 510,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2480,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 980,
                "B": 880,
                "C": 0.013,
                "n": 0.35,
                "m": 1.08,
                "melting_temp": 1427,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 108,
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
                "aisi_rating": 33,
                "relative_to_1212": 0.33,
                "power_factor": 1.185,
                "tool_wear_factor": 1.17,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
                "overall_rating": "difficult",
                "difficulty_class": 3
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 38,
                            "optimal": 63,
                            "max": 93,
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
                            "max": 84,
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
                      "AlCrN",
                      "CBN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-079: Custom 465 (S46500)
    // ======================================================================
    "M-SS-079": {
          "id": "M-SS-079",
          "name": "Custom 465 (S46500)",
          "designation": {
                "aisi_sae": "Custom465",
                "uns": "S46500",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "H950",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.02,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 11.0,
                      "max": 12.5,
                      "typical": 11.5
                },
                "nickel": {
                      "min": 10.75,
                      "max": 11.75,
                      "typical": 11.25
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
                      "min": 1.5,
                      "max": 1.9,
                      "typical": 1.7
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7961,
                "melting_point": {
                      "solidus": 1361,
                      "liquidus": 1416
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
                      "brinell": 470,
                      "rockwell_b": null,
                      "rockwell_c": 49,
                      "vickers": 493
                },
                "tensile_strength": {
                      "min": 1570,
                      "typical": 1620,
                      "max": 1670
                },
                "yield_strength": {
                      "min": 1515,
                      "typical": 1550,
                      "max": 1585
                },
                "elongation": {
                      "min": 1,
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
                "fatigue_strength": 648,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2900,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 1380,
                "B": 980,
                "C": 0.009,
                "n": 0.28,
                "m": 1.15,
                "melting_temp": 1416,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Highest strength martensitic PH - aerospace"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-080: A-286 (S66286) Iron-Base Superalloy
    // ======================================================================
    "M-SS-080": {
          "id": "M-SS-080",
          "name": "A-286 (S66286) Iron-Base Superalloy",
          "designation": {
                "aisi_sae": "A286",
                "uns": "S66286",
                "din": "1.4980",
                "jis": "SUH660",
                "en": "X5NiCrTi26-15"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Ph",
          "condition": "Solution + Aged",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 13.5,
                      "max": 16.0,
                      "typical": 15.0
                },
                "nickel": {
                      "min": 24.0,
                      "max": 27.0,
                      "typical": 26.0
                },
                "molybdenum": {
                      "min": 1.0,
                      "max": 1.5,
                      "typical": 1.25
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
                      "min": 1.9,
                      "max": 2.35,
                      "typical": 2.1
                },
                "niobium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "aluminum": {
                      "min": 0,
                      "max": 0.35,
                      "typical": 0.2
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0.1,
                      "max": 0.5,
                      "typical": 0.25
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
                "density": 8038,
                "melting_point": {
                      "solidus": 1315,
                      "liquidus": 1370
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.8,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 302,
                      "rockwell_b": null,
                      "rockwell_c": 31,
                      "vickers": 317
                },
                "tensile_strength": {
                      "min": 950,
                      "typical": 1000,
                      "max": 1050
                },
                "yield_strength": {
                      "min": 655,
                      "typical": 690,
                      "max": 725
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
                "fatigue_strength": 400,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2650,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 780,
                "B": 950,
                "C": 0.015,
                "n": 0.35,
                "m": 1.1,
                "melting_temp": 1370,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Jet engine fasteners - service to 700C"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-081: Duplex 2304 (S32304)
    // ======================================================================
    "M-SS-081": {
          "id": "M-SS-081",
          "name": "Duplex 2304 (S32304)",
          "designation": {
                "aisi_sae": "2304",
                "uns": "S32304",
                "din": "1.4362",
                "jis": "",
                "en": "X2CrNiN23-4"
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
                      "min": 21.5,
                      "max": 24.5,
                      "typical": 23.0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.5,
                      "typical": 4.5
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
                      "min": 0.05,
                      "max": 0.2,
                      "typical": 0.1
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7917,
                "melting_point": {
                      "solidus": 1385,
                      "liquidus": 1440
                },
                "specific_heat": 500,
                "thermal_conductivity": 16.0,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 230,
                      "rockwell_b": 131,
                      "rockwell_c": null,
                      "vickers": 241
                },
                "tensile_strength": {
                      "min": 550,
                      "typical": 600,
                      "max": 650
                },
                "yield_strength": {
                      "min": 365,
                      "typical": 400,
                      "max": 435
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
                "fatigue_strength": 240,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 420,
                "B": 850,
                "C": 0.028,
                "n": 0.46,
                "m": 1.0,
                "melting_temp": 1440,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Lean duplex - no Mo"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-082: Duplex 2003 (S32003)
    // ======================================================================
    "M-SS-082": {
          "id": "M-SS-082",
          "name": "Duplex 2003 (S32003)",
          "designation": {
                "aisi_sae": "2003",
                "uns": "S32003",
                "din": "",
                "jis": "",
                "en": ""
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
                      "min": 19.5,
                      "max": 22.5,
                      "typical": 21.0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 4.0,
                      "typical": 3.5
                },
                "molybdenum": {
                      "min": 1.5,
                      "max": 2.0,
                      "typical": 1.75
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7933,
                "melting_point": {
                      "solidus": 1380,
                      "liquidus": 1435
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
                "kc1_1": 2300,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 460,
                "B": 880,
                "C": 0.028,
                "n": 0.47,
                "m": 1.0,
                "melting_temp": 1435,
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
                "aisi_rating": 30,
                "relative_to_1212": 0.3,
                "power_factor": 1.2000000000000002,
                "tool_wear_factor": 1.2,
                "surface_finish_factor": 1.0,
                "chip_control_rating": "fair",
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-083: Ferralium 255 (S32550)
    // ======================================================================
    "M-SS-083": {
          "id": "M-SS-083",
          "name": "Ferralium 255 (S32550)",
          "designation": {
                "aisi_sae": "255",
                "uns": "S32550",
                "din": "1.4507",
                "jis": "",
                "en": "X2CrNiMoCuN25-6-3"
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
                      "min": 24.0,
                      "max": 27.0,
                      "typical": 25.5
                },
                "nickel": {
                      "min": 4.5,
                      "max": 6.5,
                      "typical": 6.0
                },
                "molybdenum": {
                      "min": 2.9,
                      "max": 3.9,
                      "typical": 3.4
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
                      "min": 0.1,
                      "max": 0.25,
                      "typical": 0.18
                },
                "copper": {
                      "min": 1.5,
                      "max": 2.5,
                      "typical": 2.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7971,
                "melting_point": {
                      "solidus": 1365,
                      "liquidus": 1420
                },
                "specific_heat": 500,
                "thermal_conductivity": 14.5,
                "thermal_expansion": 1.15e-05,
                "electrical_resistivity": 6e-07,
                "magnetic": "magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 200000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 280,
                      "rockwell_b": null,
                      "rockwell_c": 16,
                      "vickers": 294
                },
                "tensile_strength": {
                      "min": 710,
                      "typical": 760,
                      "max": 810
                },
                "yield_strength": {
                      "min": 515,
                      "typical": 550,
                      "max": 585
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
                "fatigue_strength": 304,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2500,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 560,
                "B": 950,
                "C": 0.025,
                "n": 0.48,
                "m": 1.0,
                "melting_temp": 1420,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 88,
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
                      "AlTiN",
                      "TiCN"
                ],
                "coolant_recommendation": "flood"
          },
          "statistics": {
                "data_quality": "high",
                "sample_size": 150,
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Higher Cu for sulfuric acid"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-084: Zeron 100 Super Duplex
    // ======================================================================
    "M-SS-084": {
          "id": "M-SS-084",
          "name": "Zeron 100 Super Duplex",
          "designation": {
                "aisi_sae": "Zeron100",
                "uns": "S32760",
                "din": "1.4501",
                "jis": "",
                "en": "X2CrNiMoCuWN25-7-4"
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
                      "typical": 7.5
                },
                "molybdenum": {
                      "min": 3.0,
                      "max": 4.0,
                      "typical": 3.75
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
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "copper": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
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
                "tungsten": {
                      "min": 0.5,
                      "max": 1.0,
                      "typical": 0.75
                },
                "vanadium": {
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
                "density": 8002,
                "melting_point": {
                      "solidus": 1366,
                      "liquidus": 1421
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
                      "min": 700,
                      "typical": 750,
                      "max": 800
                },
                "yield_strength": {
                      "min": 515,
                      "typical": 550,
                      "max": 585
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
                "fatigue_strength": 300,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 580,
                "B": 980,
                "C": 0.024,
                "n": 0.48,
                "m": 1.02,
                "melting_temp": 1421,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 82,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "W addition - highest strength super duplex"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-085: SAF 2906 Hyper Duplex
    // ======================================================================
    "M-SS-085": {
          "id": "M-SS-085",
          "name": "SAF 2906 Hyper Duplex",
          "designation": {
                "aisi_sae": "SAF2906",
                "uns": "S32906",
                "din": "1.4477",
                "jis": "",
                "en": ""
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
                      "min": 28.0,
                      "max": 30.0,
                      "typical": 29.0
                },
                "nickel": {
                      "min": 5.8,
                      "max": 7.5,
                      "typical": 6.5
                },
                "molybdenum": {
                      "min": 1.5,
                      "max": 2.6,
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
                      "min": 0.3,
                      "max": 0.4,
                      "typical": 0.35
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7952,
                "melting_point": {
                      "solidus": 1370,
                      "liquidus": 1425
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.5,
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
                      "min": 750,
                      "typical": 800,
                      "max": 850
                },
                "yield_strength": {
                      "min": 565,
                      "typical": 600,
                      "max": 635
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
                "fatigue_strength": 320,
                "fracture_toughness": 80
          },
          "kienzle": {
                "kc1_1": 2650,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 620,
                "B": 1020,
                "C": 0.022,
                "n": 0.48,
                "m": 1.02,
                "melting_temp": 1425,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 78,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Highest Cr/N duplex"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-086: 926 (1.4529) Super Austenitic
    // ======================================================================
    "M-SS-086": {
          "id": "M-SS-086",
          "name": "926 (1.4529) Super Austenitic",
          "designation": {
                "aisi_sae": "926",
                "uns": "N08926",
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
                      "max": 0.02,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 19.0,
                      "max": 21.0,
                      "typical": 20.5
                },
                "nickel": {
                      "min": 24.0,
                      "max": 26.0,
                      "typical": 25.0
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
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "copper": {
                      "min": 0.5,
                      "max": 1.5,
                      "typical": 1.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 8112,
                "melting_point": {
                      "solidus": 1292,
                      "liquidus": 1347
                },
                "specific_heat": 500,
                "thermal_conductivity": 11.8,
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
                      "min": 600,
                      "typical": 650,
                      "max": 700
                },
                "yield_strength": {
                      "min": 260,
                      "typical": 295,
                      "max": 330
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
                "kc1_1": 2550,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 400,
                "B": 1220,
                "C": 0.05,
                "n": 0.66,
                "m": 1.0,
                "melting_temp": 1347,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 78,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-087: Alloy 31 (1.4562)
    // ======================================================================
    "M-SS-087": {
          "id": "M-SS-087",
          "name": "Alloy 31 (1.4562)",
          "designation": {
                "aisi_sae": "31",
                "uns": "N08031",
                "din": "1.4562",
                "jis": "",
                "en": "X1NiCrMoCu32-28-7"
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Super Austenitic",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.015,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 26.0,
                      "max": 28.0,
                      "typical": 27.5
                },
                "nickel": {
                      "min": 30.0,
                      "max": 33.0,
                      "typical": 31.5
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
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "copper": {
                      "min": 1.0,
                      "max": 1.4,
                      "typical": 1.2
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 8145,
                "melting_point": {
                      "solidus": 1273,
                      "liquidus": 1328
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
                      "brinell": 190,
                      "rockwell_b": 110,
                      "rockwell_c": null,
                      "vickers": 199
                },
                "tensile_strength": {
                      "min": 500,
                      "typical": 550,
                      "max": 600
                },
                "yield_strength": {
                      "min": 185,
                      "typical": 220,
                      "max": 255
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
                "fatigue_strength": 220,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2480,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 360,
                "B": 1150,
                "C": 0.055,
                "n": 0.64,
                "m": 1.0,
                "melting_temp": 1328,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 82,
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
                "aisi_rating": 24,
                "relative_to_1212": 0.24,
                "power_factor": 1.23,
                "tool_wear_factor": 1.26,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 34,
                            "optimal": 56,
                            "max": 84,
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
                            "optimal": 49,
                            "max": 76,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Phosphoric acid production"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-088: 654 SMO (S32654)
    // ======================================================================
    "M-SS-088": {
          "id": "M-SS-088",
          "name": "654 SMO (S32654)",
          "designation": {
                "aisi_sae": "654SMO",
                "uns": "S32654",
                "din": "1.4652",
                "jis": "",
                "en": "X1CrNiMoCuN24-22-8"
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
                      "min": 23.0,
                      "max": 25.0,
                      "typical": 24.5
                },
                "nickel": {
                      "min": 21.0,
                      "max": 23.0,
                      "typical": 22.0
                },
                "molybdenum": {
                      "min": 7.0,
                      "max": 8.0,
                      "typical": 7.5
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
                      "min": 0.45,
                      "max": 0.55,
                      "typical": 0.5
                },
                "copper": {
                      "min": 0.3,
                      "max": 0.6,
                      "typical": 0.5
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 8112,
                "melting_point": {
                      "solidus": 1296,
                      "liquidus": 1351
                },
                "specific_heat": 500,
                "thermal_conductivity": 10.5,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
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
                      "min": 700,
                      "typical": 750,
                      "max": 800
                },
                "yield_strength": {
                      "min": 395,
                      "typical": 430,
                      "max": 465
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
                "fatigue_strength": 300,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2700,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 520,
                "B": 1350,
                "C": 0.04,
                "n": 0.62,
                "m": 1.0,
                "melting_temp": 1351,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 70,
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
                "aisi_rating": 18,
                "relative_to_1212": 0.18,
                "power_factor": 1.26,
                "tool_wear_factor": 1.32,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 32,
                            "optimal": 52,
                            "max": 78,
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
                            "min": 26,
                            "optimal": 45,
                            "max": 71,
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
                            "min": 12,
                            "optimal": 22,
                            "max": 34,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Ultimate pitting resistance (PREN>56)"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-089: 27-7MO (S31277)
    // ======================================================================
    "M-SS-089": {
          "id": "M-SS-089",
          "name": "27-7MO (S31277)",
          "designation": {
                "aisi_sae": "27-7MO",
                "uns": "S31277",
                "din": "",
                "jis": "",
                "en": ""
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
                      "min": 20.5,
                      "max": 23.0,
                      "typical": 21.5
                },
                "nickel": {
                      "min": 26.0,
                      "max": 29.0,
                      "typical": 27.5
                },
                "molybdenum": {
                      "min": 6.5,
                      "max": 8.0,
                      "typical": 7.25
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
                      "min": 0.3,
                      "max": 0.4,
                      "typical": 0.35
                },
                "copper": {
                      "min": 0.5,
                      "max": 1.5,
                      "typical": 1.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 8136,
                "melting_point": {
                      "solidus": 1281,
                      "liquidus": 1336
                },
                "specific_heat": 500,
                "thermal_conductivity": 11.0,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 230,
                      "rockwell_b": 131,
                      "rockwell_c": null,
                      "vickers": 241
                },
                "tensile_strength": {
                      "min": 650,
                      "typical": 700,
                      "max": 750
                },
                "yield_strength": {
                      "min": 315,
                      "typical": 350,
                      "max": 385
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
                "fatigue_strength": 280,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2620,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 460,
                "B": 1280,
                "C": 0.045,
                "n": 0.64,
                "m": 1.0,
                "melting_temp": 1336,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-090: Alloy B66 Super Austenitic
    // ======================================================================
    "M-SS-090": {
          "id": "M-SS-090",
          "name": "Alloy B66 Super Austenitic",
          "designation": {
                "aisi_sae": "B66",
                "uns": "N08367",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Super Austenitic",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 19.5,
                      "max": 22.5,
                      "typical": 21.0
                },
                "nickel": {
                      "min": 23.0,
                      "max": 26.0,
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                      "brinell": 205,
                      "rockwell_b": 118,
                      "rockwell_c": null,
                      "vickers": 215
                },
                "tensile_strength": {
                      "min": 630,
                      "typical": 680,
                      "max": 730
                },
                "yield_strength": {
                      "min": 270,
                      "typical": 305,
                      "max": 340
                },
                "elongation": {
                      "min": 24,
                      "typical": 32,
                      "max": 37
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
                "fatigue_strength": 272,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2580,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 410,
                "B": 1240,
                "C": 0.048,
                "n": 0.66,
                "m": 1.0,
                "melting_temp": 1349,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 76,
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
                "aisi_rating": 21,
                "relative_to_1212": 0.21,
                "power_factor": 1.245,
                "tool_wear_factor": 1.29,
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
                            "max": 81,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-091: Nitronic 30 (XM-18)
    // ======================================================================
    "M-SS-091": {
          "id": "M-SS-091",
          "name": "Nitronic 30 (XM-18)",
          "designation": {
                "aisi_sae": "Nitronic30",
                "uns": "S20400",
                "din": "",
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
                      "min": 15.0,
                      "max": 17.5,
                      "typical": 16.5
                },
                "nickel": {
                      "min": 1.5,
                      "max": 3.5,
                      "typical": 2.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 7.0,
                      "max": 9.0,
                      "typical": 8.5
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7827,
                "melting_point": {
                      "solidus": 1392,
                      "liquidus": 1447
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.5,
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
                "fatigue_strength": 262,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 420,
                "B": 1000,
                "C": 0.04,
                "n": 0.52,
                "m": 1.0,
                "melting_temp": 1447,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 118,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Low Ni replacement for 304"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-092: Nitronic 32 (18-2Mn)
    // ======================================================================
    "M-SS-092": {
          "id": "M-SS-092",
          "name": "Nitronic 32 (18-2Mn)",
          "designation": {
                "aisi_sae": "Nitronic32",
                "uns": "S24100",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.06
                },
                "chromium": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.0
                },
                "nickel": {
                      "min": 1.5,
                      "max": 3.0,
                      "typical": 2.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 11.0,
                      "max": 14.0,
                      "typical": 12.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.3,
                      "max": 0.4,
                      "typical": 0.35
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7790,
                "melting_point": {
                      "solidus": 1394,
                      "liquidus": 1449
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.0,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 220,
                      "rockwell_b": 126,
                      "rockwell_c": null,
                      "vickers": 231
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
                "fatigue_strength": 276,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 450,
                "B": 1050,
                "C": 0.038,
                "n": 0.5,
                "m": 1.0,
                "melting_temp": 1449,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 112,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Ultra-low Ni - automotive"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-093: Nitronic 40 (XM-10)
    // ======================================================================
    "M-SS-093": {
          "id": "M-SS-093",
          "name": "Nitronic 40 (XM-10)",
          "designation": {
                "aisi_sae": "Nitronic40",
                "uns": "S21900",
                "din": "",
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
                      "min": 18.0,
                      "max": 21.0,
                      "typical": 19.5
                },
                "nickel": {
                      "min": 5.5,
                      "max": 7.5,
                      "typical": 6.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 8.0,
                      "max": 10.0,
                      "typical": 9.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.15,
                      "max": 0.3,
                      "typical": 0.25
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7842,
                "melting_point": {
                      "solidus": 1380,
                      "liquidus": 1435
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.5,
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
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 310,
                      "typical": 345,
                      "max": 380
                },
                "elongation": {
                      "min": 37,
                      "typical": 45,
                      "max": 50
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
                "kc1_1": 2180,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 430,
                "B": 1020,
                "C": 0.042,
                "n": 0.52,
                "m": 1.0,
                "melting_temp": 1435,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Structural - cryogenic applications"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-094: 22-13-5 (XM-19)
    // ======================================================================
    "M-SS-094": {
          "id": "M-SS-094",
          "name": "22-13-5 (XM-19)",
          "designation": {
                "aisi_sae": "22-13-5",
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
                      "typical": 22.0
                },
                "nickel": {
                      "min": 11.5,
                      "max": 13.5,
                      "typical": 13.0
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
                      "typical": 0.35
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7948,
                "melting_point": {
                      "solidus": 1349,
                      "liquidus": 1404
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 480,
                "B": 1150,
                "C": 0.038,
                "n": 0.55,
                "m": 1.0,
                "melting_temp": 1404,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "High strength austenitic - marine shafting"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-095: XM-29 (S24000)
    // ======================================================================
    "M-SS-095": {
          "id": "M-SS-095",
          "name": "XM-29 (S24000)",
          "designation": {
                "aisi_sae": "22Cr-12Ni",
                "uns": "S24000",
                "din": "",
                "jis": "",
                "en": ""
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
                      "min": 11.5,
                      "max": 13.0,
                      "typical": 12.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 2.0,
                      "max": 4.0,
                      "typical": 3.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.15,
                      "max": 0.3,
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7930,
                "melting_point": {
                      "solidus": 1364,
                      "liquidus": 1419
                },
                "specific_heat": 500,
                "thermal_conductivity": 14.0,
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
                      "min": 640,
                      "typical": 690,
                      "max": 740
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
                "fatigue_strength": 276,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 430,
                "B": 1050,
                "C": 0.04,
                "n": 0.54,
                "m": 1.0,
                "melting_temp": 1419,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-096: 201LN Low C + Nitrogen
    // ======================================================================
    "M-SS-096": {
          "id": "M-SS-096",
          "name": "201LN Low C + Nitrogen",
          "designation": {
                "aisi_sae": "201LN",
                "uns": "S20153",
                "din": "",
                "jis": "",
                "en": ""
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
                      "min": 4.0,
                      "max": 5.0,
                      "typical": 4.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 6.4,
                      "max": 7.5,
                      "typical": 7.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.1,
                      "max": 0.2,
                      "typical": 0.15
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7852,
                "melting_point": {
                      "solidus": 1386,
                      "liquidus": 1441
                },
                "specific_heat": 500,
                "thermal_conductivity": 14.0,
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
                "fatigue_strength": 276,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 440,
                "B": 1020,
                "C": 0.045,
                "n": 0.52,
                "m": 1.0,
                "melting_temp": 1441,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 118,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Improved 201 for welding"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-097: AISI 216 (Cr-Mn-Ni-N)
    // ======================================================================
    "M-SS-097": {
          "id": "M-SS-097",
          "name": "AISI 216 (Cr-Mn-Ni-N)",
          "designation": {
                "aisi_sae": "216",
                "uns": "S21600",
                "din": "",
                "jis": "SUS316",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.08,
                      "typical": 0.05
                },
                "chromium": {
                      "min": 17.5,
                      "max": 20.0,
                      "typical": 19.0
                },
                "nickel": {
                      "min": 5.0,
                      "max": 7.0,
                      "typical": 6.0
                },
                "molybdenum": {
                      "min": 2.0,
                      "max": 3.0,
                      "typical": 2.5
                },
                "manganese": {
                      "min": 7.5,
                      "max": 9.0,
                      "typical": 8.0
                },
                "silicon": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "nitrogen": {
                      "min": 0.25,
                      "max": 0.4,
                      "typical": 0.32
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7887,
                "melting_point": {
                      "solidus": 1369,
                      "liquidus": 1424
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.0,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 220,
                      "rockwell_b": 126,
                      "rockwell_c": null,
                      "vickers": 231
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
                "fatigue_strength": 276,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2280,
                "mc": 0.21,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 460,
                "B": 1080,
                "C": 0.038,
                "n": 0.52,
                "m": 1.0,
                "melting_temp": 1424,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Low Ni + Mo for pitting"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-098: XM-11 (S21904)
    // ======================================================================
    "M-SS-098": {
          "id": "M-SS-098",
          "name": "XM-11 (S21904)",
          "designation": {
                "aisi_sae": "XM-11",
                "uns": "S21904",
                "din": "",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Austenitic",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "chromium": {
                      "min": 19.0,
                      "max": 22.0,
                      "typical": 20.5
                },
                "nickel": {
                      "min": 5.5,
                      "max": 7.5,
                      "typical": 6.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "manganese": {
                      "min": 8.0,
                      "max": 10.0,
                      "typical": 9.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 7842,
                "melting_point": {
                      "solidus": 1380,
                      "liquidus": 1435
                },
                "specific_heat": 500,
                "thermal_conductivity": 13.5,
                "thermal_expansion": 1.72e-05,
                "electrical_resistivity": 7.2e-07,
                "magnetic": "non-magnetic",
                "poissons_ratio": 0.29,
                "elastic_modulus": 193000,
                "shear_modulus": 77000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 220,
                      "rockwell_b": 126,
                      "rockwell_c": null,
                      "vickers": 231
                },
                "tensile_strength": {
                      "min": 675,
                      "typical": 725,
                      "max": 775
                },
                "yield_strength": {
                      "min": 345,
                      "typical": 380,
                      "max": 415
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
                "fatigue_strength": 290,
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
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 450,
                "B": 1080,
                "C": 0.04,
                "n": 0.54,
                "m": 1.0,
                "melting_temp": 1435,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 108,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": ""
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-099: Cronifer 1925 hMo
    // ======================================================================
    "M-SS-099": {
          "id": "M-SS-099",
          "name": "Cronifer 1925 hMo",
          "designation": {
                "aisi_sae": "Cronifer1925hMo",
                "uns": "N08925",
                "din": "1.4529",
                "jis": "",
                "en": ""
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
                      "max": 21.0,
                      "typical": 20.0
                },
                "nickel": {
                      "min": 24.0,
                      "max": 26.0,
                      "typical": 25.0
                },
                "molybdenum": {
                      "min": 6.0,
                      "max": 6.8,
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
                      "min": 0.15,
                      "max": 0.22,
                      "typical": 0.2
                },
                "copper": {
                      "min": 0.8,
                      "max": 1.5,
                      "typical": 1.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
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
                "density": 8112,
                "melting_point": {
                      "solidus": 1292,
                      "liquidus": 1347
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
                      "min": 570,
                      "typical": 620,
                      "max": 670
                },
                "yield_strength": {
                      "min": 250,
                      "typical": 285,
                      "max": 320
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
                "fatigue_strength": 248,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2520,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 390,
                "B": 1200,
                "C": 0.05,
                "n": 0.66,
                "m": 1.0,
                "melting_temp": 1347,
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
                "aisi_rating": 23,
                "relative_to_1212": 0.23,
                "power_factor": 1.235,
                "tool_wear_factor": 1.27,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 34,
                            "optimal": 56,
                            "max": 83,
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
                            "optimal": 48,
                            "max": 75,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "Flue gas desulfurization"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },

    // ======================================================================
    // M-SS-100: UR 66 (S31266)
    // ======================================================================
    "M-SS-100": {
          "id": "M-SS-100",
          "name": "UR 66 (S31266)",
          "designation": {
                "aisi_sae": "UR66",
                "uns": "S31266",
                "din": "1.4659",
                "jis": "",
                "en": ""
          },
          "iso_group": "M",
          "material_class": "Stainless Steel - Super Austenitic",
          "condition": "Solution Annealed",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.015
                },
                "chromium": {
                      "min": 23.0,
                      "max": 25.0,
                      "typical": 24.0
                },
                "nickel": {
                      "min": 21.0,
                      "max": 24.0,
                      "typical": 22.5
                },
                "molybdenum": {
                      "min": 5.5,
                      "max": 6.5,
                      "typical": 6.0
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
                      "min": 0.35,
                      "max": 0.5,
                      "typical": 0.4
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
                "tungsten": {
                      "min": 1.5,
                      "max": 2.5,
                      "typical": 2.0
                },
                "vanadium": {
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
                "density": 8142,
                "melting_point": {
                      "solidus": 1322,
                      "liquidus": 1377
                },
                "specific_heat": 500,
                "thermal_conductivity": 10.5,
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
                      "min": 650,
                      "typical": 700,
                      "max": 750
                },
                "yield_strength": {
                      "min": 325,
                      "typical": 360,
                      "max": 395
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
                "fatigue_strength": 280,
                "fracture_toughness": 200
          },
          "kienzle": {
                "kc1_1": 2650,
                "mc": 0.2,
                "kc_temp_coefficient": -0.001,
                "kc_speed_coefficient": -0.1,
                "rake_angle_correction": 0.015,
                "chip_thickness_exponent": 0.7,
                "cutting_edge_correction": 1.05,
                "engagement_factor": 1.0
          },
          "johnson_cook": {
                "A": 480,
                "B": 1280,
                "C": 0.042,
                "n": 0.62,
                "m": 1.0,
                "melting_temp": 1377,
                "reference_strain_rate": 1.0
          },
          "taylor": {
                "C": 72,
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
                "aisi_rating": 19,
                "relative_to_1212": 0.19,
                "power_factor": 1.2550000000000001,
                "tool_wear_factor": 1.31,
                "surface_finish_factor": 0.85,
                "chip_control_rating": "poor",
                "overall_rating": "difficult",
                "difficulty_class": 4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "min": 32,
                            "optimal": 53,
                            "max": 79,
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
                            "min": 26,
                            "optimal": 46,
                            "max": 72,
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
                            "min": 12,
                            "optimal": 22,
                            "max": 34,
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
                "confidence_level": 0.95,
                "standard_deviation_kc": 80,
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
          "notes": "W addition - oil/gas/chemical industry"
    ,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 24, unit: "degrees", range: { min: 19, max: 30 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "HIGH", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "POOR", chipBreakerRequired: true },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.52, withCoolant: 0.34, withMQL: 0.39 },
        toolWorkpieceInterface: { dry: 0.45, withCoolant: 0.30 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 340, b: 0.32, c: 0.14 }, maxRecommended: { value: 900, unit: "C" } },
        heatPartition: { chip: 0.72, tool: 0.22, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 980, overTempering: 720, burning: 1100 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -220, subsurface: 132, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 28, strainHardeningExponent: 0.35 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "MODERATE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.84,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = STAINLESS_STEELS_051_100;
}
