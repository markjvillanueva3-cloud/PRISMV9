/**
 * PRISM MATERIALS DATABASE - Alloy/HSLA/Automotive/Wear/Pipeline Steels
 * File: steels_201_250.js - P-CS-201 to P-CS-250 (50 materials)
 * Generated: 2026-01-24 18:59:27
 */
const STEELS_201_250 = {
  metadata: {file: "steels_201_250.js", category: "P_STEELS", materialCount: 50},
  materials: {
    "P-CS-201": {
          "id": "P-CS-201",
          "name": "AISI 4340 Q&T 28 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 28 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 38.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 277,
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
                      "typical": 16
                },
                "fatigue_strength": 434
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 792,
                "B": 510,
                "C": 0.014,
                "n": 0.26,
                "m": 1.03
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 63,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-202": {
          "id": "P-CS-202",
          "name": "AISI 4340 Q&T 45 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "H",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 45 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 38.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 430,
                      "rockwell_c": 45,
                      "vickers": 451
                },
                "tensile_strength": {
                      "min": 1430,
                      "typical": 1480,
                      "max": 1530
                },
                "yield_strength": {
                      "min": 1340,
                      "typical": 1380,
                      "max": 1420
                },
                "elongation": {
                      "typical": 10
                },
                "fatigue_strength": 666
          },
          "kienzle": {
                "kc1_1": 2900,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1200,
                "B": 870,
                "C": 0.01,
                "n": 0.3,
                "m": 1.1
          },
          "taylor": {
                "C": 92,
                "n": 0.14
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 51,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-203": {
          "id": "P-CS-203",
          "name": "AISI 4130 Chromoly Annealed",
          "designation": {
                "aisi_sae": "4130",
                "uns": "G41300",
                "din": "1.7218",
                "en": "25CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.33,
                      "typical": 0.31
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1475,
                      "liquidus": 1525
                },
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 165,
                      "rockwell_c": null,
                      "vickers": 173
                },
                "tensile_strength": {
                      "min": 510,
                      "typical": 560,
                      "max": 610
                },
                "yield_strength": {
                      "min": 320,
                      "typical": 360,
                      "max": 400
                },
                "elongation": {
                      "typical": 22
                },
                "fatigue_strength": 252
          },
          "kienzle": {
                "kc1_1": 1680,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 400,
                "B": 640,
                "C": 0.03,
                "n": 0.48,
                "m": 0.92
          },
          "taylor": {
                "C": 170,
                "n": 0.23
          },
          "machinability": {
                "aisi_rating": 62,
                "relative_to_1212": 0.62
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 72,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Aircraft tubing"
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

    "P-CS-204": {
          "id": "P-CS-204",
          "name": "AISI 4130 Normalized",
          "designation": {
                "aisi_sae": "4130",
                "uns": "G41300",
                "din": "1.7218",
                "en": "25CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Normalized",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.33,
                      "typical": 0.31
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1475,
                      "liquidus": 1525
                },
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_c": null,
                      "vickers": 204
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
                      "typical": 18
                },
                "fatigue_strength": 301
          },
          "kienzle": {
                "kc1_1": 1920,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 520,
                "B": 740,
                "C": 0.022,
                "n": 0.44,
                "m": 0.96
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 68,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-205": {
          "id": "P-CS-205",
          "name": "AISI 4130 Q&T 32 HRC",
          "designation": {
                "aisi_sae": "4130",
                "uns": "G41300",
                "din": "1.7218",
                "en": "25CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 32 HRC",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.33,
                      "typical": 0.31
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1475,
                      "liquidus": 1525
                },
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 302,
                      "rockwell_c": 32,
                      "vickers": 317
                },
                "tensile_strength": {
                      "min": 980,
                      "typical": 1030,
                      "max": 1080
                },
                "yield_strength": {
                      "min": 820,
                      "typical": 860,
                      "max": 900
                },
                "elongation": {
                      "typical": 14
                },
                "fatigue_strength": 463
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 820,
                "B": 850,
                "C": 0.014,
                "n": 0.36,
                "m": 1.05
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 60,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-206": {
          "id": "P-CS-206",
          "name": "AISI 4135 Chromoly",
          "designation": {
                "aisi_sae": "4135",
                "uns": "G41350",
                "din": "1.7220",
                "en": "34CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.33,
                      "max": 0.38,
                      "typical": 0.36
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1471,
                      "liquidus": 1521
                },
                "thermal_conductivity": 41.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 175,
                      "rockwell_c": null,
                      "vickers": 183
                },
                "tensile_strength": {
                      "min": 540,
                      "typical": 590,
                      "max": 640
                },
                "yield_strength": {
                      "min": 340,
                      "typical": 380,
                      "max": 420
                },
                "elongation": {
                      "typical": 20
                },
                "fatigue_strength": 265
          },
          "kienzle": {
                "kc1_1": 1750,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 440,
                "B": 680,
                "C": 0.028,
                "n": 0.46,
                "m": 0.94
          },
          "taylor": {
                "C": 165,
                "n": 0.22
          },
          "machinability": {
                "aisi_rating": 60,
                "relative_to_1212": 0.6
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 71,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-207": {
          "id": "P-CS-207",
          "name": "AISI 4137 Chromoly",
          "designation": {
                "aisi_sae": "4137",
                "uns": "G41370",
                "din": "1.7225",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.35,
                      "max": 0.4,
                      "typical": 0.38
                },
                "manganese": {
                      "min": 0.7,
                      "max": 0.9,
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7833,
                "melting_point": {
                      "solidus": 1469,
                      "liquidus": 1519
                },
                "thermal_conductivity": 41.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 180,
                      "rockwell_c": null,
                      "vickers": 189
                },
                "tensile_strength": {
                      "min": 560,
                      "typical": 610,
                      "max": 660
                },
                "yield_strength": {
                      "min": 355,
                      "typical": 395,
                      "max": 435
                },
                "elongation": {
                      "typical": 19
                },
                "fatigue_strength": 274
          },
          "kienzle": {
                "kc1_1": 1780,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 460,
                "B": 700,
                "C": 0.026,
                "n": 0.45,
                "m": 0.95
          },
          "taylor": {
                "C": 160,
                "n": 0.22
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 69,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-208": {
          "id": "P-CS-208",
          "name": "AISI 4140 Annealed",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4"
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_c": null,
                      "vickers": 204
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
                      "typical": 18
                },
                "fatigue_strength": 294
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 595,
                "B": 580,
                "C": 0.023,
                "n": 0.3,
                "m": 1.0
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 68,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Most common alloy steel"
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

    "P-CS-209": {
          "id": "P-CS-209",
          "name": "AISI 4140 Q&T 22 HRC",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 22 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 235,
                      "rockwell_c": 22,
                      "vickers": 246
                },
                "tensile_strength": {
                      "min": 750,
                      "typical": 800,
                      "max": 850
                },
                "yield_strength": {
                      "min": 615,
                      "typical": 655,
                      "max": 695
                },
                "elongation": {
                      "typical": 18
                },
                "fatigue_strength": 360
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 650,
                "B": 730,
                "C": 0.018,
                "n": 0.36,
                "m": 1.02
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 66,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-210": {
          "id": "P-CS-210",
          "name": "AISI 4140 Q&T 28 HRC",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 28 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 277,
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
                      "typical": 16
                },
                "fatigue_strength": 434
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 760,
                "B": 820,
                "C": 0.015,
                "n": 0.32,
                "m": 1.05
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 63,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-211": {
          "id": "P-CS-211",
          "name": "AISI 4140 Q&T 32 HRC",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 32 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 302,
                      "rockwell_c": 32,
                      "vickers": 317
                },
                "tensile_strength": {
                      "min": 980,
                      "typical": 1030,
                      "max": 1080
                },
                "yield_strength": {
                      "min": 855,
                      "typical": 895,
                      "max": 935
                },
                "elongation": {
                      "typical": 14
                },
                "fatigue_strength": 463
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 850,
                "B": 860,
                "C": 0.012,
                "n": 0.3,
                "m": 1.08
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 62,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-212": {
          "id": "P-CS-212",
          "name": "AISI 4140 Q&T 38 HRC",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4"
          },
          "iso_group": "H",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 38 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 352,
                      "rockwell_c": 38,
                      "vickers": 369
                },
                "tensile_strength": {
                      "min": 1150,
                      "typical": 1200,
                      "max": 1250
                },
                "yield_strength": {
                      "min": 1060,
                      "typical": 1100,
                      "max": 1140
                },
                "elongation": {
                      "typical": 12
                },
                "fatigue_strength": 540
          },
          "kienzle": {
                "kc1_1": 2600,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 1000,
                "B": 900,
                "C": 0.01,
                "n": 0.28,
                "m": 1.1
          },
          "taylor": {
                "C": 108,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 56,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-213": {
          "id": "P-CS-213",
          "name": "E4340 Electric Furnace Premium",
          "designation": {
                "aisi_sae": "E4340",
                "uns": "G43406",
                "din": "1.6582",
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 38.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_c": null,
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
                      "typical": 16
                },
                "fatigue_strength": 310
          },
          "kienzle": {
                "kc1_1": 1980,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 792,
                "B": 510,
                "C": 0.014,
                "n": 0.26,
                "m": 1.03
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 68,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Premium cleanliness"
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

    "P-CS-214": {
          "id": "P-CS-214",
          "name": "AISI 4330V Mod (Hy-Tuf)",
          "designation": {
                "aisi_sae": "4330V",
                "uns": "K23477",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 40 HRC",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.34,
                      "typical": 0.32
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
                      "min": 0.75,
                      "max": 1.05,
                      "typical": 0.9
                },
                "molybdenum": {
                      "min": 0.35,
                      "max": 0.5,
                      "typical": 0.45
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7844,
                "melting_point": {
                      "solidus": 1465,
                      "liquidus": 1515
                },
                "thermal_conductivity": 36.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 375,
                      "rockwell_c": 40,
                      "vickers": 393
                },
                "tensile_strength": {
                      "min": 1260,
                      "typical": 1310,
                      "max": 1360
                },
                "yield_strength": {
                      "min": 1130,
                      "typical": 1170,
                      "max": 1210
                },
                "elongation": {
                      "typical": 12
                },
                "fatigue_strength": 589
          },
          "kienzle": {
                "kc1_1": 2700,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 1050,
                "B": 880,
                "C": 0.012,
                "n": 0.3,
                "m": 1.08
          },
          "taylor": {
                "C": 108,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 56,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Landing gear"
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

    "P-CS-215": {
          "id": "P-CS-215",
          "name": "HP 9-4-30 Ultra High Strength",
          "designation": {
                "aisi_sae": "HP9-4-30",
                "uns": "K91472",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Alloy",
          "condition": "Q&T 52 HRC",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.34,
                      "typical": 0.32
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
                      "min": 0.7,
                      "max": 1.1,
                      "typical": 0.9
                },
                "molybdenum": {
                      "min": 1.0,
                      "max": 1.0,
                      "typical": 1.0
                },
                "vanadium": {
                      "min": 0.06,
                      "max": 0.12,
                      "typical": 0.1
                },
                "nickel": {
                      "min": 7.0,
                      "max": 8.0,
                      "typical": 7.5
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7917,
                "melting_point": {
                      "solidus": 1436,
                      "liquidus": 1486
                },
                "thermal_conductivity": 28.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 500,
                      "rockwell_c": 52,
                      "vickers": 525
                },
                "tensile_strength": {
                      "min": 1880,
                      "typical": 1930,
                      "max": 1980
                },
                "yield_strength": {
                      "min": 1610,
                      "typical": 1650,
                      "max": 1690
                },
                "elongation": {
                      "typical": 10
                },
                "fatigue_strength": 868
          },
          "kienzle": {
                "kc1_1": 3400,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1500,
                "B": 950,
                "C": 0.008,
                "n": 0.26,
                "m": 1.12
          },
          "taylor": {
                "C": 78,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 48,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Armor plate"
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

    "P-CS-216": {
          "id": "P-CS-216",
          "name": "ASTM A656 Grade 80 HSLA",
          "designation": {
                "aisi_sae": "A656-80",
                "uns": "K12249",
                "din": "",
                "en": "S500MC"
          },
          "iso_group": "P",
          "material_class": "Steel - Hsla",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.18,
                      "typical": 0.12
                },
                "manganese": {
                      "min": 0,
                      "max": 1.65,
                      "typical": 1.35
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
                      "max": 0.15,
                      "typical": 0.05
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0.06,
                      "typical": 0.02
                },
                "niobium": {
                      "min": 0.02,
                      "max": 0.08,
                      "typical": 0.04
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1490,
                      "liquidus": 1540
                },
                "thermal_conductivity": 48.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 165,
                      "rockwell_c": null,
                      "vickers": 173
                },
                "tensile_strength": {
                      "min": 540,
                      "typical": 590,
                      "max": 640
                },
                "yield_strength": {
                      "min": 510,
                      "typical": 550,
                      "max": 590
                },
                "elongation": {
                      "typical": 15
                },
                "fatigue_strength": 265
          },
          "kienzle": {
                "kc1_1": 1700,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 440,
                "B": 680,
                "C": 0.028,
                "n": 0.46,
                "m": 0.94
          },
          "taylor": {
                "C": 160,
                "n": 0.22
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 69,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-217": {
          "id": "P-CS-217",
          "name": "ASTM A607 Grade 50 HSLA Sheet",
          "designation": {
                "aisi_sae": "A607-50",
                "uns": "K12050",
                "din": "",
                "en": "S355MC"
          },
          "iso_group": "P",
          "material_class": "Steel - Hsla",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.22,
                      "typical": 0.12
                },
                "manganese": {
                      "min": 0,
                      "max": 1.35,
                      "typical": 1.25
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
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.005,
                      "max": 0.05,
                      "typical": 0.015
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1490,
                      "liquidus": 1540
                },
                "thermal_conductivity": 50.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 140,
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
                      "typical": 20
                },
                "fatigue_strength": 202
          },
          "kienzle": {
                "kc1_1": 1520,
                "mc": 0.25
          },
          "johnson_cook": {
                "A": 360,
                "B": 600,
                "C": 0.035,
                "n": 0.5,
                "m": 0.9
          },
          "taylor": {
                "C": 175,
                "n": 0.24
          },
          "machinability": {
                "aisi_rating": 65,
                "relative_to_1212": 0.65
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 74,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-218": {
          "id": "P-CS-218",
          "name": "HY-80 Naval Steel",
          "designation": {
                "aisi_sae": "HY-80",
                "uns": "K31820",
                "din": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Hsla",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.12,
                      "max": 0.18,
                      "typical": 0.15
                },
                "manganese": {
                      "min": 0.1,
                      "max": 0.4,
                      "typical": 0.3
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 1.0,
                      "max": 1.8,
                      "typical": 1.5
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.6,
                      "typical": 0.35
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 2.0,
                      "max": 3.25,
                      "typical": 2.5
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7853,
                "melting_point": {
                      "solidus": 1475,
                      "liquidus": 1525
                },
                "thermal_conductivity": 36.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 235,
                      "rockwell_c": null,
                      "vickers": 246
                },
                "tensile_strength": {
                      "min": 640,
                      "typical": 690,
                      "max": 740
                },
                "yield_strength": {
                      "min": 510,
                      "typical": 550,
                      "max": 590
                },
                "elongation": {
                      "typical": 20
                },
                "fatigue_strength": 310
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 580,
                "B": 760,
                "C": 0.02,
                "n": 0.42,
                "m": 0.98
          },
          "taylor": {
                "C": 140,
                "n": 0.19
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 65,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Submarine hulls"
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

    "P-CS-219": {
          "id": "P-CS-219",
          "name": "HY-100 Naval Steel",
          "designation": {
                "aisi_sae": "HY-100",
                "uns": "K32045",
                "din": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Hsla",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.14,
                      "max": 0.2,
                      "typical": 0.17
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
                      "max": 1.8,
                      "typical": 1.5
                },
                "molybdenum": {
                      "min": 0.35,
                      "max": 0.65,
                      "typical": 0.45
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 2.25,
                      "max": 3.5,
                      "typical": 2.75
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7853,
                "melting_point": {
                      "solidus": 1472,
                      "liquidus": 1522
                },
                "thermal_conductivity": 34.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 260,
                      "rockwell_c": null,
                      "vickers": 273
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
                      "typical": 16
                },
                "fatigue_strength": 342
          },
          "kienzle": {
                "kc1_1": 2180,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 680,
                "B": 820,
                "C": 0.016,
                "n": 0.38,
                "m": 1.02
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 62,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-220": {
          "id": "P-CS-220",
          "name": "HY-130 High Yield Naval",
          "designation": {
                "aisi_sae": "HY-130",
                "uns": "K42339",
                "din": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Hsla",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.1,
                      "max": 0.14,
                      "typical": 0.12
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
                      "max": 0.7,
                      "typical": 0.55
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.65,
                      "typical": 0.45
                },
                "vanadium": {
                      "min": 0.05,
                      "max": 0.1,
                      "typical": 0.08
                },
                "nickel": {
                      "min": 4.75,
                      "max": 5.25,
                      "typical": 5.0
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7866,
                "melting_point": {
                      "solidus": 1465,
                      "liquidus": 1515
                },
                "thermal_conductivity": 32.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 290,
                      "rockwell_c": null,
                      "vickers": 304
                },
                "tensile_strength": {
                      "min": 915,
                      "typical": 965,
                      "max": 1015
                },
                "yield_strength": {
                      "min": 855,
                      "typical": 895,
                      "max": 935
                },
                "elongation": {
                      "typical": 14
                },
                "fatigue_strength": 434
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 850,
                "B": 880,
                "C": 0.012,
                "n": 0.34,
                "m": 1.06
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 60,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-221": {
          "id": "P-CS-221",
          "name": "Dual Phase 590 Automotive",
          "designation": {
                "aisi_sae": "DP590",
                "uns": "",
                "din": "",
                "en": "HCT590X"
          },
          "iso_group": "P",
          "material_class": "Steel - Dual Phase",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.06,
                      "max": 0.15,
                      "typical": 0.1
                },
                "manganese": {
                      "min": 1.4,
                      "max": 2.2,
                      "typical": 1.8
                },
                "silicon": {
                      "min": 0.1,
                      "max": 0.5,
                      "typical": 0.3
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1492,
                      "liquidus": 1542
                },
                "thermal_conductivity": 45.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 180,
                      "rockwell_c": null,
                      "vickers": 189
                },
                "tensile_strength": {
                      "min": 540,
                      "typical": 590,
                      "max": 640
                },
                "yield_strength": {
                      "min": 300,
                      "typical": 340,
                      "max": 380
                },
                "elongation": {
                      "typical": 22
                },
                "fatigue_strength": 265
          },
          "kienzle": {
                "kc1_1": 1800,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 420,
                "B": 720,
                "C": 0.03,
                "n": 0.48,
                "m": 0.92
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 68,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Crash structures"
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

    "P-CS-222": {
          "id": "P-CS-222",
          "name": "Dual Phase 780 Automotive",
          "designation": {
                "aisi_sae": "DP780",
                "uns": "",
                "din": "",
                "en": "HCT780X"
          },
          "iso_group": "P",
          "material_class": "Steel - Dual Phase",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.1,
                      "max": 0.18,
                      "typical": 0.14
                },
                "manganese": {
                      "min": 1.8,
                      "max": 2.5,
                      "typical": 2.2
                },
                "silicon": {
                      "min": 0.2,
                      "max": 0.6,
                      "typical": 0.4
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1488,
                      "liquidus": 1538
                },
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 220,
                      "rockwell_c": null,
                      "vickers": 231
                },
                "tensile_strength": {
                      "min": 730,
                      "typical": 780,
                      "max": 830
                },
                "yield_strength": {
                      "min": 410,
                      "typical": 450,
                      "max": 490
                },
                "elongation": {
                      "typical": 16
                },
                "fatigue_strength": 351
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 550,
                "B": 820,
                "C": 0.022,
                "n": 0.42,
                "m": 0.98
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 63,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-223": {
          "id": "P-CS-223",
          "name": "Dual Phase 980 Automotive",
          "designation": {
                "aisi_sae": "DP980",
                "uns": "",
                "din": "",
                "en": "HCT980X"
          },
          "iso_group": "P",
          "material_class": "Steel - Dual Phase",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.12,
                      "max": 0.2,
                      "typical": 0.16
                },
                "manganese": {
                      "min": 2.0,
                      "max": 2.8,
                      "typical": 2.4
                },
                "silicon": {
                      "min": 0.3,
                      "max": 0.7,
                      "typical": 0.5
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1487,
                      "liquidus": 1537
                },
                "thermal_conductivity": 40.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 280,
                      "rockwell_c": null,
                      "vickers": 294
                },
                "tensile_strength": {
                      "min": 930,
                      "typical": 980,
                      "max": 1030
                },
                "yield_strength": {
                      "min": 560,
                      "typical": 600,
                      "max": 640
                },
                "elongation": {
                      "typical": 10
                },
                "fatigue_strength": 441
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 720,
                "B": 900,
                "C": 0.015,
                "n": 0.36,
                "m": 1.05
          },
          "taylor": {
                "C": 120,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 40,
                "relative_to_1212": 0.4
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 59,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-224": {
          "id": "P-CS-224",
          "name": "Dual Phase 1180 Automotive",
          "designation": {
                "aisi_sae": "DP1180",
                "uns": "",
                "din": "",
                "en": "HCT1180X"
          },
          "iso_group": "P",
          "material_class": "Steel - Dual Phase",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.15,
                      "max": 0.23,
                      "typical": 0.19
                },
                "manganese": {
                      "min": 2.2,
                      "max": 3.0,
                      "typical": 2.6
                },
                "silicon": {
                      "min": 0.4,
                      "max": 0.8,
                      "typical": 0.6
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1484,
                      "liquidus": 1534
                },
                "thermal_conductivity": 38.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 340,
                      "rockwell_c": null,
                      "vickers": 357
                },
                "tensile_strength": {
                      "min": 1130,
                      "typical": 1180,
                      "max": 1230
                },
                "yield_strength": {
                      "min": 810,
                      "typical": 850,
                      "max": 890
                },
                "elongation": {
                      "typical": 6
                },
                "fatigue_strength": 531
          },
          "kienzle": {
                "kc1_1": 2700,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 950,
                "B": 980,
                "C": 0.01,
                "n": 0.3,
                "m": 1.1
          },
          "taylor": {
                "C": 100,
                "n": 0.15
          },
          "machinability": {
                "aisi_rating": 32,
                "relative_to_1212": 0.32
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 54,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-225": {
          "id": "P-CS-225",
          "name": "TRIP 590 Automotive",
          "designation": {
                "aisi_sae": "TRIP590",
                "uns": "",
                "din": "",
                "en": "HCT590T"
          },
          "iso_group": "P",
          "material_class": "Steel - Trip",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.12,
                      "max": 0.24,
                      "typical": 0.18
                },
                "manganese": {
                      "min": 1.4,
                      "max": 2.0,
                      "typical": 1.7
                },
                "silicon": {
                      "min": 1.0,
                      "max": 2.0,
                      "typical": 1.5
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1485,
                      "liquidus": 1535
                },
                "thermal_conductivity": 40.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 180,
                      "rockwell_c": null,
                      "vickers": 189
                },
                "tensile_strength": {
                      "min": 540,
                      "typical": 590,
                      "max": 640
                },
                "yield_strength": {
                      "min": 340,
                      "typical": 380,
                      "max": 420
                },
                "elongation": {
                      "typical": 26
                },
                "fatigue_strength": 265
          },
          "kienzle": {
                "kc1_1": 1850,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 450,
                "B": 750,
                "C": 0.032,
                "n": 0.5,
                "m": 0.9
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 66,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-226": {
          "id": "P-CS-226",
          "name": "TRIP 780 Automotive",
          "designation": {
                "aisi_sae": "TRIP780",
                "uns": "",
                "din": "",
                "en": "HCT780T"
          },
          "iso_group": "P",
          "material_class": "Steel - Trip",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.28,
                      "typical": 0.23
                },
                "manganese": {
                      "min": 1.6,
                      "max": 2.3,
                      "typical": 2.0
                },
                "silicon": {
                      "min": 1.2,
                      "max": 2.2,
                      "typical": 1.8
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7807,
                "melting_point": {
                      "solidus": 1481,
                      "liquidus": 1531
                },
                "thermal_conductivity": 38.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 220,
                      "rockwell_c": null,
                      "vickers": 231
                },
                "tensile_strength": {
                      "min": 730,
                      "typical": 780,
                      "max": 830
                },
                "yield_strength": {
                      "min": 450,
                      "typical": 490,
                      "max": 530
                },
                "elongation": {
                      "typical": 20
                },
                "fatigue_strength": 351
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 600,
                "B": 850,
                "C": 0.024,
                "n": 0.44,
                "m": 0.96
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 62,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-227": {
          "id": "P-CS-227",
          "name": "Complex Phase 800",
          "designation": {
                "aisi_sae": "CP800",
                "uns": "",
                "din": "",
                "en": "HCT800C"
          },
          "iso_group": "P",
          "material_class": "Steel - Complex Phase",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.1,
                      "max": 0.18,
                      "typical": 0.14
                },
                "manganese": {
                      "min": 1.6,
                      "max": 2.4,
                      "typical": 2.0
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
                "titanium": {
                      "min": 0.01,
                      "max": 0.05,
                      "typical": 0.03
                },
                "niobium": {
                      "min": 0.01,
                      "max": 0.05,
                      "typical": 0.03
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1488,
                      "liquidus": 1538
                },
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 235,
                      "rockwell_c": null,
                      "vickers": 246
                },
                "tensile_strength": {
                      "min": 750,
                      "typical": 800,
                      "max": 850
                },
                "yield_strength": {
                      "min": 640,
                      "typical": 680,
                      "max": 720
                },
                "elongation": {
                      "typical": 12
                },
                "fatigue_strength": 360
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 680,
                "B": 860,
                "C": 0.018,
                "n": 0.38,
                "m": 1.02
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 62,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-228": {
          "id": "P-CS-228",
          "name": "Complex Phase 1000",
          "designation": {
                "aisi_sae": "CP1000",
                "uns": "",
                "din": "",
                "en": "HCT1000C"
          },
          "iso_group": "P",
          "material_class": "Steel - Complex Phase",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0.14,
                      "max": 0.22,
                      "typical": 0.18
                },
                "manganese": {
                      "min": 1.8,
                      "max": 2.6,
                      "typical": 2.2
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
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "niobium": {
                      "min": 0.02,
                      "max": 0.06,
                      "typical": 0.04
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 40.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 290,
                      "rockwell_c": null,
                      "vickers": 304
                },
                "tensile_strength": {
                      "min": 950,
                      "typical": 1000,
                      "max": 1050
                },
                "yield_strength": {
                      "min": 780,
                      "typical": 820,
                      "max": 860
                },
                "elongation": {
                      "typical": 8
                },
                "fatigue_strength": 450
          },
          "kienzle": {
                "kc1_1": 2400,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 850,
                "B": 920,
                "C": 0.012,
                "n": 0.32,
                "m": 1.08
          },
          "taylor": {
                "C": 115,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 38,
                "relative_to_1212": 0.38
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 57,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-229": {
          "id": "P-CS-229",
          "name": "22MnB5 Hot Stamp Steel",
          "designation": {
                "aisi_sae": "22MnB5",
                "uns": "",
                "din": "1.5528",
                "en": "22MnB5"
          },
          "iso_group": "P",
          "material_class": "Steel - Hot Stamp",
          "condition": "As Delivered",
          "composition": {
                "carbon": {
                      "min": 0.2,
                      "max": 0.25,
                      "typical": 0.23
                },
                "manganese": {
                      "min": 1.1,
                      "max": 1.4,
                      "typical": 1.25
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0.0015,
                      "max": 0.005,
                      "typical": 0.003
                },
                "sulfur": {
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
                "density": 7838,
                "melting_point": {
                      "solidus": 1481,
                      "liquidus": 1531
                },
                "thermal_conductivity": 45.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 180,
                      "rockwell_c": null,
                      "vickers": 189
                },
                "tensile_strength": {
                      "min": 550,
                      "typical": 600,
                      "max": 650
                },
                "yield_strength": {
                      "min": 360,
                      "typical": 400,
                      "max": 440
                },
                "elongation": {
                      "typical": 22
                },
                "fatigue_strength": 270
          },
          "kienzle": {
                "kc1_1": 1800,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 450,
                "B": 740,
                "C": 0.03,
                "n": 0.48,
                "m": 0.92
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 68,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Soft before stamping"
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

    "P-CS-230": {
          "id": "P-CS-230",
          "name": "22MnB5 Hot Stamped 48 HRC",
          "designation": {
                "aisi_sae": "22MnB5",
                "uns": "",
                "din": "1.5528",
                "en": "22MnB5"
          },
          "iso_group": "H",
          "material_class": "Steel - Hot Stamp",
          "condition": "Hot Stamped 48 HRC",
          "composition": {
                "carbon": {
                      "min": 0.2,
                      "max": 0.25,
                      "typical": 0.23
                },
                "manganese": {
                      "min": 1.1,
                      "max": 1.4,
                      "typical": 1.25
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0.0015,
                      "max": 0.005,
                      "typical": 0.003
                },
                "sulfur": {
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
                "density": 7838,
                "melting_point": {
                      "solidus": 1481,
                      "liquidus": 1531
                },
                "thermal_conductivity": 45.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 460,
                      "rockwell_c": 48,
                      "vickers": 483
                },
                "tensile_strength": {
                      "min": 1450,
                      "typical": 1500,
                      "max": 1550
                },
                "yield_strength": {
                      "min": 1060,
                      "typical": 1100,
                      "max": 1140
                },
                "elongation": {
                      "typical": 6
                },
                "fatigue_strength": 675
          },
          "kienzle": {
                "kc1_1": 3100,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1200,
                "B": 900,
                "C": 0.008,
                "n": 0.28,
                "m": 1.12
          },
          "taylor": {
                "C": 78,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 48,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "1500 MPa after stamping"
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

    "P-CS-231": {
          "id": "P-CS-231",
          "name": "Press Hardened Steel 1500",
          "designation": {
                "aisi_sae": "PHS1500",
                "uns": "",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Hot Stamp",
          "condition": "Hot Stamped",
          "composition": {
                "carbon": {
                      "min": 0.22,
                      "max": 0.27,
                      "typical": 0.25
                },
                "manganese": {
                      "min": 1.15,
                      "max": 1.45,
                      "typical": 1.3
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.15,
                      "max": 0.4,
                      "typical": 0.3
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0.002,
                      "max": 0.005,
                      "typical": 0.003
                },
                "sulfur": {
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
                "thermal_conductivity": 44.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 475,
                      "rockwell_c": 49,
                      "vickers": 498
                },
                "tensile_strength": {
                      "min": 1450,
                      "typical": 1500,
                      "max": 1550
                },
                "yield_strength": {
                      "min": 1110,
                      "typical": 1150,
                      "max": 1190
                },
                "elongation": {
                      "typical": 5
                },
                "fatigue_strength": 675
          },
          "kienzle": {
                "kc1_1": 3200,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1280,
                "B": 920,
                "C": 0.008,
                "n": 0.26,
                "m": 1.14
          },
          "taylor": {
                "C": 72,
                "n": 0.12
          },
          "machinability": {
                "aisi_rating": 20,
                "relative_to_1212": 0.2
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 47,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-232": {
          "id": "P-CS-232",
          "name": "Press Hardened Steel 1900",
          "designation": {
                "aisi_sae": "PHS1900",
                "uns": "",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Hot Stamp",
          "condition": "Hot Stamped",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.38,
                      "typical": 0.35
                },
                "manganese": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.2,
                      "max": 0.5,
                      "typical": 0.35
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0.002,
                      "max": 0.006,
                      "typical": 0.004
                },
                "sulfur": {
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
                      "solidus": 1472,
                      "liquidus": 1522
                },
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 540,
                      "rockwell_c": 54,
                      "vickers": 567
                },
                "tensile_strength": {
                      "min": 1850,
                      "typical": 1900,
                      "max": 1950
                },
                "yield_strength": {
                      "min": 1360,
                      "typical": 1400,
                      "max": 1440
                },
                "elongation": {
                      "typical": 4
                },
                "fatigue_strength": 855
          },
          "kienzle": {
                "kc1_1": 3600,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1600,
                "B": 980,
                "C": 0.006,
                "n": 0.22,
                "m": 1.18
          },
          "taylor": {
                "C": 58,
                "n": 0.1
          },
          "machinability": {
                "aisi_rating": 15,
                "relative_to_1212": 0.15
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 44,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-233": {
          "id": "P-CS-233",
          "name": "AISI 4140 Free Machining",
          "designation": {
                "aisi_sae": "4140S",
                "uns": "G41400",
                "din": "1.7223",
                "en": "41CrS4"
          },
          "iso_group": "P",
          "material_class": "Steel - Free Machining",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
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
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_c": null,
                      "vickers": 204
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
                      "typical": 15
                },
                "fatigue_strength": 294
          },
          "kienzle": {
                "kc1_1": 1750,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 540,
                "B": 720,
                "C": 0.025,
                "n": 0.42,
                "m": 0.95
          },
          "taylor": {
                "C": 190,
                "n": 0.26
          },
          "machinability": {
                "aisi_rating": 70,
                "relative_to_1212": 0.7
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 77,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-234": {
          "id": "P-CS-234",
          "name": "AISI 8620 Free Machining",
          "designation": {
                "aisi_sae": "8620S",
                "uns": "G86200",
                "din": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Free Machining",
          "condition": "Annealed",
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
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
                "thermal_conductivity": 44.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 155,
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
                      "typical": 20
                },
                "fatigue_strength": 229
          },
          "kienzle": {
                "kc1_1": 1550,
                "mc": 0.25
          },
          "johnson_cook": {
                "A": 360,
                "B": 580,
                "C": 0.038,
                "n": 0.5,
                "m": 0.88
          },
          "taylor": {
                "C": 200,
                "n": 0.27
          },
          "machinability": {
                "aisi_rating": 75,
                "relative_to_1212": 0.75
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 80,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-235": {
          "id": "P-CS-235",
          "name": "AISI 4140 Leaded",
          "designation": {
                "aisi_sae": "4140Pb",
                "uns": "G41401",
                "din": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Free Machining",
          "condition": "Annealed",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_c": null,
                      "vickers": 204
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
                      "typical": 16
                },
                "fatigue_strength": 294
          },
          "kienzle": {
                "kc1_1": 1700,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 520,
                "B": 700,
                "C": 0.028,
                "n": 0.44,
                "m": 0.93
          },
          "taylor": {
                "C": 210,
                "n": 0.28
          },
          "machinability": {
                "aisi_rating": 78,
                "relative_to_1212": 0.78
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 81,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Lead - environmental restrictions"
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

    "P-CS-236": {
          "id": "P-CS-236",
          "name": "AISI 10B21 Boron Steel",
          "designation": {
                "aisi_sae": "10B21",
                "uns": "G10211",
                "din": "1.5508",
                "en": "20MnB4"
          },
          "iso_group": "P",
          "material_class": "Steel - Boron",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.21
                },
                "manganese": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0.0005,
                      "max": 0.003,
                      "typical": 0.002
                },
                "sulfur": {
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
                "density": 7838,
                "melting_point": {
                      "solidus": 1483,
                      "liquidus": 1533
                },
                "thermal_conductivity": 48.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 235,
                      "rockwell_c": null,
                      "vickers": 246
                },
                "tensile_strength": {
                      "min": 750,
                      "typical": 800,
                      "max": 850
                },
                "yield_strength": {
                      "min": 650,
                      "typical": 690,
                      "max": 730
                },
                "elongation": {
                      "typical": 16
                },
                "fatigue_strength": 360
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 650,
                "B": 780,
                "C": 0.02,
                "n": 0.4,
                "m": 0.98
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 66,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-237": {
          "id": "P-CS-237",
          "name": "AISI 15B35 Boron Steel",
          "designation": {
                "aisi_sae": "15B35",
                "uns": "G15351",
                "din": "1.5511",
                "en": "33MnB5"
          },
          "iso_group": "P",
          "material_class": "Steel - Boron",
          "condition": "Q&T",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.39,
                      "typical": 0.36
                },
                "manganese": {
                      "min": 1.1,
                      "max": 1.4,
                      "typical": 1.25
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0.0005,
                      "max": 0.003,
                      "typical": 0.002
                },
                "sulfur": {
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
                      "solidus": 1471,
                      "liquidus": 1521
                },
                "thermal_conductivity": 46.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_c": null,
                      "vickers": 299
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
                      "typical": 14
                },
                "fatigue_strength": 434
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 760,
                "B": 860,
                "C": 0.014,
                "n": 0.36,
                "m": 1.04
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 63,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-238": {
          "id": "P-CS-238",
          "name": "AISI 50B44 Boron Chromium",
          "designation": {
                "aisi_sae": "50B44",
                "uns": "G50441",
                "din": "",
                "en": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Boron",
          "condition": "Q&T 30 HRC",
          "composition": {
                "carbon": {
                      "min": 0.43,
                      "max": 0.49,
                      "typical": 0.46
                },
                "manganese": {
                      "min": 0.75,
                      "max": 1.0,
                      "typical": 0.9
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0.0005,
                      "max": 0.003,
                      "typical": 0.002
                },
                "sulfur": {
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
                "thermal_conductivity": 44.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_c": 30,
                      "vickers": 299
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
                      "typical": 14
                },
                "fatigue_strength": 434
          },
          "kienzle": {
                "kc1_1": 2220,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 775,
                "B": 870,
                "C": 0.014,
                "n": 0.35,
                "m": 1.05
          },
          "taylor": {
                "C": 132,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 47,
                "relative_to_1212": 0.47
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 63,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-239": {
          "id": "P-CS-239",
          "name": "Hardox 400 Wear Plate",
          "designation": {
                "aisi_sae": "Hardox400",
                "uns": "",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Wear Resistant",
          "condition": "Q&T 38-44 HRC",
          "composition": {
                "carbon": {
                      "min": 0.14,
                      "max": 0.22,
                      "typical": 0.18
                },
                "manganese": {
                      "min": 0,
                      "max": 1.6,
                      "typical": 1.2
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 1.0,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.6,
                      "typical": 0.3
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 1.0,
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0.004,
                      "typical": 0.002
                },
                "sulfur": {
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
                      "solidus": 1483,
                      "liquidus": 1533
                },
                "thermal_conductivity": 38.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 400,
                      "rockwell_c": 41,
                      "vickers": 420
                },
                "tensile_strength": {
                      "min": 1200,
                      "typical": 1250,
                      "max": 1300
                },
                "yield_strength": {
                      "min": 960,
                      "typical": 1000,
                      "max": 1040
                },
                "elongation": {
                      "typical": 10
                },
                "fatigue_strength": 562
          },
          "kienzle": {
                "kc1_1": 2700,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 1000,
                "B": 900,
                "C": 0.01,
                "n": 0.3,
                "m": 1.1
          },
          "taylor": {
                "C": 92,
                "n": 0.14
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 51,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Abrasion resistant"
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

    "P-CS-240": {
          "id": "P-CS-240",
          "name": "Hardox 450 Wear Plate",
          "designation": {
                "aisi_sae": "Hardox450",
                "uns": "",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Wear Resistant",
          "condition": "Q&T 42-48 HRC",
          "composition": {
                "carbon": {
                      "min": 0.2,
                      "max": 0.28,
                      "typical": 0.24
                },
                "manganese": {
                      "min": 0,
                      "max": 1.6,
                      "typical": 1.3
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 1.4,
                      "typical": 0.6
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.8,
                      "typical": 0.4
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 1.5,
                      "typical": 0.7
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0.005,
                      "typical": 0.003
                },
                "sulfur": {
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
                      "solidus": 1477,
                      "liquidus": 1527
                },
                "thermal_conductivity": 36.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 450,
                      "rockwell_c": 46,
                      "vickers": 472
                },
                "tensile_strength": {
                      "min": 1350,
                      "typical": 1400,
                      "max": 1450
                },
                "yield_strength": {
                      "min": 1060,
                      "typical": 1100,
                      "max": 1140
                },
                "elongation": {
                      "typical": 8
                },
                "fatigue_strength": 630
          },
          "kienzle": {
                "kc1_1": 3000,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1180,
                "B": 940,
                "C": 0.008,
                "n": 0.27,
                "m": 1.12
          },
          "taylor": {
                "C": 78,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 48,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-241": {
          "id": "P-CS-241",
          "name": "Hardox 500 Wear Plate",
          "designation": {
                "aisi_sae": "Hardox500",
                "uns": "",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Wear Resistant",
          "condition": "Q&T 47-53 HRC",
          "composition": {
                "carbon": {
                      "min": 0.25,
                      "max": 0.33,
                      "typical": 0.29
                },
                "manganese": {
                      "min": 0,
                      "max": 1.6,
                      "typical": 1.4
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 1.5,
                      "typical": 1.0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.8,
                      "typical": 0.5
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 2.0,
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0.006,
                      "typical": 0.004
                },
                "sulfur": {
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
                      "solidus": 1471,
                      "liquidus": 1521
                },
                "thermal_conductivity": 34.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 500,
                      "rockwell_c": 50,
                      "vickers": 525
                },
                "tensile_strength": {
                      "min": 1500,
                      "typical": 1550,
                      "max": 1600
                },
                "yield_strength": {
                      "min": 1210,
                      "typical": 1250,
                      "max": 1290
                },
                "elongation": {
                      "typical": 6
                },
                "fatigue_strength": 697
          },
          "kienzle": {
                "kc1_1": 3350,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1350,
                "B": 970,
                "C": 0.007,
                "n": 0.24,
                "m": 1.15
          },
          "taylor": {
                "C": 68,
                "n": 0.11
          },
          "machinability": {
                "aisi_rating": 18,
                "relative_to_1212": 0.18
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 45,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-242": {
          "id": "P-CS-242",
          "name": "AR400 Abrasion Resistant",
          "designation": {
                "aisi_sae": "AR400",
                "uns": "",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Wear Resistant",
          "condition": "Q&T 360-440 HB",
          "composition": {
                "carbon": {
                      "min": 0.2,
                      "max": 0.28,
                      "typical": 0.24
                },
                "manganese": {
                      "min": 1.2,
                      "max": 1.6,
                      "typical": 1.45
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0,
                      "max": 0.8,
                      "typical": 0.4
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.5,
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0.004,
                      "typical": 0.002
                },
                "sulfur": {
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
                "thermal_conductivity": 38.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 400,
                      "rockwell_c": 41,
                      "vickers": 420
                },
                "tensile_strength": {
                      "min": 1230,
                      "typical": 1280,
                      "max": 1330
                },
                "yield_strength": {
                      "min": 1010,
                      "typical": 1050,
                      "max": 1090
                },
                "elongation": {
                      "typical": 10
                },
                "fatigue_strength": 576
          },
          "kienzle": {
                "kc1_1": 2750,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 1020,
                "B": 905,
                "C": 0.01,
                "n": 0.3,
                "m": 1.1
          },
          "taylor": {
                "C": 92,
                "n": 0.14
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 51,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-243": {
          "id": "P-CS-243",
          "name": "AR500 Abrasion Resistant",
          "designation": {
                "aisi_sae": "AR500",
                "uns": "",
                "din": "",
                "en": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Wear Resistant",
          "condition": "Q&T 470-530 HB",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.36,
                      "typical": 0.32
                },
                "manganese": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.5
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "chromium": {
                      "min": 0.5,
                      "max": 1.2,
                      "typical": 0.8
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0.6,
                      "typical": 0.3
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0.005,
                      "typical": 0.003
                },
                "sulfur": {
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
                      "solidus": 1474,
                      "liquidus": 1524
                },
                "thermal_conductivity": 33.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 500,
                      "rockwell_c": 50,
                      "vickers": 525
                },
                "tensile_strength": {
                      "min": 1530,
                      "typical": 1580,
                      "max": 1630
                },
                "yield_strength": {
                      "min": 1260,
                      "typical": 1300,
                      "max": 1340
                },
                "elongation": {
                      "typical": 6
                },
                "fatigue_strength": 711
          },
          "kienzle": {
                "kc1_1": 3380,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1380,
                "B": 980,
                "C": 0.007,
                "n": 0.24,
                "m": 1.16
          },
          "taylor": {
                "C": 65,
                "n": 0.11
          },
          "machinability": {
                "aisi_rating": 17,
                "relative_to_1212": 0.17
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 45,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-244": {
          "id": "P-CS-244",
          "name": "Rail Steel R260",
          "designation": {
                "aisi_sae": "RailR260",
                "uns": "",
                "din": "",
                "en": "R260"
          },
          "iso_group": "P",
          "material_class": "Steel - Rail",
          "condition": "As Rolled",
          "composition": {
                "carbon": {
                      "min": 0.55,
                      "max": 0.82,
                      "typical": 0.72
                },
                "manganese": {
                      "min": 0.8,
                      "max": 1.3,
                      "typical": 1.0
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.6,
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7823,
                "melting_point": {
                      "solidus": 1442,
                      "liquidus": 1492
                },
                "thermal_conductivity": 45.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 260,
                      "rockwell_c": null,
                      "vickers": 273
                },
                "tensile_strength": {
                      "min": 830,
                      "typical": 880,
                      "max": 930
                },
                "yield_strength": {
                      "min": 430,
                      "typical": 470,
                      "max": 510
                },
                "elongation": {
                      "typical": 10
                },
                "fatigue_strength": 396
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 620,
                "B": 820,
                "C": 0.016,
                "n": 0.38,
                "m": 1.02
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 62,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Standard rail"
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

    "P-CS-245": {
          "id": "P-CS-245",
          "name": "Rail Steel R350HT",
          "designation": {
                "aisi_sae": "RailR350HT",
                "uns": "",
                "din": "",
                "en": "R350HT"
          },
          "iso_group": "H",
          "material_class": "Steel - Rail",
          "condition": "Head Hardened",
          "composition": {
                "carbon": {
                      "min": 0.7,
                      "max": 0.82,
                      "typical": 0.78
                },
                "manganese": {
                      "min": 0.7,
                      "max": 1.2,
                      "typical": 0.95
                },
                "silicon": {
                      "min": 0.15,
                      "max": 0.8,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 0,
                      "max": 0.3,
                      "typical": 0.15
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
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7818,
                "melting_point": {
                      "solidus": 1437,
                      "liquidus": 1487
                },
                "thermal_conductivity": 43.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 350,
                      "rockwell_c": 36,
                      "vickers": 367
                },
                "tensile_strength": {
                      "min": 1125,
                      "typical": 1175,
                      "max": 1225
                },
                "yield_strength": {
                      "min": 660,
                      "typical": 700,
                      "max": 740
                },
                "elongation": {
                      "typical": 8
                },
                "fatigue_strength": 528
          },
          "kienzle": {
                "kc1_1": 2600,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 860,
                "B": 900,
                "C": 0.012,
                "n": 0.32,
                "m": 1.08
          },
          "taylor": {
                "C": 100,
                "n": 0.15
          },
          "machinability": {
                "aisi_rating": 32,
                "relative_to_1212": 0.32
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 54,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Heavy haul"
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

    "P-CS-246": {
          "id": "P-CS-246",
          "name": "API 5L X52 Pipeline",
          "designation": {
                "aisi_sae": "X52",
                "uns": "K03006",
                "din": "",
                "en": "L360NB"
          },
          "iso_group": "P",
          "material_class": "Steel - Pipeline",
          "condition": "Normalized",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.26,
                      "typical": 0.12
                },
                "manganese": {
                      "min": 0,
                      "max": 1.4,
                      "typical": 1.0
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
                      "max": 0.06,
                      "typical": 0.02
                },
                "nickel": {
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
                      "max": 0.05,
                      "typical": 0.02
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1490,
                      "liquidus": 1540
                },
                "thermal_conductivity": 50.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 150,
                      "rockwell_c": null,
                      "vickers": 157
                },
                "tensile_strength": {
                      "min": 405,
                      "typical": 455,
                      "max": 505
                },
                "yield_strength": {
                      "min": 320,
                      "typical": 360,
                      "max": 400
                },
                "elongation": {
                      "typical": 20
                },
                "fatigue_strength": 204
          },
          "kienzle": {
                "kc1_1": 1580,
                "mc": 0.25
          },
          "johnson_cook": {
                "A": 400,
                "B": 640,
                "C": 0.035,
                "n": 0.5,
                "m": 0.9
          },
          "taylor": {
                "C": 170,
                "n": 0.23
          },
          "machinability": {
                "aisi_rating": 62,
                "relative_to_1212": 0.62
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 72,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-247": {
          "id": "P-CS-247",
          "name": "API 5L X65 Pipeline",
          "designation": {
                "aisi_sae": "X65",
                "uns": "K04100",
                "din": "",
                "en": "L450MB"
          },
          "iso_group": "P",
          "material_class": "Steel - Pipeline",
          "condition": "TMCP",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.26,
                      "typical": 0.14
                },
                "manganese": {
                      "min": 0,
                      "max": 1.45,
                      "typical": 1.2
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
                      "max": 0.08,
                      "typical": 0.04
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "niobium": {
                      "min": 0.01,
                      "max": 0.06,
                      "typical": 0.03
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1488,
                      "liquidus": 1538
                },
                "thermal_conductivity": 48.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 180,
                      "rockwell_c": null,
                      "vickers": 189
                },
                "tensile_strength": {
                      "min": 480,
                      "typical": 530,
                      "max": 580
                },
                "yield_strength": {
                      "min": 410,
                      "typical": 450,
                      "max": 490
                },
                "elongation": {
                      "typical": 18
                },
                "fatigue_strength": 238
          },
          "kienzle": {
                "kc1_1": 1750,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 500,
                "B": 720,
                "C": 0.028,
                "n": 0.46,
                "m": 0.94
          },
          "taylor": {
                "C": 160,
                "n": 0.22
          },
          "machinability": {
                "aisi_rating": 58,
                "relative_to_1212": 0.58
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 69,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-248": {
          "id": "P-CS-248",
          "name": "API 5L X70 Pipeline",
          "designation": {
                "aisi_sae": "X70",
                "uns": "K05100",
                "din": "",
                "en": "L485MB"
          },
          "iso_group": "P",
          "material_class": "Steel - Pipeline",
          "condition": "TMCP",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.26,
                      "typical": 0.15
                },
                "manganese": {
                      "min": 0,
                      "max": 1.65,
                      "typical": 1.3
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
                      "max": 0.1,
                      "typical": 0.05
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.01
                },
                "niobium": {
                      "min": 0.02,
                      "max": 0.08,
                      "typical": 0.04
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                      "solidus": 1488,
                      "liquidus": 1538
                },
                "thermal_conductivity": 46.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 200,
                      "rockwell_c": null,
                      "vickers": 210
                },
                "tensile_strength": {
                      "min": 520,
                      "typical": 570,
                      "max": 620
                },
                "yield_strength": {
                      "min": 445,
                      "typical": 485,
                      "max": 525
                },
                "elongation": {
                      "typical": 16
                },
                "fatigue_strength": 256
          },
          "kienzle": {
                "kc1_1": 1850,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 560,
                "B": 760,
                "C": 0.025,
                "n": 0.44,
                "m": 0.96
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 68,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-249": {
          "id": "P-CS-249",
          "name": "API 5L X80 Pipeline",
          "designation": {
                "aisi_sae": "X80",
                "uns": "K06200",
                "din": "",
                "en": "L555MB"
          },
          "iso_group": "P",
          "material_class": "Steel - Pipeline",
          "condition": "TMCP",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.26,
                      "typical": 0.16
                },
                "manganese": {
                      "min": 1.4,
                      "max": 1.85,
                      "typical": 1.6
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
                      "max": 0.3,
                      "typical": 0.15
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.12,
                      "typical": 0.06
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0.05,
                      "typical": 0.02
                },
                "niobium": {
                      "min": 0.03,
                      "max": 0.1,
                      "typical": 0.05
                },
                "copper": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "thermal_conductivity": 44.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 220,
                      "rockwell_c": null,
                      "vickers": 231
                },
                "tensile_strength": {
                      "min": 575,
                      "typical": 625,
                      "max": 675
                },
                "yield_strength": {
                      "min": 515,
                      "typical": 555,
                      "max": 595
                },
                "elongation": {
                      "typical": 14
                },
                "fatigue_strength": 281
          },
          "kienzle": {
                "kc1_1": 1950,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 620,
                "B": 800,
                "C": 0.022,
                "n": 0.42,
                "m": 0.98
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 66,
                            "unit": "m/min"
                      }
                }
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

    "P-CS-250": {
          "id": "P-CS-250",
          "name": "API 5L X100 Pipeline",
          "designation": {
                "aisi_sae": "X100",
                "uns": "K07800",
                "din": "",
                "en": "L690MB"
          },
          "iso_group": "P",
          "material_class": "Steel - Pipeline",
          "condition": "TMCP + Accel Cooling",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.16,
                      "typical": 0.1
                },
                "manganese": {
                      "min": 1.6,
                      "max": 2.0,
                      "typical": 1.85
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
                      "min": 0.15,
                      "max": 0.4,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.1,
                      "typical": 0.05
                },
                "nickel": {
                      "min": 0,
                      "max": 0.5,
                      "typical": 0.3
                },
                "titanium": {
                      "min": 0,
                      "max": 0.04,
                      "typical": 0.02
                },
                "niobium": {
                      "min": 0.04,
                      "max": 0.1,
                      "typical": 0.06
                },
                "copper": {
                      "min": 0,
                      "max": 0.4,
                      "typical": 0.2
                },
                "boron": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "sulfur": {
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
                "density": 7843,
                "melting_point": {
                      "solidus": 1490,
                      "liquidus": 1540
                },
                "thermal_conductivity": 42.0,
                "elastic_modulus": 205000
          },
          "mechanical": {
                "hardness": {
                      "brinell": 250,
                      "rockwell_c": null,
                      "vickers": 262
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
                      "typical": 12
                },
                "fatigue_strength": 342
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 720,
                "B": 860,
                "C": 0.018,
                "n": 0.38,
                "m": 1.02
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48
          },
          "recommendations": {
                "turning": {
                      "speed": {
                            "optimal": 63,
                            "unit": "m/min"
                      }
                }
          },
          "notes": "Ultra high strength pipeline"
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
if (typeof module !== "undefined") module.exports = STEELS_201_250;
