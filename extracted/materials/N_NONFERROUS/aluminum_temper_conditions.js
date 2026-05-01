/**
 * PRISM MATERIALS DATABASE - Aluminum Temper Conditions
 * File: aluminum_temper_conditions.js
 * 
 * COMPREHENSIVE COVERAGE:
 * - 1xxx (Pure Al): 1050, 1060, 1100 - O, H tempers
 * - 2xxx (Al-Cu): 2011, 2014, 2017, 2024, 2219 - O, T tempers
 * - 3xxx (Al-Mn): 3003, 3004, 3105 - O, H tempers
 * - 5xxx (Al-Mg): 5052, 5083, 5086, 5754 - O, H tempers
 * - 6xxx (Al-Mg-Si): 6005, 6061, 6063, 6082 - O, T tempers
 * - 7xxx (Al-Zn): 7050, 7075, 7175, 7475 - O, T tempers
 * 
 * CRITICAL: Same alloy at different tempers = different machining!
 * - 7075-O: Tensile 228 MPa, gummy, BUE issues
 * - 7075-T6: Tensile 572 MPa, excellent chip control
 * 
 * Generated: 2026-01-24 22:28:56
 */

const ALUMINUM_TEMPER_CONDITIONS = {
  metadata: {
    file: "aluminum_temper_conditions.js",
    category: "N_NONFERROUS",
    materialCount: 129,
    coverage: {
      series_1xxx: 19,
      series_2xxx: 25,
      series_3xxx: 20,
      series_5xxx: 20,
      series_6xxx: 20,
      series_7xxx: 25
    }
  },

  materials: {
    "N-AL-301": {
      "id": "N-AL-301",
      "name": "AA 1050-O",
      "designation": {
            "aa": "1050",
            "uns": "A91050",
            "din": "3.0255",
            "en": "EN AW-1050A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 99.5,
            "Fe": 0.4,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 231,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 76
            },
            "yield_strength": {
                  "typical": 28
            },
            "elongation": {
                  "typical": 43
            }
      },
      "kienzle": {
            "kc1_1": 665,
            "mc": 0.25
      },
      "taylor": {
            "C": 720,
            "n": 0.35
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 382,
                              "opt": 510,
                              "max": 714
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 765,
                              "opt": 1020,
                              "max": 1530
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "electrical",
            "chemical_equipment",
            "reflectors"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-302": {
      "id": "N-AL-302",
      "name": "AA 1050-H12",
      "designation": {
            "aa": "1050",
            "uns": "A91050",
            "din": "3.0255",
            "en": "EN AW-1050A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H12",
      "condition_description": "Strain hardened 1/4 hard",
      "composition": {
            "Al": 99.5,
            "Fe": 0.4,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 231,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 83
            },
            "yield_strength": {
                  "typical": 33
            },
            "elongation": {
                  "typical": 36
            }
      },
      "kienzle": {
            "kc1_1": 705,
            "mc": 0.25
      },
      "taylor": {
            "C": 797,
            "n": 0.35
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 451,
                              "opt": 602,
                              "max": 842
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 903,
                              "opt": 1204,
                              "max": 1806
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "chemical_equipment",
            "reflectors"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-303": {
      "id": "N-AL-303",
      "name": "AA 1050-H14",
      "designation": {
            "aa": "1050",
            "uns": "A91050",
            "din": "3.0255",
            "en": "EN AW-1050A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H14",
      "condition_description": "Strain hardened 1/2 hard",
      "composition": {
            "Al": 99.5,
            "Fe": 0.4,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 231,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 91
            },
            "yield_strength": {
                  "typical": 40
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 711,
            "mc": 0.25
      },
      "taylor": {
            "C": 795,
            "n": 0.35
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 453,
                              "opt": 605,
                              "max": 847
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 907,
                              "opt": 1210,
                              "max": 1815
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "chemical_equipment",
            "reflectors"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-304": {
      "id": "N-AL-304",
      "name": "AA 1050-H16",
      "designation": {
            "aa": "1050",
            "uns": "A91050",
            "din": "3.0255",
            "en": "EN AW-1050A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H16",
      "condition_description": "Strain hardened 3/4 hard",
      "composition": {
            "Al": 99.5,
            "Fe": 0.4,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 231,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 98
            },
            "yield_strength": {
                  "typical": 47
            },
            "elongation": {
                  "typical": 23
            }
      },
      "kienzle": {
            "kc1_1": 716,
            "mc": 0.25
      },
      "taylor": {
            "C": 793,
            "n": 0.35
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 456,
                              "opt": 608,
                              "max": 851
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 912,
                              "opt": 1216,
                              "max": 1824
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "chemical_equipment",
            "reflectors"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-305": {
      "id": "N-AL-305",
      "name": "AA 1050-H18",
      "designation": {
            "aa": "1050",
            "uns": "A91050",
            "din": "3.0255",
            "en": "EN AW-1050A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H18",
      "condition_description": "Strain hardened full hard",
      "composition": {
            "Al": 99.5,
            "Fe": 0.4,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 231,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 106
            },
            "yield_strength": {
                  "typical": 56
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 722,
            "mc": 0.25
      },
      "taylor": {
            "C": 790,
            "n": 0.35
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 458,
                              "opt": 611,
                              "max": 855
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 916,
                              "opt": 1222,
                              "max": 1833
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "chemical_equipment",
            "reflectors"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-306": {
      "id": "N-AL-306",
      "name": "AA 1050-H24",
      "designation": {
            "aa": "1050",
            "uns": "A91050",
            "din": "3.0255",
            "en": "EN AW-1050A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H24",
      "condition_description": "Strain hardened + partially annealed 1/2",
      "composition": {
            "Al": 99.5,
            "Fe": 0.4,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 231,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 87
            },
            "yield_strength": {
                  "typical": 37
            },
            "elongation": {
                  "typical": 32
            }
      },
      "kienzle": {
            "kc1_1": 708,
            "mc": 0.25
      },
      "taylor": {
            "C": 796,
            "n": 0.35
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 453,
                              "opt": 604,
                              "max": 845
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 906,
                              "opt": 1208,
                              "max": 1812
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "chemical_equipment",
            "reflectors"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-307": {
      "id": "N-AL-307",
      "name": "AA 1060-O",
      "designation": {
            "aa": "1060",
            "uns": "A91060",
            "din": "3.0257",
            "en": "EN AW-1060"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 99.6,
            "Fe": 0.35,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 234,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 69
            },
            "yield_strength": {
                  "typical": 28
            },
            "elongation": {
                  "typical": 45
            }
      },
      "kienzle": {
            "kc1_1": 646,
            "mc": 0.25
      },
      "taylor": {
            "C": 765,
            "n": 0.36
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 414,
                              "opt": 552,
                              "max": 772
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 828,
                              "opt": 1104,
                              "max": 1656
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-308": {
      "id": "N-AL-308",
      "name": "AA 1060-H12",
      "designation": {
            "aa": "1060",
            "uns": "A91060",
            "din": "3.0257",
            "en": "EN AW-1060"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H12",
      "condition_description": "Strain hardened 1/4 hard",
      "composition": {
            "Al": 99.6,
            "Fe": 0.35,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 234,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 75
            },
            "yield_strength": {
                  "typical": 33
            },
            "elongation": {
                  "typical": 38
            }
      },
      "kienzle": {
            "kc1_1": 684,
            "mc": 0.25
      },
      "taylor": {
            "C": 847,
            "n": 0.36
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 489,
                              "opt": 652,
                              "max": 912
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 978,
                              "opt": 1304,
                              "max": 1956
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-309": {
      "id": "N-AL-309",
      "name": "AA 1060-H14",
      "designation": {
            "aa": "1060",
            "uns": "A91060",
            "din": "3.0257",
            "en": "EN AW-1060"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H14",
      "condition_description": "Strain hardened 1/2 hard",
      "composition": {
            "Al": 99.6,
            "Fe": 0.35,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 234,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 82
            },
            "yield_strength": {
                  "typical": 40
            },
            "elongation": {
                  "typical": 31
            }
      },
      "kienzle": {
            "kc1_1": 690,
            "mc": 0.25
      },
      "taylor": {
            "C": 845,
            "n": 0.36
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 492,
                              "opt": 656,
                              "max": 918
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 984,
                              "opt": 1312,
                              "max": 1968
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-310": {
      "id": "N-AL-310",
      "name": "AA 1060-H16",
      "designation": {
            "aa": "1060",
            "uns": "A91060",
            "din": "3.0257",
            "en": "EN AW-1060"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H16",
      "condition_description": "Strain hardened 3/4 hard",
      "composition": {
            "Al": 99.6,
            "Fe": 0.35,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 234,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 89
            },
            "yield_strength": {
                  "typical": 47
            },
            "elongation": {
                  "typical": 24
            }
      },
      "kienzle": {
            "kc1_1": 695,
            "mc": 0.25
      },
      "taylor": {
            "C": 842,
            "n": 0.36
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 494,
                              "opt": 659,
                              "max": 922
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 988,
                              "opt": 1318,
                              "max": 1977
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-311": {
      "id": "N-AL-311",
      "name": "AA 1060-H18",
      "designation": {
            "aa": "1060",
            "uns": "A91060",
            "din": "3.0257",
            "en": "EN AW-1060"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H18",
      "condition_description": "Strain hardened full hard",
      "composition": {
            "Al": 99.6,
            "Fe": 0.35,
            "Si": 0.25
      },
      "physical": {
            "density": 2705,
            "thermal_conductivity": 234,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 96
            },
            "yield_strength": {
                  "typical": 56
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 701,
            "mc": 0.25
      },
      "taylor": {
            "C": 840,
            "n": 0.36
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 496,
                              "opt": 662,
                              "max": 926
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 993,
                              "opt": 1324,
                              "max": 1986
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-312": {
      "id": "N-AL-312",
      "name": "AA 1100-O",
      "designation": {
            "aa": "1100",
            "uns": "A91100",
            "din": "3.0205",
            "en": "EN AW-1100"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 99.0,
            "Cu": 0.12,
            "Fe": 0.95,
            "Si": 0.95
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 222,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 90
            },
            "yield_strength": {
                  "typical": 34
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 684,
            "mc": 0.25
      },
      "taylor": {
            "C": 675,
            "n": 0.34
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 350,
                              "opt": 467,
                              "max": 653
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 700,
                              "opt": 934,
                              "max": 1401
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "sheet_metal",
            "spun_parts",
            "cooking_utensils"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-313": {
      "id": "N-AL-313",
      "name": "AA 1100-H12",
      "designation": {
            "aa": "1100",
            "uns": "A91100",
            "din": "3.0205",
            "en": "EN AW-1100"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H12",
      "condition_description": "Strain hardened 1/4 hard",
      "composition": {
            "Al": 99.0,
            "Cu": 0.12,
            "Fe": 0.95,
            "Si": 0.95
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 222,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 99
            },
            "yield_strength": {
                  "typical": 40
            },
            "elongation": {
                  "typical": 34
            }
      },
      "kienzle": {
            "kc1_1": 725,
            "mc": 0.25
      },
      "taylor": {
            "C": 747,
            "n": 0.34
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 414,
                              "opt": 552,
                              "max": 772
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 828,
                              "opt": 1104,
                              "max": 1656
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "sheet_metal",
            "spun_parts",
            "cooking_utensils"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-314": {
      "id": "N-AL-314",
      "name": "AA 1100-H14",
      "designation": {
            "aa": "1100",
            "uns": "A91100",
            "din": "3.0205",
            "en": "EN AW-1100"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H14",
      "condition_description": "Strain hardened 1/2 hard",
      "composition": {
            "Al": 99.0,
            "Cu": 0.12,
            "Fe": 0.95,
            "Si": 0.95
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 222,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 108
            },
            "yield_strength": {
                  "typical": 49
            },
            "elongation": {
                  "typical": 28
            }
      },
      "kienzle": {
            "kc1_1": 731,
            "mc": 0.25
      },
      "taylor": {
            "C": 745,
            "n": 0.34
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 416,
                              "opt": 555,
                              "max": 777
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 832,
                              "opt": 1110,
                              "max": 1665
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "sheet_metal",
            "spun_parts",
            "cooking_utensils"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-315": {
      "id": "N-AL-315",
      "name": "AA 1100-H16",
      "designation": {
            "aa": "1100",
            "uns": "A91100",
            "din": "3.0205",
            "en": "EN AW-1100"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H16",
      "condition_description": "Strain hardened 3/4 hard",
      "composition": {
            "Al": 99.0,
            "Cu": 0.12,
            "Fe": 0.95,
            "Si": 0.95
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 222,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 117
            },
            "yield_strength": {
                  "typical": 57
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 737,
            "mc": 0.25
      },
      "taylor": {
            "C": 743,
            "n": 0.34
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 418,
                              "opt": 558,
                              "max": 781
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 837,
                              "opt": 1116,
                              "max": 1674
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "sheet_metal",
            "spun_parts",
            "cooking_utensils"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-316": {
      "id": "N-AL-316",
      "name": "AA 1100-H18",
      "designation": {
            "aa": "1100",
            "uns": "A91100",
            "din": "3.0205",
            "en": "EN AW-1100"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H18",
      "condition_description": "Strain hardened full hard",
      "composition": {
            "Al": 99.0,
            "Cu": 0.12,
            "Fe": 0.95,
            "Si": 0.95
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 222,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 125
            },
            "yield_strength": {
                  "typical": 68
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 742,
            "mc": 0.25
      },
      "taylor": {
            "C": 741,
            "n": 0.34
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 420,
                              "opt": 560,
                              "max": 784
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 840,
                              "opt": 1120,
                              "max": 1680
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "sheet_metal",
            "spun_parts",
            "cooking_utensils"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-317": {
      "id": "N-AL-317",
      "name": "AA 1100-H22",
      "designation": {
            "aa": "1100",
            "uns": "A91100",
            "din": "3.0205",
            "en": "EN AW-1100"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H22",
      "condition_description": "Strain hardened + partially annealed 1/4",
      "composition": {
            "Al": 99.0,
            "Cu": 0.12,
            "Fe": 0.95,
            "Si": 0.95
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 222,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 97
            },
            "yield_strength": {
                  "typical": 39
            },
            "elongation": {
                  "typical": 36
            }
      },
      "kienzle": {
            "kc1_1": 724,
            "mc": 0.25
      },
      "taylor": {
            "C": 748,
            "n": 0.34
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 414,
                              "opt": 552,
                              "max": 772
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 828,
                              "opt": 1104,
                              "max": 1656
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "sheet_metal",
            "spun_parts",
            "cooking_utensils"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-318": {
      "id": "N-AL-318",
      "name": "AA 1100-H24",
      "designation": {
            "aa": "1100",
            "uns": "A91100",
            "din": "3.0205",
            "en": "EN AW-1100"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H24",
      "condition_description": "Strain hardened + partially annealed 1/2",
      "composition": {
            "Al": 99.0,
            "Cu": 0.12,
            "Fe": 0.95,
            "Si": 0.95
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 222,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 103
            },
            "yield_strength": {
                  "typical": 45
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 728,
            "mc": 0.25
      },
      "taylor": {
            "C": 746,
            "n": 0.34
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 414,
                              "opt": 553,
                              "max": 774
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 829,
                              "opt": 1106,
                              "max": 1659
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "sheet_metal",
            "spun_parts",
            "cooking_utensils"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-319": {
      "id": "N-AL-319",
      "name": "AA 1100-H26",
      "designation": {
            "aa": "1100",
            "uns": "A91100",
            "din": "3.0205",
            "en": "EN AW-1100"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 1xxx Pure",
      "condition": "H26",
      "condition_description": "Strain hardened + partially annealed 3/4",
      "composition": {
            "Al": 99.0,
            "Cu": 0.12,
            "Fe": 0.95,
            "Si": 0.95
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 222,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 112
            },
            "yield_strength": {
                  "typical": 52
            },
            "elongation": {
                  "typical": 24
            }
      },
      "kienzle": {
            "kc1_1": 734,
            "mc": 0.25
      },
      "taylor": {
            "C": 744,
            "n": 0.34
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 417,
                              "opt": 556,
                              "max": 778
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 834,
                              "opt": 1112,
                              "max": 1668
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "sheet_metal",
            "spun_parts",
            "cooking_utensils"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-320": {
      "id": "N-AL-320",
      "name": "AA 2011-T3",
      "designation": {
            "aa": "2011",
            "uns": "A92011",
            "din": "3.1655",
            "en": "EN AW-2011"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T3",
      "condition_description": "Solution treated + cold worked",
      "composition": {
            "Al": 93.7,
            "Cu": 5.5,
            "Pb": 0.4,
            "Bi": 0.4
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 151,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 376
            },
            "yield_strength": {
                  "typical": 182
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 905,
            "mc": 0.23
      },
      "taylor": {
            "C": 535,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 276,
                              "opt": 368,
                              "max": 515
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 552,
                              "opt": 736,
                              "max": 1104
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "fittings",
            "fasteners"
      ],
      "notes": "Free machining alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-321": {
      "id": "N-AL-321",
      "name": "AA 2011-T6",
      "designation": {
            "aa": "2011",
            "uns": "A92011",
            "din": "3.1655",
            "en": "EN AW-2011"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 93.7,
            "Cu": 5.5,
            "Pb": 0.4,
            "Bi": 0.4
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 151,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 421
            },
            "yield_strength": {
                  "typical": 211
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 957,
            "mc": 0.23
      },
      "taylor": {
            "C": 526,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 288,
                              "opt": 385,
                              "max": 539
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 577,
                              "opt": 770,
                              "max": 1155
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "fittings",
            "fasteners"
      ],
      "notes": "Free machining alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-322": {
      "id": "N-AL-322",
      "name": "AA 2011-T8",
      "designation": {
            "aa": "2011",
            "uns": "A92011",
            "din": "3.1655",
            "en": "EN AW-2011"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T8",
      "condition_description": "Solution treated + cold worked + artificially aged",
      "composition": {
            "Al": 93.7,
            "Cu": 5.5,
            "Pb": 0.4,
            "Bi": 0.4
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 151,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 410
            },
            "yield_strength": {
                  "typical": 206
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 951,
            "mc": 0.23
      },
      "taylor": {
            "C": 528,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 287,
                              "opt": 383,
                              "max": 536
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 574,
                              "opt": 766,
                              "max": 1149
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "fittings",
            "fasteners"
      ],
      "notes": "Free machining alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-323": {
      "id": "N-AL-323",
      "name": "AA 2014-O",
      "designation": {
            "aa": "2014",
            "uns": "A92014",
            "din": "3.1255",
            "en": "EN AW-2014"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Si": 0.8,
            "Mn": 0.8,
            "Mg": 0.5
      },
      "physical": {
            "density": 2800,
            "thermal_conductivity": 154,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 186
            },
            "yield_strength": {
                  "typical": 97
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 836,
            "mc": 0.24
      },
      "taylor": {
            "C": 450,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 204,
                              "opt": 272,
                              "max": 380
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 408,
                              "opt": 544,
                              "max": 816
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "aircraft_structures",
            "truck_frames",
            "forgings"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-324": {
      "id": "N-AL-324",
      "name": "AA 2014-T4",
      "designation": {
            "aa": "2014",
            "uns": "A92014",
            "din": "3.1255",
            "en": "EN AW-2014"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T4",
      "condition_description": "Solution treated + naturally aged",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Si": 0.8,
            "Mn": 0.8,
            "Mg": 0.5
      },
      "physical": {
            "density": 2800,
            "thermal_conductivity": 154,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 288
            },
            "yield_strength": {
                  "typical": 164
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 928,
            "mc": 0.24
      },
      "taylor": {
            "C": 489,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 250,
                              "opt": 334,
                              "max": 467
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 501,
                              "opt": 668,
                              "max": 1002
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "truck_frames",
            "forgings"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-325": {
      "id": "N-AL-325",
      "name": "AA 2014-T451",
      "designation": {
            "aa": "2014",
            "uns": "A92014",
            "din": "3.1255",
            "en": "EN AW-2014"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T451",
      "condition_description": "T4 + stress relieved by stretching",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Si": 0.8,
            "Mn": 0.8,
            "Mg": 0.5
      },
      "physical": {
            "density": 2800,
            "thermal_conductivity": 154,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 293
            },
            "yield_strength": {
                  "typical": 169
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 930,
            "mc": 0.24
      },
      "taylor": {
            "C": 488,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 250,
                              "opt": 334,
                              "max": 467
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 501,
                              "opt": 668,
                              "max": 1002
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "truck_frames",
            "forgings"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-326": {
      "id": "N-AL-326",
      "name": "AA 2014-T6",
      "designation": {
            "aa": "2014",
            "uns": "A92014",
            "din": "3.1255",
            "en": "EN AW-2014"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Si": 0.8,
            "Mn": 0.8,
            "Mg": 0.5
      },
      "physical": {
            "density": 2800,
            "thermal_conductivity": 154,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 344
            },
            "yield_strength": {
                  "typical": 213
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 992,
            "mc": 0.24
      },
      "taylor": {
            "C": 478,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 264,
                              "opt": 352,
                              "max": 492
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 528,
                              "opt": 704,
                              "max": 1056
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "truck_frames",
            "forgings"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-327": {
      "id": "N-AL-327",
      "name": "AA 2014-T651",
      "designation": {
            "aa": "2014",
            "uns": "A92014",
            "din": "3.1255",
            "en": "EN AW-2014"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Si": 0.8,
            "Mn": 0.8,
            "Mg": 0.5
      },
      "physical": {
            "density": 2800,
            "thermal_conductivity": 154,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 349
            },
            "yield_strength": {
                  "typical": 218
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 995,
            "mc": 0.24
      },
      "taylor": {
            "C": 478,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 264,
                              "opt": 353,
                              "max": 494
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 529,
                              "opt": 706,
                              "max": 1059
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "truck_frames",
            "forgings"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-328": {
      "id": "N-AL-328",
      "name": "AA 2017-O",
      "designation": {
            "aa": "2017",
            "uns": "A92017",
            "din": "3.1325",
            "en": "EN AW-2017A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 93.5,
            "Cu": 4.0,
            "Mn": 0.7,
            "Mg": 0.6,
            "Si": 0.5
      },
      "physical": {
            "density": 2790,
            "thermal_conductivity": 134,
            "elastic_modulus": 72500,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 179
            },
            "yield_strength": {
                  "typical": 69
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 817,
            "mc": 0.24
      },
      "taylor": {
            "C": 468,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 216,
                              "opt": 289,
                              "max": 404
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 433,
                              "opt": 578,
                              "max": 867
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "rivets",
            "screw_machine_products",
            "fittings"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-329": {
      "id": "N-AL-329",
      "name": "AA 2017-T4",
      "designation": {
            "aa": "2017",
            "uns": "A92017",
            "din": "3.1325",
            "en": "EN AW-2017A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T4",
      "condition_description": "Solution treated + naturally aged",
      "composition": {
            "Al": 93.5,
            "Cu": 4.0,
            "Mn": 0.7,
            "Mg": 0.6,
            "Si": 0.5
      },
      "physical": {
            "density": 2790,
            "thermal_conductivity": 134,
            "elastic_modulus": 72500,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 277
            },
            "yield_strength": {
                  "typical": 117
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 907,
            "mc": 0.24
      },
      "taylor": {
            "C": 508,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 265,
                              "opt": 354,
                              "max": 495
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 531,
                              "opt": 708,
                              "max": 1062
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "rivets",
            "screw_machine_products",
            "fittings"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-330": {
      "id": "N-AL-330",
      "name": "AA 2017-T451",
      "designation": {
            "aa": "2017",
            "uns": "A92017",
            "din": "3.1325",
            "en": "EN AW-2017A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T451",
      "condition_description": "T4 + stress relieved by stretching",
      "composition": {
            "Al": 93.5,
            "Cu": 4.0,
            "Mn": 0.7,
            "Mg": 0.6,
            "Si": 0.5
      },
      "physical": {
            "density": 2790,
            "thermal_conductivity": 134,
            "elastic_modulus": 72500,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 282
            },
            "yield_strength": {
                  "typical": 120
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 909,
            "mc": 0.24
      },
      "taylor": {
            "C": 508,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 266,
                              "opt": 355,
                              "max": 496
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 532,
                              "opt": 710,
                              "max": 1065
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "rivets",
            "screw_machine_products",
            "fittings"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-331": {
      "id": "N-AL-331",
      "name": "AA 2024-O",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 186
            },
            "yield_strength": {
                  "typical": 76
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 855,
            "mc": 0.23
      },
      "taylor": {
            "C": 432,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 191,
                              "opt": 255,
                              "max": 357
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 382,
                              "opt": 510,
                              "max": 765
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-332": {
      "id": "N-AL-332",
      "name": "AA 2024-T3",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T3",
      "condition_description": "Solution treated + cold worked",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 306
            },
            "yield_strength": {
                  "typical": 144
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 958,
            "mc": 0.23
      },
      "taylor": {
            "C": 467,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 236,
                              "opt": 315,
                              "max": 441
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 472,
                              "opt": 630,
                              "max": 945
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-333": {
      "id": "N-AL-333",
      "name": "AA 2024-T351",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T351",
      "condition_description": "T3 + stress relieved by stretching",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 312
            },
            "yield_strength": {
                  "typical": 148
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 960,
            "mc": 0.23
      },
      "taylor": {
            "C": 466,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 237,
                              "opt": 316,
                              "max": 442
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 474,
                              "opt": 632,
                              "max": 948
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-334": {
      "id": "N-AL-334",
      "name": "AA 2024-T4",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T4",
      "condition_description": "Solution treated + naturally aged",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 288
            },
            "yield_strength": {
                  "typical": 129
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 949,
            "mc": 0.23
      },
      "taylor": {
            "C": 469,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 234,
                              "opt": 313,
                              "max": 438
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 469,
                              "opt": 626,
                              "max": 939
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-335": {
      "id": "N-AL-335",
      "name": "AA 2024-T6",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 344
            },
            "yield_strength": {
                  "typical": 167
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 1014,
            "mc": 0.23
      },
      "taylor": {
            "C": 459,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 247,
                              "opt": 330,
                              "max": 461
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 495,
                              "opt": 660,
                              "max": 990
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-336": {
      "id": "N-AL-336",
      "name": "AA 2024-T651",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 349
            },
            "yield_strength": {
                  "typical": 171
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 1018,
            "mc": 0.23
      },
      "taylor": {
            "C": 458,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 248,
                              "opt": 331,
                              "max": 463
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 496,
                              "opt": 662,
                              "max": 993
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-337": {
      "id": "N-AL-337",
      "name": "AA 2024-T8",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T8",
      "condition_description": "Solution treated + cold worked + artificially aged",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 334
            },
            "yield_strength": {
                  "typical": 163
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 1007,
            "mc": 0.23
      },
      "taylor": {
            "C": 460,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 246,
                              "opt": 328,
                              "max": 459
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 492,
                              "opt": 656,
                              "max": 984
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-338": {
      "id": "N-AL-338",
      "name": "AA 2024-T851",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T851",
      "condition_description": "T8 + stress relieved",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 338
            },
            "yield_strength": {
                  "typical": 165
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1010,
            "mc": 0.23
      },
      "taylor": {
            "C": 460,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 246,
                              "opt": 329,
                              "max": 460
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 493,
                              "opt": 658,
                              "max": 987
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-339": {
      "id": "N-AL-339",
      "name": "AA 2024-T87",
      "designation": {
            "aa": "2024",
            "uns": "A92024",
            "din": "3.1355",
            "en": "EN AW-2024"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T87",
      "condition_description": "Solution treated + cold worked + artificially aged (higher)",
      "composition": {
            "Al": 93.5,
            "Cu": 4.4,
            "Mg": 1.5,
            "Mn": 0.6
      },
      "physical": {
            "density": 2780,
            "thermal_conductivity": 121,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 344
            },
            "yield_strength": {
                  "typical": 168
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1014,
            "mc": 0.23
      },
      "taylor": {
            "C": 459,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 247,
                              "opt": 330,
                              "max": 461
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 495,
                              "opt": 660,
                              "max": 990
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "wing_skins",
            "fuselage"
      ],
      "notes": "Primary aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-340": {
      "id": "N-AL-340",
      "name": "AA 2219-O",
      "designation": {
            "aa": "2219",
            "uns": "A92219",
            "din": "",
            "en": "EN AW-2219"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 93.0,
            "Cu": 6.3,
            "Mn": 0.3,
            "V": 0.1,
            "Zr": 0.18
      },
      "physical": {
            "density": 2840,
            "thermal_conductivity": 120,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 172
            },
            "yield_strength": {
                  "typical": 76
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 874,
            "mc": 0.23
      },
      "taylor": {
            "C": 405,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 178,
                              "opt": 238,
                              "max": 333
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 357,
                              "opt": 476,
                              "max": 714
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "cryogenic_tanks",
            "space_structures",
            "weldments"
      ],
      "notes": "Weldable aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-341": {
      "id": "N-AL-341",
      "name": "AA 2219-T6",
      "designation": {
            "aa": "2219",
            "uns": "A92219",
            "din": "",
            "en": "EN AW-2219"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 93.0,
            "Cu": 6.3,
            "Mn": 0.3,
            "V": 0.1,
            "Zr": 0.18
      },
      "physical": {
            "density": 2840,
            "thermal_conductivity": 120,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 318
            },
            "yield_strength": {
                  "typical": 167
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1037,
            "mc": 0.23
      },
      "taylor": {
            "C": 430,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 231,
                              "opt": 308,
                              "max": 431
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 462,
                              "opt": 616,
                              "max": 924
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cryogenic_tanks",
            "space_structures",
            "weldments"
      ],
      "notes": "Weldable aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-342": {
      "id": "N-AL-342",
      "name": "AA 2219-T651",
      "designation": {
            "aa": "2219",
            "uns": "A92219",
            "din": "",
            "en": "EN AW-2219"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 93.0,
            "Cu": 6.3,
            "Mn": 0.3,
            "V": 0.1,
            "Zr": 0.18
      },
      "physical": {
            "density": 2840,
            "thermal_conductivity": 120,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 323
            },
            "yield_strength": {
                  "typical": 171
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1041,
            "mc": 0.23
      },
      "taylor": {
            "C": 430,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 231,
                              "opt": 309,
                              "max": 432
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 463,
                              "opt": 618,
                              "max": 927
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cryogenic_tanks",
            "space_structures",
            "weldments"
      ],
      "notes": "Weldable aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-343": {
      "id": "N-AL-343",
      "name": "AA 2219-T87",
      "designation": {
            "aa": "2219",
            "uns": "A92219",
            "din": "",
            "en": "EN AW-2219"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T87",
      "condition_description": "Solution treated + cold worked + artificially aged (higher)",
      "composition": {
            "Al": 93.0,
            "Cu": 6.3,
            "Mn": 0.3,
            "V": 0.1,
            "Zr": 0.18
      },
      "physical": {
            "density": 2840,
            "thermal_conductivity": 120,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 318
            },
            "yield_strength": {
                  "typical": 168
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 1037,
            "mc": 0.23
      },
      "taylor": {
            "C": 430,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 231,
                              "opt": 308,
                              "max": 431
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 462,
                              "opt": 616,
                              "max": 924
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cryogenic_tanks",
            "space_structures",
            "weldments"
      ],
      "notes": "Weldable aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-344": {
      "id": "N-AL-344",
      "name": "AA 2219-T851",
      "designation": {
            "aa": "2219",
            "uns": "A92219",
            "din": "",
            "en": "EN AW-2219"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 2xxx Al-Cu",
      "condition": "T851",
      "condition_description": "T8 + stress relieved",
      "composition": {
            "Al": 93.0,
            "Cu": 6.3,
            "Mn": 0.3,
            "V": 0.1,
            "Zr": 0.18
      },
      "physical": {
            "density": 2840,
            "thermal_conductivity": 120,
            "elastic_modulus": 73000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 313
            },
            "yield_strength": {
                  "typical": 165
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 1033,
            "mc": 0.23
      },
      "taylor": {
            "C": 431,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 230,
                              "opt": 307,
                              "max": 429
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 460,
                              "opt": 614,
                              "max": 921
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cryogenic_tanks",
            "space_structures",
            "weldments"
      ],
      "notes": "Weldable aerospace alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-345": {
      "id": "N-AL-345",
      "name": "AA 3003-O",
      "designation": {
            "aa": "3003",
            "uns": "A93003",
            "din": "3.0517",
            "en": "EN AW-3003"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 98.6,
            "Mn": 1.2,
            "Cu": 0.12
      },
      "physical": {
            "density": 2730,
            "thermal_conductivity": 193,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 110
            },
            "yield_strength": {
                  "typical": 42
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 712,
            "mc": 0.25
      },
      "taylor": {
            "C": 630,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 318,
                              "opt": 425,
                              "max": 595
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 637,
                              "opt": 850,
                              "max": 1275
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "cooking_utensils",
            "pressure_vessels",
            "fuel_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-346": {
      "id": "N-AL-346",
      "name": "AA 3003-H12",
      "designation": {
            "aa": "3003",
            "uns": "A93003",
            "din": "3.0517",
            "en": "EN AW-3003"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H12",
      "condition_description": "Strain hardened 1/4 hard",
      "composition": {
            "Al": 98.6,
            "Mn": 1.2,
            "Cu": 0.12
      },
      "physical": {
            "density": 2730,
            "thermal_conductivity": 193,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 121
            },
            "yield_strength": {
                  "typical": 50
            },
            "elongation": {
                  "typical": 29
            }
      },
      "kienzle": {
            "kc1_1": 756,
            "mc": 0.25
      },
      "taylor": {
            "C": 697,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 376,
                              "opt": 502,
                              "max": 702
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 753,
                              "opt": 1004,
                              "max": 1506
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cooking_utensils",
            "pressure_vessels",
            "fuel_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-347": {
      "id": "N-AL-347",
      "name": "AA 3003-H14",
      "designation": {
            "aa": "3003",
            "uns": "A93003",
            "din": "3.0517",
            "en": "EN AW-3003"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H14",
      "condition_description": "Strain hardened 1/2 hard",
      "composition": {
            "Al": 98.6,
            "Mn": 1.2,
            "Cu": 0.12
      },
      "physical": {
            "density": 2730,
            "thermal_conductivity": 193,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 132
            },
            "yield_strength": {
                  "typical": 60
            },
            "elongation": {
                  "typical": 24
            }
      },
      "kienzle": {
            "kc1_1": 762,
            "mc": 0.25
      },
      "taylor": {
            "C": 695,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 378,
                              "opt": 505,
                              "max": 707
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 757,
                              "opt": 1010,
                              "max": 1515
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cooking_utensils",
            "pressure_vessels",
            "fuel_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-348": {
      "id": "N-AL-348",
      "name": "AA 3003-H16",
      "designation": {
            "aa": "3003",
            "uns": "A93003",
            "din": "3.0517",
            "en": "EN AW-3003"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H16",
      "condition_description": "Strain hardened 3/4 hard",
      "composition": {
            "Al": 98.6,
            "Mn": 1.2,
            "Cu": 0.12
      },
      "physical": {
            "density": 2730,
            "thermal_conductivity": 193,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 143
            },
            "yield_strength": {
                  "typical": 71
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 768,
            "mc": 0.25
      },
      "taylor": {
            "C": 693,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 380,
                              "opt": 507,
                              "max": 709
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 760,
                              "opt": 1014,
                              "max": 1521
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cooking_utensils",
            "pressure_vessels",
            "fuel_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-349": {
      "id": "N-AL-349",
      "name": "AA 3003-H18",
      "designation": {
            "aa": "3003",
            "uns": "A93003",
            "din": "3.0517",
            "en": "EN AW-3003"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H18",
      "condition_description": "Strain hardened full hard",
      "composition": {
            "Al": 98.6,
            "Mn": 1.2,
            "Cu": 0.12
      },
      "physical": {
            "density": 2730,
            "thermal_conductivity": 193,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 154
            },
            "yield_strength": {
                  "typical": 84
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 774,
            "mc": 0.25
      },
      "taylor": {
            "C": 691,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 382,
                              "opt": 510,
                              "max": 714
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 765,
                              "opt": 1020,
                              "max": 1530
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cooking_utensils",
            "pressure_vessels",
            "fuel_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-350": {
      "id": "N-AL-350",
      "name": "AA 3003-H22",
      "designation": {
            "aa": "3003",
            "uns": "A93003",
            "din": "3.0517",
            "en": "EN AW-3003"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H22",
      "condition_description": "Strain hardened + partially annealed 1/4",
      "composition": {
            "Al": 98.6,
            "Mn": 1.2,
            "Cu": 0.12
      },
      "physical": {
            "density": 2730,
            "thermal_conductivity": 193,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 118
            },
            "yield_strength": {
                  "typical": 48
            },
            "elongation": {
                  "typical": 31
            }
      },
      "kienzle": {
            "kc1_1": 754,
            "mc": 0.25
      },
      "taylor": {
            "C": 698,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 375,
                              "opt": 501,
                              "max": 701
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 751,
                              "opt": 1002,
                              "max": 1503
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cooking_utensils",
            "pressure_vessels",
            "fuel_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-351": {
      "id": "N-AL-351",
      "name": "AA 3003-H24",
      "designation": {
            "aa": "3003",
            "uns": "A93003",
            "din": "3.0517",
            "en": "EN AW-3003"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H24",
      "condition_description": "Strain hardened + partially annealed 1/2",
      "composition": {
            "Al": 98.6,
            "Mn": 1.2,
            "Cu": 0.12
      },
      "physical": {
            "density": 2730,
            "thermal_conductivity": 193,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 126
            },
            "yield_strength": {
                  "typical": 56
            },
            "elongation": {
                  "typical": 26
            }
      },
      "kienzle": {
            "kc1_1": 758,
            "mc": 0.25
      },
      "taylor": {
            "C": 696,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 377,
                              "opt": 503,
                              "max": 704
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 754,
                              "opt": 1006,
                              "max": 1509
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cooking_utensils",
            "pressure_vessels",
            "fuel_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-352": {
      "id": "N-AL-352",
      "name": "AA 3003-H26",
      "designation": {
            "aa": "3003",
            "uns": "A93003",
            "din": "3.0517",
            "en": "EN AW-3003"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H26",
      "condition_description": "Strain hardened + partially annealed 3/4",
      "composition": {
            "Al": 98.6,
            "Mn": 1.2,
            "Cu": 0.12
      },
      "physical": {
            "density": 2730,
            "thermal_conductivity": 193,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 137
            },
            "yield_strength": {
                  "typical": 65
            },
            "elongation": {
                  "typical": 21
            }
      },
      "kienzle": {
            "kc1_1": 764,
            "mc": 0.25
      },
      "taylor": {
            "C": 694,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 379,
                              "opt": 506,
                              "max": 708
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 759,
                              "opt": 1012,
                              "max": 1518
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cooking_utensils",
            "pressure_vessels",
            "fuel_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-353": {
      "id": "N-AL-353",
      "name": "AA 3004-O",
      "designation": {
            "aa": "3004",
            "uns": "A93004",
            "din": "3.0526",
            "en": "EN AW-3004"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 97.8,
            "Mn": 1.2,
            "Mg": 1.0
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 163,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 180
            },
            "yield_strength": {
                  "typical": 69
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 760,
            "mc": 0.24
      },
      "taylor": {
            "C": 585,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 286,
                              "opt": 382,
                              "max": 534
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 573,
                              "opt": 764,
                              "max": 1146
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "beverage_cans",
            "roofing",
            "storage_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-354": {
      "id": "N-AL-354",
      "name": "AA 3004-H32",
      "designation": {
            "aa": "3004",
            "uns": "A93004",
            "din": "3.0526",
            "en": "EN AW-3004"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H32",
      "condition_description": "Strain hardened + stabilized 1/4",
      "composition": {
            "Al": 97.8,
            "Mn": 1.2,
            "Mg": 1.0
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 163,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 189
            },
            "yield_strength": {
                  "typical": 75
            },
            "elongation": {
                  "typical": 23
            }
      },
      "kienzle": {
            "kc1_1": 803,
            "mc": 0.24
      },
      "taylor": {
            "C": 649,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 338,
                              "opt": 451,
                              "max": 631
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 676,
                              "opt": 902,
                              "max": 1353
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "beverage_cans",
            "roofing",
            "storage_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-355": {
      "id": "N-AL-355",
      "name": "AA 3004-H34",
      "designation": {
            "aa": "3004",
            "uns": "A93004",
            "din": "3.0526",
            "en": "EN AW-3004"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H34",
      "condition_description": "Strain hardened + stabilized 1/2",
      "composition": {
            "Al": 97.8,
            "Mn": 1.2,
            "Mg": 1.0
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 163,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 201
            },
            "yield_strength": {
                  "typical": 89
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 807,
            "mc": 0.24
      },
      "taylor": {
            "C": 647,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 339,
                              "opt": 452,
                              "max": 632
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 678,
                              "opt": 904,
                              "max": 1356
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "beverage_cans",
            "roofing",
            "storage_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-356": {
      "id": "N-AL-356",
      "name": "AA 3004-H36",
      "designation": {
            "aa": "3004",
            "uns": "A93004",
            "din": "3.0526",
            "en": "EN AW-3004"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H36",
      "condition_description": "Strain hardened + stabilized 3/4",
      "composition": {
            "Al": 97.8,
            "Mn": 1.2,
            "Mg": 1.0
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 163,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 219
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 813,
            "mc": 0.24
      },
      "taylor": {
            "C": 645,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 340,
                              "opt": 454,
                              "max": 635
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 681,
                              "opt": 908,
                              "max": 1362
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "beverage_cans",
            "roofing",
            "storage_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-357": {
      "id": "N-AL-357",
      "name": "AA 3004-H38",
      "designation": {
            "aa": "3004",
            "uns": "A93004",
            "din": "3.0526",
            "en": "EN AW-3004"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H38",
      "condition_description": "Strain hardened + stabilized full",
      "composition": {
            "Al": 97.8,
            "Mn": 1.2,
            "Mg": 1.0
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 163,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 243
            },
            "yield_strength": {
                  "typical": 127
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 822,
            "mc": 0.24
      },
      "taylor": {
            "C": 643,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 342,
                              "opt": 457,
                              "max": 639
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 685,
                              "opt": 914,
                              "max": 1371
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "beverage_cans",
            "roofing",
            "storage_tanks"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-358": {
      "id": "N-AL-358",
      "name": "AA 3105-O",
      "designation": {
            "aa": "3105",
            "uns": "A93105",
            "din": "3.0505",
            "en": "EN AW-3105"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 98.4,
            "Mn": 0.55,
            "Mg": 0.5,
            "Cu": 0.3
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 173,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 115
            },
            "yield_strength": {
                  "typical": 55
            },
            "elongation": {
                  "typical": 28
            }
      },
      "kienzle": {
            "kc1_1": 722,
            "mc": 0.25
      },
      "taylor": {
            "C": 612,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 306,
                              "opt": 408,
                              "max": 571
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 612,
                              "opt": 816,
                              "max": 1224
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "residential_siding",
            "mobile_homes",
            "gutters"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-359": {
      "id": "N-AL-359",
      "name": "AA 3105-H12",
      "designation": {
            "aa": "3105",
            "uns": "A93105",
            "din": "3.0505",
            "en": "EN AW-3105"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H12",
      "condition_description": "Strain hardened 1/4 hard",
      "composition": {
            "Al": 98.4,
            "Mn": 0.55,
            "Mg": 0.5,
            "Cu": 0.3
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 173,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 126
            },
            "yield_strength": {
                  "typical": 66
            },
            "elongation": {
                  "typical": 23
            }
      },
      "kienzle": {
            "kc1_1": 765,
            "mc": 0.25
      },
      "taylor": {
            "C": 678,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 361,
                              "opt": 482,
                              "max": 674
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 723,
                              "opt": 964,
                              "max": 1446
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "residential_siding",
            "mobile_homes",
            "gutters"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-360": {
      "id": "N-AL-360",
      "name": "AA 3105-H14",
      "designation": {
            "aa": "3105",
            "uns": "A93105",
            "din": "3.0505",
            "en": "EN AW-3105"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H14",
      "condition_description": "Strain hardened 1/2 hard",
      "composition": {
            "Al": 98.4,
            "Mn": 0.55,
            "Mg": 0.5,
            "Cu": 0.3
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 173,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 138
            },
            "yield_strength": {
                  "typical": 79
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 772,
            "mc": 0.25
      },
      "taylor": {
            "C": 675,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 363,
                              "opt": 484,
                              "max": 677
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 726,
                              "opt": 968,
                              "max": 1452
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "residential_siding",
            "mobile_homes",
            "gutters"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-361": {
      "id": "N-AL-361",
      "name": "AA 3105-H16",
      "designation": {
            "aa": "3105",
            "uns": "A93105",
            "din": "3.0505",
            "en": "EN AW-3105"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H16",
      "condition_description": "Strain hardened 3/4 hard",
      "composition": {
            "Al": 98.4,
            "Mn": 0.55,
            "Mg": 0.5,
            "Cu": 0.3
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 173,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 149
            },
            "yield_strength": {
                  "typical": 93
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 777,
            "mc": 0.25
      },
      "taylor": {
            "C": 673,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 365,
                              "opt": 487,
                              "max": 681
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 730,
                              "opt": 974,
                              "max": 1461
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "residential_siding",
            "mobile_homes",
            "gutters"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-362": {
      "id": "N-AL-362",
      "name": "AA 3105-H18",
      "designation": {
            "aa": "3105",
            "uns": "A93105",
            "din": "3.0505",
            "en": "EN AW-3105"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H18",
      "condition_description": "Strain hardened full hard",
      "composition": {
            "Al": 98.4,
            "Mn": 0.55,
            "Mg": 0.5,
            "Cu": 0.3
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 173,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 161
            },
            "yield_strength": {
                  "typical": 110
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 784,
            "mc": 0.25
      },
      "taylor": {
            "C": 671,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 366,
                              "opt": 489,
                              "max": 684
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 733,
                              "opt": 978,
                              "max": 1467
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "residential_siding",
            "mobile_homes",
            "gutters"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-363": {
      "id": "N-AL-363",
      "name": "AA 3105-H24",
      "designation": {
            "aa": "3105",
            "uns": "A93105",
            "din": "3.0505",
            "en": "EN AW-3105"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H24",
      "condition_description": "Strain hardened + partially annealed 1/2",
      "composition": {
            "Al": 98.4,
            "Mn": 0.55,
            "Mg": 0.5,
            "Cu": 0.3
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 173,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 132
            },
            "yield_strength": {
                  "typical": 74
            },
            "elongation": {
                  "typical": 21
            }
      },
      "kienzle": {
            "kc1_1": 768,
            "mc": 0.25
      },
      "taylor": {
            "C": 676,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 362,
                              "opt": 483,
                              "max": 676
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 724,
                              "opt": 966,
                              "max": 1449
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "residential_siding",
            "mobile_homes",
            "gutters"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-364": {
      "id": "N-AL-364",
      "name": "AA 3105-H26",
      "designation": {
            "aa": "3105",
            "uns": "A93105",
            "din": "3.0505",
            "en": "EN AW-3105"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 3xxx Al-Mn",
      "condition": "H26",
      "condition_description": "Strain hardened + partially annealed 3/4",
      "composition": {
            "Al": 98.4,
            "Mn": 0.55,
            "Mg": 0.5,
            "Cu": 0.3
      },
      "physical": {
            "density": 2720,
            "thermal_conductivity": 173,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 143
            },
            "yield_strength": {
                  "typical": 85
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 774,
            "mc": 0.25
      },
      "taylor": {
            "C": 675,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 363,
                              "opt": 485,
                              "max": 679
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 727,
                              "opt": 970,
                              "max": 1455
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "residential_siding",
            "mobile_homes",
            "gutters"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-365": {
      "id": "N-AL-365",
      "name": "AA 5052-O",
      "designation": {
            "aa": "5052",
            "uns": "A95052",
            "din": "3.3523",
            "en": "EN AW-5052"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 97.2,
            "Mg": 2.5,
            "Cr": 0.25
      },
      "physical": {
            "density": 2680,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 193
            },
            "yield_strength": {
                  "typical": 89
            },
            "elongation": {
                  "typical": 27
            }
      },
      "kienzle": {
            "kc1_1": 779,
            "mc": 0.24
      },
      "taylor": {
            "C": 540,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 255,
                              "opt": 340,
                              "max": 475
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 510,
                              "opt": 680,
                              "max": 1020
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "marine",
            "aircraft_fuel_tanks",
            "appliances"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-366": {
      "id": "N-AL-366",
      "name": "AA 5052-H32",
      "designation": {
            "aa": "5052",
            "uns": "A95052",
            "din": "3.3523",
            "en": "EN AW-5052"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H32",
      "condition_description": "Strain hardened + stabilized 1/4",
      "composition": {
            "Al": 97.2,
            "Mg": 2.5,
            "Cr": 0.25
      },
      "physical": {
            "density": 2680,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 202
            },
            "yield_strength": {
                  "typical": 97
            },
            "elongation": {
                  "typical": 24
            }
      },
      "kienzle": {
            "kc1_1": 823,
            "mc": 0.24
      },
      "taylor": {
            "C": 599,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 300,
                              "opt": 400,
                              "max": 560
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 600,
                              "opt": 800,
                              "max": 1200
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "aircraft_fuel_tanks",
            "appliances"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-367": {
      "id": "N-AL-367",
      "name": "AA 5052-H34",
      "designation": {
            "aa": "5052",
            "uns": "A95052",
            "din": "3.3523",
            "en": "EN AW-5052"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H34",
      "condition_description": "Strain hardened + stabilized 1/2",
      "composition": {
            "Al": 97.2,
            "Mg": 2.5,
            "Cr": 0.25
      },
      "physical": {
            "density": 2680,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 216
            },
            "yield_strength": {
                  "typical": 115
            },
            "elongation": {
                  "typical": 21
            }
      },
      "kienzle": {
            "kc1_1": 827,
            "mc": 0.24
      },
      "taylor": {
            "C": 597,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 301,
                              "opt": 402,
                              "max": 562
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 603,
                              "opt": 804,
                              "max": 1206
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "aircraft_fuel_tanks",
            "appliances"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-368": {
      "id": "N-AL-368",
      "name": "AA 5052-H36",
      "designation": {
            "aa": "5052",
            "uns": "A95052",
            "din": "3.3523",
            "en": "EN AW-5052"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H36",
      "condition_description": "Strain hardened + stabilized 3/4",
      "composition": {
            "Al": 97.2,
            "Mg": 2.5,
            "Cr": 0.25
      },
      "physical": {
            "density": 2680,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 235
            },
            "yield_strength": {
                  "typical": 133
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 834,
            "mc": 0.24
      },
      "taylor": {
            "C": 596,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 303,
                              "opt": 404,
                              "max": 565
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 606,
                              "opt": 808,
                              "max": 1212
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "aircraft_fuel_tanks",
            "appliances"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-369": {
      "id": "N-AL-369",
      "name": "AA 5052-H38",
      "designation": {
            "aa": "5052",
            "uns": "A95052",
            "din": "3.3523",
            "en": "EN AW-5052"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H38",
      "condition_description": "Strain hardened + stabilized full",
      "composition": {
            "Al": 97.2,
            "Mg": 2.5,
            "Cr": 0.25
      },
      "physical": {
            "density": 2680,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 260
            },
            "yield_strength": {
                  "typical": 164
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 842,
            "mc": 0.24
      },
      "taylor": {
            "C": 593,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 304,
                              "opt": 406,
                              "max": 568
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 609,
                              "opt": 812,
                              "max": 1218
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "aircraft_fuel_tanks",
            "appliances"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-370": {
      "id": "N-AL-370",
      "name": "AA 5083-O",
      "designation": {
            "aa": "5083",
            "uns": "A95083",
            "din": "3.3547",
            "en": "EN AW-5083"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 94.8,
            "Mg": 4.4,
            "Mn": 0.7,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 117,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 290
            },
            "yield_strength": {
                  "typical": 145
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 836,
            "mc": 0.23
      },
      "taylor": {
            "C": 495,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 222,
                              "opt": 297,
                              "max": 415
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 445,
                              "opt": 594,
                              "max": 891
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "shipbuilding",
            "cryogenic",
            "pressure_vessels"
      ],
      "notes": "Marine grade"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-371": {
      "id": "N-AL-371",
      "name": "AA 5083-H32",
      "designation": {
            "aa": "5083",
            "uns": "A95083",
            "din": "3.3547",
            "en": "EN AW-5083"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H32",
      "condition_description": "Strain hardened + stabilized 1/4",
      "composition": {
            "Al": 94.8,
            "Mg": 4.4,
            "Mn": 0.7,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 117,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 304
            },
            "yield_strength": {
                  "typical": 159
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 883,
            "mc": 0.23
      },
      "taylor": {
            "C": 549,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 262,
                              "opt": 350,
                              "max": 489
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 525,
                              "opt": 700,
                              "max": 1050
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "shipbuilding",
            "cryogenic",
            "pressure_vessels"
      ],
      "notes": "Marine grade"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-372": {
      "id": "N-AL-372",
      "name": "AA 5083-H34",
      "designation": {
            "aa": "5083",
            "uns": "A95083",
            "din": "3.3547",
            "en": "EN AW-5083"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H34",
      "condition_description": "Strain hardened + stabilized 1/2",
      "composition": {
            "Al": 94.8,
            "Mg": 4.4,
            "Mn": 0.7,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 117,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 324
            },
            "yield_strength": {
                  "typical": 188
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 888,
            "mc": 0.23
      },
      "taylor": {
            "C": 548,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 264,
                              "opt": 352,
                              "max": 492
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 528,
                              "opt": 704,
                              "max": 1056
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "shipbuilding",
            "cryogenic",
            "pressure_vessels"
      ],
      "notes": "Marine grade"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-373": {
      "id": "N-AL-373",
      "name": "AA 5083-H116",
      "designation": {
            "aa": "5083",
            "uns": "A95083",
            "din": "3.3547",
            "en": "EN AW-5083"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H116",
      "condition_description": "Special marine temper",
      "composition": {
            "Al": 94.8,
            "Mg": 4.4,
            "Mn": 0.7,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 117,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 333
            },
            "yield_strength": {
                  "typical": 195
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 890,
            "mc": 0.23
      },
      "taylor": {
            "C": 547,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 264,
                              "opt": 352,
                              "max": 492
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 528,
                              "opt": 704,
                              "max": 1056
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "shipbuilding",
            "cryogenic",
            "pressure_vessels"
      ],
      "notes": "Marine grade"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-374": {
      "id": "N-AL-374",
      "name": "AA 5083-H321",
      "designation": {
            "aa": "5083",
            "uns": "A95083",
            "din": "3.3547",
            "en": "EN AW-5083"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H321",
      "condition_description": "Special marine temper",
      "composition": {
            "Al": 94.8,
            "Mg": 4.4,
            "Mn": 0.7,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 117,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 333
            },
            "yield_strength": {
                  "typical": 195
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 890,
            "mc": 0.23
      },
      "taylor": {
            "C": 547,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 264,
                              "opt": 352,
                              "max": 492
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 528,
                              "opt": 704,
                              "max": 1056
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "shipbuilding",
            "cryogenic",
            "pressure_vessels"
      ],
      "notes": "Marine grade"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-375": {
      "id": "N-AL-375",
      "name": "AA 5086-O",
      "designation": {
            "aa": "5086",
            "uns": "A95086",
            "din": "3.3545",
            "en": "EN AW-5086"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 95.4,
            "Mg": 4.0,
            "Mn": 0.45,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 125,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 262
            },
            "yield_strength": {
                  "typical": 117
            },
            "elongation": {
                  "typical": 24
            }
      },
      "kienzle": {
            "kc1_1": 817,
            "mc": 0.24
      },
      "taylor": {
            "C": 513,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 235,
                              "opt": 314,
                              "max": 439
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 471,
                              "opt": 628,
                              "max": 942
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "marine",
            "tanks",
            "unfired_pressure_vessels"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-376": {
      "id": "N-AL-376",
      "name": "AA 5086-H32",
      "designation": {
            "aa": "5086",
            "uns": "A95086",
            "din": "3.3545",
            "en": "EN AW-5086"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H32",
      "condition_description": "Strain hardened + stabilized 1/4",
      "composition": {
            "Al": 95.4,
            "Mg": 4.0,
            "Mn": 0.45,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 125,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 275
            },
            "yield_strength": {
                  "typical": 128
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 863,
            "mc": 0.24
      },
      "taylor": {
            "C": 569,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 277,
                              "opt": 370,
                              "max": 518
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 555,
                              "opt": 740,
                              "max": 1110
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "tanks",
            "unfired_pressure_vessels"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-377": {
      "id": "N-AL-377",
      "name": "AA 5086-H34",
      "designation": {
            "aa": "5086",
            "uns": "A95086",
            "din": "3.3545",
            "en": "EN AW-5086"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H34",
      "condition_description": "Strain hardened + stabilized 1/2",
      "composition": {
            "Al": 95.4,
            "Mg": 4.0,
            "Mn": 0.45,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 125,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 293
            },
            "yield_strength": {
                  "typical": 152
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 868,
            "mc": 0.24
      },
      "taylor": {
            "C": 567,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 279,
                              "opt": 372,
                              "max": 520
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 558,
                              "opt": 744,
                              "max": 1116
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "tanks",
            "unfired_pressure_vessels"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-378": {
      "id": "N-AL-378",
      "name": "AA 5086-H116",
      "designation": {
            "aa": "5086",
            "uns": "A95086",
            "din": "3.3545",
            "en": "EN AW-5086"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H116",
      "condition_description": "Special marine temper",
      "composition": {
            "Al": 95.4,
            "Mg": 4.0,
            "Mn": 0.45,
            "Cr": 0.15
      },
      "physical": {
            "density": 2660,
            "thermal_conductivity": 125,
            "elastic_modulus": 71000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 301
            },
            "yield_strength": {
                  "typical": 157
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 870,
            "mc": 0.24
      },
      "taylor": {
            "C": 567,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 279,
                              "opt": 372,
                              "max": 520
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 558,
                              "opt": 744,
                              "max": 1116
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "tanks",
            "unfired_pressure_vessels"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-379": {
      "id": "N-AL-379",
      "name": "AA 5754-O",
      "designation": {
            "aa": "5754",
            "uns": "A95754",
            "din": "3.3535",
            "en": "EN AW-5754"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 96.2,
            "Mg": 3.1,
            "Mn": 0.5,
            "Cr": 0.3
      },
      "physical": {
            "density": 2670,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 220
            },
            "yield_strength": {
                  "typical": 100
            },
            "elongation": {
                  "typical": 26
            }
      },
      "kienzle": {
            "kc1_1": 798,
            "mc": 0.24
      },
      "taylor": {
            "C": 522,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 242,
                              "opt": 323,
                              "max": 452
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 484,
                              "opt": 646,
                              "max": 969
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "automotive_body",
            "welded_structures",
            "flooring"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-380": {
      "id": "N-AL-380",
      "name": "AA 5754-H22",
      "designation": {
            "aa": "5754",
            "uns": "A95754",
            "din": "3.3535",
            "en": "EN AW-5754"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H22",
      "condition_description": "Strain hardened + partially annealed 1/4",
      "composition": {
            "Al": 96.2,
            "Mg": 3.1,
            "Mn": 0.5,
            "Cr": 0.3
      },
      "physical": {
            "density": 2670,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 237
            },
            "yield_strength": {
                  "typical": 114
            },
            "elongation": {
                  "typical": 23
            }
      },
      "kienzle": {
            "kc1_1": 845,
            "mc": 0.24
      },
      "taylor": {
            "C": 578,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 285,
                              "opt": 381,
                              "max": 533
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 571,
                              "opt": 762,
                              "max": 1143
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "automotive_body",
            "welded_structures",
            "flooring"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-381": {
      "id": "N-AL-381",
      "name": "AA 5754-H24",
      "designation": {
            "aa": "5754",
            "uns": "A95754",
            "din": "3.3535",
            "en": "EN AW-5754"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H24",
      "condition_description": "Strain hardened + partially annealed 1/2",
      "composition": {
            "Al": 96.2,
            "Mg": 3.1,
            "Mn": 0.5,
            "Cr": 0.3
      },
      "physical": {
            "density": 2670,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 252
            },
            "yield_strength": {
                  "typical": 135
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 849,
            "mc": 0.24
      },
      "taylor": {
            "C": 577,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 286,
                              "opt": 382,
                              "max": 534
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 573,
                              "opt": 764,
                              "max": 1146
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "automotive_body",
            "welded_structures",
            "flooring"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-382": {
      "id": "N-AL-382",
      "name": "AA 5754-H26",
      "designation": {
            "aa": "5754",
            "uns": "A95754",
            "din": "3.3535",
            "en": "EN AW-5754"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H26",
      "condition_description": "Strain hardened + partially annealed 3/4",
      "composition": {
            "Al": 96.2,
            "Mg": 3.1,
            "Mn": 0.5,
            "Cr": 0.3
      },
      "physical": {
            "density": 2670,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 275
            },
            "yield_strength": {
                  "typical": 155
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 856,
            "mc": 0.24
      },
      "taylor": {
            "C": 575,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 288,
                              "opt": 384,
                              "max": 537
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 576,
                              "opt": 768,
                              "max": 1152
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "automotive_body",
            "welded_structures",
            "flooring"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-383": {
      "id": "N-AL-383",
      "name": "AA 5754-H32",
      "designation": {
            "aa": "5754",
            "uns": "A95754",
            "din": "3.3535",
            "en": "EN AW-5754"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H32",
      "condition_description": "Strain hardened + stabilized 1/4",
      "composition": {
            "Al": 96.2,
            "Mg": 3.1,
            "Mn": 0.5,
            "Cr": 0.3
      },
      "physical": {
            "density": 2670,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 231
            },
            "yield_strength": {
                  "typical": 110
            },
            "elongation": {
                  "typical": 23
            }
      },
      "kienzle": {
            "kc1_1": 843,
            "mc": 0.24
      },
      "taylor": {
            "C": 579,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 285,
                              "opt": 380,
                              "max": 532
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 570,
                              "opt": 760,
                              "max": 1140
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "automotive_body",
            "welded_structures",
            "flooring"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-384": {
      "id": "N-AL-384",
      "name": "AA 5754-H34",
      "designation": {
            "aa": "5754",
            "uns": "A95754",
            "din": "3.3535",
            "en": "EN AW-5754"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 5xxx Al-Mg",
      "condition": "H34",
      "condition_description": "Strain hardened + stabilized 1/2",
      "composition": {
            "Al": 96.2,
            "Mg": 3.1,
            "Mn": 0.5,
            "Cr": 0.3
      },
      "physical": {
            "density": 2670,
            "thermal_conductivity": 138,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 246
            },
            "yield_strength": {
                  "typical": 130
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 847,
            "mc": 0.24
      },
      "taylor": {
            "C": 577,
            "n": 0.28
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 286,
                              "opt": 382,
                              "max": 534
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 573,
                              "opt": 764,
                              "max": 1146
                        }
                  }
            }
      },
      "machinability": "Good - improved chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "automotive_body",
            "welded_structures",
            "flooring"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-385": {
      "id": "N-AL-385",
      "name": "AA 6005-O",
      "designation": {
            "aa": "6005",
            "uns": "A96005",
            "din": "",
            "en": "EN AW-6005A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 98.2,
            "Mg": 0.5,
            "Si": 0.7,
            "Mn": 0.15
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 180,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 130
            },
            "yield_strength": {
                  "typical": 55
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 741,
            "mc": 0.24
      },
      "taylor": {
            "C": 558,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 267,
                              "opt": 357,
                              "max": 499
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 535,
                              "opt": 714,
                              "max": 1071
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "extrusions",
            "ladders",
            "scaffold"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-386": {
      "id": "N-AL-386",
      "name": "AA 6005-T1",
      "designation": {
            "aa": "6005",
            "uns": "A96005",
            "din": "",
            "en": "EN AW-6005A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T1",
      "condition_description": "Cooled from hot working + naturally aged",
      "composition": {
            "Al": 98.2,
            "Mg": 0.5,
            "Si": 0.7,
            "Mn": 0.15
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 180,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 156
            },
            "yield_strength": {
                  "typical": 71
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 795,
            "mc": 0.24
      },
      "taylor": {
            "C": 615,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 319,
                              "opt": 426,
                              "max": 596
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 639,
                              "opt": 852,
                              "max": 1278
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "extrusions",
            "ladders",
            "scaffold"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-387": {
      "id": "N-AL-387",
      "name": "AA 6005-T5",
      "designation": {
            "aa": "6005",
            "uns": "A96005",
            "din": "",
            "en": "EN AW-6005A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T5",
      "condition_description": "Cooled from hot working + artificially aged",
      "composition": {
            "Al": 98.2,
            "Mg": 0.5,
            "Si": 0.7,
            "Mn": 0.15
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 180,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 188
            },
            "yield_strength": {
                  "typical": 85
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 814,
            "mc": 0.24
      },
      "taylor": {
            "C": 608,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 325,
                              "opt": 434,
                              "max": 607
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 651,
                              "opt": 868,
                              "max": 1302
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "extrusions",
            "ladders",
            "scaffold"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-388": {
      "id": "N-AL-388",
      "name": "AA 6005-T6",
      "designation": {
            "aa": "6005",
            "uns": "A96005",
            "din": "",
            "en": "EN AW-6005A"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 98.2,
            "Mg": 0.5,
            "Si": 0.7,
            "Mn": 0.15
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 180,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 240
            },
            "yield_strength": {
                  "typical": 121
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 879,
            "mc": 0.24
      },
      "taylor": {
            "C": 593,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 346,
                              "opt": 462,
                              "max": 646
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 693,
                              "opt": 924,
                              "max": 1386
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "extrusions",
            "ladders",
            "scaffold"
      ]
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-389": {
      "id": "N-AL-389",
      "name": "AA 6061-O",
      "designation": {
            "aa": "6061",
            "uns": "A96061",
            "din": "3.3211",
            "en": "EN AW-6061"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 97.9,
            "Mg": 1.0,
            "Si": 0.6,
            "Cu": 0.28,
            "Cr": 0.2
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 167,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 124
            },
            "yield_strength": {
                  "typical": 55
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 760,
            "mc": 0.24
      },
      "taylor": {
            "C": 540,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 255,
                              "opt": 340,
                              "max": 475
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 510,
                              "opt": 680,
                              "max": 1020
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "structural",
            "marine",
            "automotive",
            "general_machining"
      ],
      "notes": "Most versatile aluminum alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-390": {
      "id": "N-AL-390",
      "name": "AA 6061-T4",
      "designation": {
            "aa": "6061",
            "uns": "A96061",
            "din": "3.3211",
            "en": "EN AW-6061"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T4",
      "condition_description": "Solution treated + naturally aged",
      "composition": {
            "Al": 97.9,
            "Mg": 1.0,
            "Si": 0.6,
            "Cu": 0.28,
            "Cr": 0.2
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 167,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 192
            },
            "yield_strength": {
                  "typical": 93
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 843,
            "mc": 0.24
      },
      "taylor": {
            "C": 586,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 312,
                              "opt": 417,
                              "max": 583
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 625,
                              "opt": 834,
                              "max": 1251
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "marine",
            "automotive",
            "general_machining"
      ],
      "notes": "Most versatile aluminum alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-391": {
      "id": "N-AL-391",
      "name": "AA 6061-T451",
      "designation": {
            "aa": "6061",
            "uns": "A96061",
            "din": "3.3211",
            "en": "EN AW-6061"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T451",
      "condition_description": "T4 + stress relieved by stretching",
      "composition": {
            "Al": 97.9,
            "Mg": 1.0,
            "Si": 0.6,
            "Cu": 0.28,
            "Cr": 0.2
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 167,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 195
            },
            "yield_strength": {
                  "typical": 96
            },
            "elongation": {
                  "typical": 21
            }
      },
      "kienzle": {
            "kc1_1": 845,
            "mc": 0.24
      },
      "taylor": {
            "C": 586,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 313,
                              "opt": 418,
                              "max": 585
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 627,
                              "opt": 836,
                              "max": 1254
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "marine",
            "automotive",
            "general_machining"
      ],
      "notes": "Most versatile aluminum alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-392": {
      "id": "N-AL-392",
      "name": "AA 6061-T6",
      "designation": {
            "aa": "6061",
            "uns": "A96061",
            "din": "3.3211",
            "en": "EN AW-6061"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 97.9,
            "Mg": 1.0,
            "Si": 0.6,
            "Cu": 0.28,
            "Cr": 0.2
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 167,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 229
            },
            "yield_strength": {
                  "typical": 121
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 901,
            "mc": 0.24
      },
      "taylor": {
            "C": 574,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 330,
                              "opt": 440,
                              "max": 616
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 660,
                              "opt": 880,
                              "max": 1320
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "marine",
            "automotive",
            "general_machining"
      ],
      "notes": "Most versatile aluminum alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-393": {
      "id": "N-AL-393",
      "name": "AA 6061-T651",
      "designation": {
            "aa": "6061",
            "uns": "A96061",
            "din": "3.3211",
            "en": "EN AW-6061"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 97.9,
            "Mg": 1.0,
            "Si": 0.6,
            "Cu": 0.28,
            "Cr": 0.2
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 167,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 233
            },
            "yield_strength": {
                  "typical": 123
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 905,
            "mc": 0.24
      },
      "taylor": {
            "C": 573,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 331,
                              "opt": 442,
                              "max": 618
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 663,
                              "opt": 884,
                              "max": 1326
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "marine",
            "automotive",
            "general_machining"
      ],
      "notes": "Most versatile aluminum alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-394": {
      "id": "N-AL-394",
      "name": "AA 6061-T6511",
      "designation": {
            "aa": "6061",
            "uns": "A96061",
            "din": "3.3211",
            "en": "EN AW-6061"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T6511",
      "condition_description": "T651 + minor straightening",
      "composition": {
            "Al": 97.9,
            "Mg": 1.0,
            "Si": 0.6,
            "Cu": 0.28,
            "Cr": 0.2
      },
      "physical": {
            "density": 2700,
            "thermal_conductivity": 167,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 235
            },
            "yield_strength": {
                  "typical": 125
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 907,
            "mc": 0.24
      },
      "taylor": {
            "C": 573,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 331,
                              "opt": 442,
                              "max": 618
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 663,
                              "opt": 884,
                              "max": 1326
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "marine",
            "automotive",
            "general_machining"
      ],
      "notes": "Most versatile aluminum alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-395": {
      "id": "N-AL-395",
      "name": "AA 6063-O",
      "designation": {
            "aa": "6063",
            "uns": "A96063",
            "din": "3.3206",
            "en": "EN AW-6063"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 98.9,
            "Mg": 0.7,
            "Si": 0.4
      },
      "physical": {
            "density": 2690,
            "thermal_conductivity": 201,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 90
            },
            "yield_strength": {
                  "typical": 48
            },
            "elongation": {
                  "typical": 33
            }
      },
      "kienzle": {
            "kc1_1": 712,
            "mc": 0.25
      },
      "taylor": {
            "C": 585,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 286,
                              "opt": 382,
                              "max": 534
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 573,
                              "opt": 764,
                              "max": 1146
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "architectural",
            "extrusions",
            "window_frames"
      ],
      "notes": "Architectural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-396": {
      "id": "N-AL-396",
      "name": "AA 6063-T1",
      "designation": {
            "aa": "6063",
            "uns": "A96063",
            "din": "3.3206",
            "en": "EN AW-6063"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T1",
      "condition_description": "Cooled from hot working + naturally aged",
      "composition": {
            "Al": 98.9,
            "Mg": 0.7,
            "Si": 0.4
      },
      "physical": {
            "density": 2690,
            "thermal_conductivity": 201,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 108
            },
            "yield_strength": {
                  "typical": 62
            },
            "elongation": {
                  "typical": 29
            }
      },
      "kienzle": {
            "kc1_1": 765,
            "mc": 0.25
      },
      "taylor": {
            "C": 644,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 342,
                              "opt": 457,
                              "max": 639
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 685,
                              "opt": 914,
                              "max": 1371
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "extrusions",
            "window_frames"
      ],
      "notes": "Architectural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-397": {
      "id": "N-AL-397",
      "name": "AA 6063-T4",
      "designation": {
            "aa": "6063",
            "uns": "A96063",
            "din": "3.3206",
            "en": "EN AW-6063"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T4",
      "condition_description": "Solution treated + naturally aged",
      "composition": {
            "Al": 98.9,
            "Mg": 0.7,
            "Si": 0.4
      },
      "physical": {
            "density": 2690,
            "thermal_conductivity": 201,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 139
            },
            "yield_strength": {
                  "typical": 81
            },
            "elongation": {
                  "typical": 24
            }
      },
      "kienzle": {
            "kc1_1": 790,
            "mc": 0.25
      },
      "taylor": {
            "C": 635,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 351,
                              "opt": 469,
                              "max": 656
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 703,
                              "opt": 938,
                              "max": 1407
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "extrusions",
            "window_frames"
      ],
      "notes": "Architectural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-398": {
      "id": "N-AL-398",
      "name": "AA 6063-T5",
      "designation": {
            "aa": "6063",
            "uns": "A96063",
            "din": "3.3206",
            "en": "EN AW-6063"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T5",
      "condition_description": "Cooled from hot working + artificially aged",
      "composition": {
            "Al": 98.9,
            "Mg": 0.7,
            "Si": 0.4
      },
      "physical": {
            "density": 2690,
            "thermal_conductivity": 201,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 130
            },
            "yield_strength": {
                  "typical": 74
            },
            "elongation": {
                  "typical": 26
            }
      },
      "kienzle": {
            "kc1_1": 783,
            "mc": 0.25
      },
      "taylor": {
            "C": 638,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 349,
                              "opt": 466,
                              "max": 652
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 699,
                              "opt": 932,
                              "max": 1398
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "extrusions",
            "window_frames"
      ],
      "notes": "Architectural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-399": {
      "id": "N-AL-399",
      "name": "AA 6063-T6",
      "designation": {
            "aa": "6063",
            "uns": "A96063",
            "din": "3.3206",
            "en": "EN AW-6063"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 98.9,
            "Mg": 0.7,
            "Si": 0.4
      },
      "physical": {
            "density": 2690,
            "thermal_conductivity": 201,
            "elastic_modulus": 69000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 166
            },
            "yield_strength": {
                  "typical": 105
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 845,
            "mc": 0.25
      },
      "taylor": {
            "C": 622,
            "n": 0.31
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 371,
                              "opt": 495,
                              "max": 693
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 742,
                              "opt": 990,
                              "max": 1485
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "extrusions",
            "window_frames"
      ],
      "notes": "Architectural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-400": {
      "id": "N-AL-400",
      "name": "AA 6082-O",
      "designation": {
            "aa": "6082",
            "uns": "A96082",
            "din": "3.2315",
            "en": "EN AW-6082"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 97.5,
            "Mg": 0.9,
            "Si": 1.0,
            "Mn": 0.5
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 172,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 130
            },
            "yield_strength": {
                  "typical": 60
            },
            "elongation": {
                  "typical": 27
            }
      },
      "kienzle": {
            "kc1_1": 769,
            "mc": 0.24
      },
      "taylor": {
            "C": 531,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 248,
                              "opt": 331,
                              "max": 463
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 496,
                              "opt": 662,
                              "max": 993
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "structural",
            "bridges",
            "cranes",
            "trusses"
      ],
      "notes": "European structural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-401": {
      "id": "N-AL-401",
      "name": "AA 6082-T4",
      "designation": {
            "aa": "6082",
            "uns": "A96082",
            "din": "3.2315",
            "en": "EN AW-6082"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T4",
      "condition_description": "Solution treated + naturally aged",
      "composition": {
            "Al": 97.5,
            "Mg": 0.9,
            "Si": 1.0,
            "Mn": 0.5
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 172,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 201
            },
            "yield_strength": {
                  "typical": 102
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 854,
            "mc": 0.24
      },
      "taylor": {
            "C": 577,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 305,
                              "opt": 407,
                              "max": 569
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 610,
                              "opt": 814,
                              "max": 1221
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "bridges",
            "cranes",
            "trusses"
      ],
      "notes": "European structural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-402": {
      "id": "N-AL-402",
      "name": "AA 6082-T451",
      "designation": {
            "aa": "6082",
            "uns": "A96082",
            "din": "3.2315",
            "en": "EN AW-6082"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T451",
      "condition_description": "T4 + stress relieved by stretching",
      "composition": {
            "Al": 97.5,
            "Mg": 0.9,
            "Si": 1.0,
            "Mn": 0.5
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 172,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 205
            },
            "yield_strength": {
                  "typical": 105
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 856,
            "mc": 0.24
      },
      "taylor": {
            "C": 576,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 306,
                              "opt": 408,
                              "max": 571
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 612,
                              "opt": 816,
                              "max": 1224
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "bridges",
            "cranes",
            "trusses"
      ],
      "notes": "European structural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-403": {
      "id": "N-AL-403",
      "name": "AA 6082-T6",
      "designation": {
            "aa": "6082",
            "uns": "A96082",
            "din": "3.2315",
            "en": "EN AW-6082"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 97.5,
            "Mg": 0.9,
            "Si": 1.0,
            "Mn": 0.5
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 172,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 240
            },
            "yield_strength": {
                  "typical": 132
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 912,
            "mc": 0.24
      },
      "taylor": {
            "C": 565,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 321,
                              "opt": 429,
                              "max": 600
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 643,
                              "opt": 858,
                              "max": 1287
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "bridges",
            "cranes",
            "trusses"
      ],
      "notes": "European structural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-404": {
      "id": "N-AL-404",
      "name": "AA 6082-T651",
      "designation": {
            "aa": "6082",
            "uns": "A96082",
            "din": "3.2315",
            "en": "EN AW-6082"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 6xxx Al-Mg-Si",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 97.5,
            "Mg": 0.9,
            "Si": 1.0,
            "Mn": 0.5
      },
      "physical": {
            "density": 2710,
            "thermal_conductivity": 172,
            "elastic_modulus": 70000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 244
            },
            "yield_strength": {
                  "typical": 135
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 916,
            "mc": 0.24
      },
      "taylor": {
            "C": 564,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 323,
                              "opt": 431,
                              "max": 603
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 646,
                              "opt": 862,
                              "max": 1293
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "structural",
            "bridges",
            "cranes",
            "trusses"
      ],
      "notes": "European structural alloy"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-405": {
      "id": "N-AL-405",
      "name": "AA 7050-O",
      "designation": {
            "aa": "7050",
            "uns": "A97050",
            "din": "",
            "en": "EN AW-7050"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 89.0,
            "Zn": 6.2,
            "Mg": 2.3,
            "Cu": 2.3,
            "Zr": 0.12
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 157,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 228
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 902,
            "mc": 0.22
      },
      "taylor": {
            "C": 405,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 178,
                              "opt": 238,
                              "max": 333
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 357,
                              "opt": 476,
                              "max": 714
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "aerospace_plate",
            "wing_structure",
            "fuselage_bulkheads"
      ],
      "notes": "Superior toughness to 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-406": {
      "id": "N-AL-406",
      "name": "AA 7050-T6",
      "designation": {
            "aa": "7050",
            "uns": "A97050",
            "din": "",
            "en": "EN AW-7050"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 89.0,
            "Zn": 6.2,
            "Mg": 2.3,
            "Cu": 2.3,
            "Zr": 0.12
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 157,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 421
            },
            "yield_strength": {
                  "typical": 226
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1070,
            "mc": 0.22
      },
      "taylor": {
            "C": 430,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 231,
                              "opt": 308,
                              "max": 431
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 462,
                              "opt": 616,
                              "max": 924
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aerospace_plate",
            "wing_structure",
            "fuselage_bulkheads"
      ],
      "notes": "Superior toughness to 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-407": {
      "id": "N-AL-407",
      "name": "AA 7050-T651",
      "designation": {
            "aa": "7050",
            "uns": "A97050",
            "din": "",
            "en": "EN AW-7050"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 89.0,
            "Zn": 6.2,
            "Mg": 2.3,
            "Cu": 2.3,
            "Zr": 0.12
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 157,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 428
            },
            "yield_strength": {
                  "typical": 231
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 1075,
            "mc": 0.22
      },
      "taylor": {
            "C": 430,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 231,
                              "opt": 309,
                              "max": 432
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 463,
                              "opt": 618,
                              "max": 927
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aerospace_plate",
            "wing_structure",
            "fuselage_bulkheads"
      ],
      "notes": "Superior toughness to 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-408": {
      "id": "N-AL-408",
      "name": "AA 7050-T7351",
      "designation": {
            "aa": "7050",
            "uns": "A97050",
            "din": "",
            "en": "EN AW-7050"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7351",
      "condition_description": "T73 + stress relieved",
      "composition": {
            "Al": 89.0,
            "Zn": 6.2,
            "Mg": 2.3,
            "Cu": 2.3,
            "Zr": 0.12
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 157,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 369
            },
            "yield_strength": {
                  "typical": 187
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 1020,
            "mc": 0.22
      },
      "taylor": {
            "C": 438,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 222,
                              "opt": 297,
                              "max": 415
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 445,
                              "opt": 594,
                              "max": 891
                        }
                  }
            }
      },
      "machinability": "Very good - stress corrosion resistant",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aerospace_plate",
            "wing_structure",
            "fuselage_bulkheads"
      ],
      "notes": "Superior toughness to 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-409": {
      "id": "N-AL-409",
      "name": "AA 7050-T7451",
      "designation": {
            "aa": "7050",
            "uns": "A97050",
            "din": "",
            "en": "EN AW-7050"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7451",
      "condition_description": "T7451",
      "composition": {
            "Al": 89.0,
            "Zn": 6.2,
            "Mg": 2.3,
            "Cu": 2.3,
            "Zr": 0.12
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 157,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 228
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 950,
            "mc": 0.22
      },
      "taylor": {
            "C": 450,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 210,
                              "opt": 280,
                              "max": 392
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 420,
                              "opt": 560,
                              "max": 840
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aerospace_plate",
            "wing_structure",
            "fuselage_bulkheads"
      ],
      "notes": "Superior toughness to 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-410": {
      "id": "N-AL-410",
      "name": "AA 7050-T7651",
      "designation": {
            "aa": "7050",
            "uns": "A97050",
            "din": "",
            "en": "EN AW-7050"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7651",
      "condition_description": "T76 + stress relieved",
      "composition": {
            "Al": 89.0,
            "Zn": 6.2,
            "Mg": 2.3,
            "Cu": 2.3,
            "Zr": 0.12
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 157,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 405
            },
            "yield_strength": {
                  "typical": 214
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1060,
            "mc": 0.22
      },
      "taylor": {
            "C": 432,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 229,
                              "opt": 306,
                              "max": 428
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 459,
                              "opt": 612,
                              "max": 918
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aerospace_plate",
            "wing_structure",
            "fuselage_bulkheads"
      ],
      "notes": "Superior toughness to 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-411": {
      "id": "N-AL-411",
      "name": "AA 7050-T76511",
      "designation": {
            "aa": "7050",
            "uns": "A97050",
            "din": "",
            "en": "EN AW-7050"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T76511",
      "condition_description": "T76511",
      "composition": {
            "Al": 89.0,
            "Zn": 6.2,
            "Mg": 2.3,
            "Cu": 2.3,
            "Zr": 0.12
      },
      "physical": {
            "density": 2830,
            "thermal_conductivity": 157,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 228
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 950,
            "mc": 0.22
      },
      "taylor": {
            "C": 450,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 210,
                              "opt": 280,
                              "max": 392
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 420,
                              "opt": 560,
                              "max": 840
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aerospace_plate",
            "wing_structure",
            "fuselage_bulkheads"
      ],
      "notes": "Superior toughness to 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-412": {
      "id": "N-AL-412",
      "name": "AA 7075-O",
      "designation": {
            "aa": "7075",
            "uns": "A97075",
            "din": "3.4365",
            "en": "EN AW-7075"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 228
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 931,
            "mc": 0.22
      },
      "taylor": {
            "C": 378,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 165,
                              "opt": 221,
                              "max": 309
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 331,
                              "opt": 442,
                              "max": 663
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "aircraft_structures",
            "high_stress_parts",
            "gears"
      ],
      "notes": "Highest strength aluminum"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-413": {
      "id": "N-AL-413",
      "name": "AA 7075-T6",
      "designation": {
            "aa": "7075",
            "uns": "A97075",
            "din": "3.4365",
            "en": "EN AW-7075"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 421
            },
            "yield_strength": {
                  "typical": 226
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1104,
            "mc": 0.22
      },
      "taylor": {
            "C": 402,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 214,
                              "opt": 286,
                              "max": 400
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 429,
                              "opt": 572,
                              "max": 858
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "high_stress_parts",
            "gears"
      ],
      "notes": "Highest strength aluminum"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-414": {
      "id": "N-AL-414",
      "name": "AA 7075-T651",
      "designation": {
            "aa": "7075",
            "uns": "A97075",
            "din": "3.4365",
            "en": "EN AW-7075"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 428
            },
            "yield_strength": {
                  "typical": 231
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 1108,
            "mc": 0.22
      },
      "taylor": {
            "C": 401,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 215,
                              "opt": 287,
                              "max": 401
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 430,
                              "opt": 574,
                              "max": 861
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "high_stress_parts",
            "gears"
      ],
      "notes": "Highest strength aluminum"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-415": {
      "id": "N-AL-415",
      "name": "AA 7075-T6511",
      "designation": {
            "aa": "7075",
            "uns": "A97075",
            "din": "3.4365",
            "en": "EN AW-7075"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T6511",
      "condition_description": "T651 + minor straightening",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 433
            },
            "yield_strength": {
                  "typical": 234
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 1112,
            "mc": 0.22
      },
      "taylor": {
            "C": 401,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 216,
                              "opt": 288,
                              "max": 403
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 432,
                              "opt": 576,
                              "max": 864
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "high_stress_parts",
            "gears"
      ],
      "notes": "Highest strength aluminum"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-416": {
      "id": "N-AL-416",
      "name": "AA 7075-T73",
      "designation": {
            "aa": "7075",
            "uns": "A97075",
            "din": "3.4365",
            "en": "EN AW-7075"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T73",
      "condition_description": "Solution treated + overaged for SCC resistance",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 364
            },
            "yield_strength": {
                  "typical": 185
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 1050,
            "mc": 0.22
      },
      "taylor": {
            "C": 409,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 206,
                              "opt": 275,
                              "max": 385
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 412,
                              "opt": 550,
                              "max": 825
                        }
                  }
            }
      },
      "machinability": "Very good - stress corrosion resistant",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "high_stress_parts",
            "gears"
      ],
      "notes": "Highest strength aluminum"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-417": {
      "id": "N-AL-417",
      "name": "AA 7075-T7351",
      "designation": {
            "aa": "7075",
            "uns": "A97075",
            "din": "3.4365",
            "en": "EN AW-7075"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7351",
      "condition_description": "T73 + stress relieved",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 369
            },
            "yield_strength": {
                  "typical": 187
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 1052,
            "mc": 0.22
      },
      "taylor": {
            "C": 409,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 207,
                              "opt": 276,
                              "max": 386
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 414,
                              "opt": 552,
                              "max": 828
                        }
                  }
            }
      },
      "machinability": "Very good - stress corrosion resistant",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "high_stress_parts",
            "gears"
      ],
      "notes": "Highest strength aluminum"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-418": {
      "id": "N-AL-418",
      "name": "AA 7075-T76",
      "designation": {
            "aa": "7075",
            "uns": "A97075",
            "din": "3.4365",
            "en": "EN AW-7075"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T76",
      "condition_description": "Solution treated + overaged for exfoliation resistance",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 399
            },
            "yield_strength": {
                  "typical": 211
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 1090,
            "mc": 0.22
      },
      "taylor": {
            "C": 404,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 212,
                              "opt": 283,
                              "max": 396
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 424,
                              "opt": 566,
                              "max": 849
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "high_stress_parts",
            "gears"
      ],
      "notes": "Highest strength aluminum"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-419": {
      "id": "N-AL-419",
      "name": "AA 7075-T7651",
      "designation": {
            "aa": "7075",
            "uns": "A97075",
            "din": "3.4365",
            "en": "EN AW-7075"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7651",
      "condition_description": "T76 + stress relieved",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 405
            },
            "yield_strength": {
                  "typical": 214
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1094,
            "mc": 0.22
      },
      "taylor": {
            "C": 403,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 213,
                              "opt": 284,
                              "max": 397
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 426,
                              "opt": 568,
                              "max": 852
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_structures",
            "high_stress_parts",
            "gears"
      ],
      "notes": "Highest strength aluminum"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-420": {
      "id": "N-AL-420",
      "name": "AA 7175-O",
      "designation": {
            "aa": "7175",
            "uns": "A97175",
            "din": "",
            "en": "EN AW-7175"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 228
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 921,
            "mc": 0.22
      },
      "taylor": {
            "C": 387,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 168,
                              "opt": 225,
                              "max": 315
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 337,
                              "opt": 450,
                              "max": 675
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "forgings",
            "aerospace_fittings"
      ],
      "notes": "Forging version of 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-421": {
      "id": "N-AL-421",
      "name": "AA 7175-T6",
      "designation": {
            "aa": "7175",
            "uns": "A97175",
            "din": "",
            "en": "EN AW-7175"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 421
            },
            "yield_strength": {
                  "typical": 226
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1093,
            "mc": 0.22
      },
      "taylor": {
            "C": 411,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 218,
                              "opt": 291,
                              "max": 407
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 436,
                              "opt": 582,
                              "max": 873
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "forgings",
            "aerospace_fittings"
      ],
      "notes": "Forging version of 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-422": {
      "id": "N-AL-422",
      "name": "AA 7175-T651",
      "designation": {
            "aa": "7175",
            "uns": "A97175",
            "din": "",
            "en": "EN AW-7175"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 428
            },
            "yield_strength": {
                  "typical": 231
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 1097,
            "mc": 0.22
      },
      "taylor": {
            "C": 411,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 219,
                              "opt": 292,
                              "max": 408
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 438,
                              "opt": 584,
                              "max": 876
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "forgings",
            "aerospace_fittings"
      ],
      "notes": "Forging version of 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-423": {
      "id": "N-AL-423",
      "name": "AA 7175-T7351",
      "designation": {
            "aa": "7175",
            "uns": "A97175",
            "din": "",
            "en": "EN AW-7175"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7351",
      "condition_description": "T73 + stress relieved",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 369
            },
            "yield_strength": {
                  "typical": 187
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 1041,
            "mc": 0.22
      },
      "taylor": {
            "C": 419,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 210,
                              "opt": 281,
                              "max": 393
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 421,
                              "opt": 562,
                              "max": 843
                        }
                  }
            }
      },
      "machinability": "Very good - stress corrosion resistant",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "forgings",
            "aerospace_fittings"
      ],
      "notes": "Forging version of 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-424": {
      "id": "N-AL-424",
      "name": "AA 7175-T7651",
      "designation": {
            "aa": "7175",
            "uns": "A97175",
            "din": "",
            "en": "EN AW-7175"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7651",
      "condition_description": "T76 + stress relieved",
      "composition": {
            "Al": 90.0,
            "Zn": 5.6,
            "Mg": 2.5,
            "Cu": 1.6,
            "Cr": 0.23
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 130,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 405
            },
            "yield_strength": {
                  "typical": 214
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1082,
            "mc": 0.22
      },
      "taylor": {
            "C": 413,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 216,
                              "opt": 289,
                              "max": 404
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 433,
                              "opt": 578,
                              "max": 867
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "forgings",
            "aerospace_fittings"
      ],
      "notes": "Forging version of 7075"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-425": {
      "id": "N-AL-425",
      "name": "AA 7475-O",
      "designation": {
            "aa": "7475",
            "uns": "A97475",
            "din": "",
            "en": "EN AW-7475"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "O",
      "condition_description": "Annealed (softest condition)",
      "composition": {
            "Al": 90.3,
            "Zn": 5.7,
            "Mg": 2.3,
            "Cu": 1.5,
            "Cr": 0.22
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 138,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 220
            },
            "yield_strength": {
                  "typical": 97
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 893,
            "mc": 0.22
      },
      "taylor": {
            "C": 414,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 181,
                              "opt": 242,
                              "max": 338
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 363,
                              "opt": 484,
                              "max": 726
                        }
                  }
            }
      },
      "machinability": "Poor - gummy chips, built-up edge",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "CRITICAL: Use sharp tools, high speed to prevent BUE. Consider PCD."
      },
      "applications": [
            "aircraft_wing_skins",
            "fuselage_skins"
      ],
      "notes": "Improved fracture toughness"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-426": {
      "id": "N-AL-426",
      "name": "AA 7475-T6",
      "designation": {
            "aa": "7475",
            "uns": "A97475",
            "din": "",
            "en": "EN AW-7475"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T6",
      "condition_description": "Solution treated + artificially aged",
      "composition": {
            "Al": 90.3,
            "Zn": 5.7,
            "Mg": 2.3,
            "Cu": 1.5,
            "Cr": 0.22
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 138,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 407
            },
            "yield_strength": {
                  "typical": 213
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1059,
            "mc": 0.22
      },
      "taylor": {
            "C": 440,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 235,
                              "opt": 314,
                              "max": 439
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 471,
                              "opt": 628,
                              "max": 942
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_wing_skins",
            "fuselage_skins"
      ],
      "notes": "Improved fracture toughness"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-427": {
      "id": "N-AL-427",
      "name": "AA 7475-T651",
      "designation": {
            "aa": "7475",
            "uns": "A97475",
            "din": "",
            "en": "EN AW-7475"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T651",
      "condition_description": "T6 + stress relieved by stretching",
      "composition": {
            "Al": 90.3,
            "Zn": 5.7,
            "Mg": 2.3,
            "Cu": 1.5,
            "Cr": 0.22
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 138,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 413
            },
            "yield_strength": {
                  "typical": 218
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 1063,
            "mc": 0.22
      },
      "taylor": {
            "C": 439,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 236,
                              "opt": 315,
                              "max": 441
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 472,
                              "opt": 630,
                              "max": 945
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_wing_skins",
            "fuselage_skins"
      ],
      "notes": "Improved fracture toughness"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-428": {
      "id": "N-AL-428",
      "name": "AA 7475-T7351",
      "designation": {
            "aa": "7475",
            "uns": "A97475",
            "din": "",
            "en": "EN AW-7475"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7351",
      "condition_description": "T73 + stress relieved",
      "composition": {
            "Al": 90.3,
            "Zn": 5.7,
            "Mg": 2.3,
            "Cu": 1.5,
            "Cr": 0.22
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 138,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 356
            },
            "yield_strength": {
                  "typical": 176
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 1009,
            "mc": 0.22
      },
      "taylor": {
            "C": 448,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 226,
                              "opt": 302,
                              "max": 422
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 453,
                              "opt": 604,
                              "max": 906
                        }
                  }
            }
      },
      "machinability": "Very good - stress corrosion resistant",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_wing_skins",
            "fuselage_skins"
      ],
      "notes": "Improved fracture toughness"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    },
    "N-AL-429": {
      "id": "N-AL-429",
      "name": "AA 7475-T7651",
      "designation": {
            "aa": "7475",
            "uns": "A97475",
            "din": "",
            "en": "EN AW-7475"
      },
      "iso_group": "N",
      "material_class": "Aluminum - 7xxx Al-Zn",
      "condition": "T7651",
      "condition_description": "T76 + stress relieved",
      "composition": {
            "Al": 90.3,
            "Zn": 5.7,
            "Mg": 2.3,
            "Cu": 1.5,
            "Cr": 0.22
      },
      "physical": {
            "density": 2810,
            "thermal_conductivity": 138,
            "elastic_modulus": 72000,
            "poissons_ratio": 0.33
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 391
            },
            "yield_strength": {
                  "typical": 201
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 1049,
            "mc": 0.22
      },
      "taylor": {
            "C": 442,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 233,
                              "opt": 311,
                              "max": 435
                        }
                  },
                  "pcd": {
                        "speed": {
                              "min": 466,
                              "opt": 622,
                              "max": 933
                        }
                  }
            }
      },
      "machinability": "Excellent - ideal chip formation",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10 Uncoated or PCD",
            "coating": [
                  "None",
                  "DLC (optional)"
            ],
            "geometry": "Sharp positive rake 12-20\u00b0, polished rake face",
            "coolant": "Flood coolant or MQL",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "aircraft_wing_skins",
            "fuselage_skins"
      ],
      "notes": "Improved fracture toughness"
,
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 30, unit: "degrees", range: { min: 25, max: 36 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "MODERATE", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.40, withCoolant: 0.26, withMQL: 0.31 },
        toolWorkpieceInterface: { dry: 0.33, withCoolant: 0.22 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 800, unit: "C" },
        adhesionTendency: { rating: "HIGH" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 180, b: 0.22, c: 0.08 }, maxRecommended: { value: 450, unit: "C" } },
        heatPartition: { chip: 0.85, tool: 0.09, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 530, overTempering: 270, burning: 650 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -60, subsurface: 36, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 12, strainHardeningExponent: 0.15 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "NONE", microcrackRisk: "LOW" },
        burr: { tendency: "HIGH", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.86,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ALUMINUM_TEMPER_CONDITIONS;
}
