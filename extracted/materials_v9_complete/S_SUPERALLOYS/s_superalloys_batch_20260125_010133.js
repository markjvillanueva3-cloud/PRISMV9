/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:01:33.439524
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-006": {
      "id": "S-NI-006",
      "name": "Inconel 690",
      "condition": "Annealed",
      "isoGroup": "S",
      "uns": "N06690",
      "standard": "ASTM B166/B167",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 60.0,
                  "max": 63.0
            },
            "Cr": {
                  "min": 27.0,
                  "typical": 30.0,
                  "max": 31.0
            },
            "Fe": {
                  "min": 7.0,
                  "typical": 9.5,
                  "max": 11.0
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.02,
                  "max": 0.05
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.007,
                  "max": 0.015
            },
            "Cu": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            },
            "Al": {
                  "min": 0.0,
                  "typical": 0.15,
                  "max": 0.4
            },
            "Ti": {
                  "min": 0.0,
                  "typical": 0.15,
                  "max": 0.4
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8190,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1343,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 13.4,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 444,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 214,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.31
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 655,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 275,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 45,
                  "unit": "%"
            },
            "hardness": {
                  "value": 210,
                  "unit": "HB",
                  "scale": "Brinell"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3850,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-8%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 45,
                  "n": 0.12
            },
            "ceramic": {
                  "C": 85,
                  "n": 0.15
            },
            "cbn": {
                  "C": 180,
                  "n": 0.18
            }
      },
      "johnsonCook": {
            "A": 450,
            "B": 1700,
            "n": 0.65,
            "C": 0.017,
            "m": 1.25
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 18,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.65,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 950,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.65,
                  "tool": 0.22,
                  "workpiece": 0.13
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 125,
                  "unit": "um"
            },
            "residualStressType": "compressive",
            "whiteLayerRisk": "MODERATE"
      },
      "machinability": {
            "rating": "D",
            "index": 15,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 25,
                        "opt": 45,
                        "max": 85,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.08,
                        "opt": 0.15,
                        "max": 0.35,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 85,
            "sources": [
                  "ASM Metals Handbook Vol.16",
                  "NIST SRM Database",
                  "Machining Data Handbook 3rd Ed"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-007": {
      "id": "S-NI-007",
      "name": "Inconel 713C",
      "condition": "As-Cast",
      "isoGroup": "S",
      "uns": "N07713",
      "standard": "ASTM B637",
      "composition": {
            "Ni": {
                  "min": 70.0,
                  "typical": 74.0,
                  "max": 77.0
            },
            "Cr": {
                  "min": 12.0,
                  "typical": 12.5,
                  "max": 13.0
            },
            "Co": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Mo": {
                  "min": 4.0,
                  "typical": 4.2,
                  "max": 4.75
            },
            "Al": {
                  "min": 5.5,
                  "typical": 6.1,
                  "max": 6.5
            },
            "Ti": {
                  "min": 0.6,
                  "typical": 0.8,
                  "max": 1.0
            },
            "Nb": {
                  "min": 1.8,
                  "typical": 2.0,
                  "max": 2.5
            },
            "C": {
                  "min": 0.08,
                  "typical": 0.12,
                  "max": 0.2
            },
            "B": {
                  "min": 0.005,
                  "typical": 0.012,
                  "max": 0.015
            },
            "Zr": {
                  "min": 0.05,
                  "typical": 0.1,
                  "max": 0.15
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.007,
                  "max": 0.015
            },
            "Cu": {
                  "min": 0.0,
                  "typical": 0.05,
                  "max": 0.1
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7900,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1315,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.2,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 200,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.31
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 965,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 760,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 4.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 36,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3850,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.22,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 185,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 420,
                  "n": 0.25
            },
            "cbn": {
                  "C": 890,
                  "n": 0.32
            }
      },
      "johnsonCook": {
            "A": 760,
            "B": 1250,
            "n": 0.65,
            "C": 0.012,
            "m": 1.18
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.58,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 950,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.55,
                  "tool": 0.35,
                  "workpiece": 0.1
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 85,
                  "unit": "um"
            },
            "residualStressType": "compressive",
            "whiteLayerRisk": "HIGH"
      },
      "machinability": {
            "rating": "D",
            "index": 15,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 25,
                        "opt": 45,
                        "max": 75,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.08,
                        "opt": 0.15,
                        "max": 0.25,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "ASM Handbook Vol 16",
                  "ASTM B637",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-008": {
      "id": "S-NI-008",
      "name": "Inconel 738",
      "condition": "Cast + Aged",
      "isoGroup": "S",
      "uns": "N07738",
      "standard": "ASTM B637",
      "composition": {
            "Ni": {
                  "min": 60.5,
                  "typical": 61.0,
                  "max": 62.0
            },
            "Cr": {
                  "min": 15.7,
                  "typical": 16.0,
                  "max": 16.3
            },
            "Co": {
                  "min": 8.0,
                  "typical": 8.5,
                  "max": 9.0
            },
            "Al": {
                  "min": 3.2,
                  "typical": 3.4,
                  "max": 3.7
            },
            "Ti": {
                  "min": 3.2,
                  "typical": 3.4,
                  "max": 3.7
            },
            "W": {
                  "min": 2.4,
                  "typical": 2.6,
                  "max": 2.9
            },
            "Mo": {
                  "min": 1.5,
                  "typical": 1.75,
                  "max": 2.0
            },
            "Ta": {
                  "min": 1.5,
                  "typical": 1.75,
                  "max": 2.0
            },
            "Nb": {
                  "min": 0.6,
                  "typical": 0.9,
                  "max": 1.1
            },
            "C": {
                  "min": 0.09,
                  "typical": 0.11,
                  "max": 0.13
            },
            "B": {
                  "min": 0.007,
                  "typical": 0.01,
                  "max": 0.012
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8110,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1315,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.2,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 200,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.31
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 1035,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 760,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 6.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 38,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3850,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-15%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.12
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.18
            },
            "cbn": {
                  "C": 420,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1241,
            "B": 622,
            "n": 0.652,
            "C": 0.006,
            "m": 1.3
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 22,
            "bueRisk": "MODERATE",
            "breakability": "FAIR"
      },
      "friction": {
            "coefficient": 0.65,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 950,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.72,
                  "tool": 0.18,
                  "workpiece": 0.1
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 85,
                  "unit": "um"
            },
            "residualStressType": "compressive",
            "whiteLayerRisk": "MODERATE"
      },
      "machinability": {
            "rating": "D",
            "index": 12,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 25,
                        "opt": 45,
                        "max": 75,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.08,
                        "opt": 0.15,
                        "max": 0.25,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "ASM Metals Handbook",
                  "NIST Superalloy Database",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-009": {
      "id": "S-NI-009",
      "name": "Inconel 792",
      "condition": "Cast + Aged",
      "isoGroup": "S",
      "uns": "N07792",
      "standard": "AMS 5608",
      "composition": {
            "Ni": {
                  "min": 56.0,
                  "typical": 58.5,
                  "max": 61.0
            },
            "Cr": {
                  "min": 12.0,
                  "typical": 12.7,
                  "max": 13.4
            },
            "Co": {
                  "min": 8.5,
                  "typical": 9.0,
                  "max": 9.5
            },
            "Mo": {
                  "min": 1.8,
                  "typical": 1.9,
                  "max": 2.1
            },
            "W": {
                  "min": 3.8,
                  "typical": 4.2,
                  "max": 4.6
            },
            "Al": {
                  "min": 3.0,
                  "typical": 3.4,
                  "max": 3.8
            },
            "Ti": {
                  "min": 3.9,
                  "typical": 4.2,
                  "max": 4.5
            },
            "Ta": {
                  "min": 3.9,
                  "typical": 4.2,
                  "max": 4.5
            },
            "C": {
                  "min": 0.08,
                  "typical": 0.12,
                  "max": 0.16
            },
            "B": {
                  "min": 0.015,
                  "typical": 0.02,
                  "max": 0.025
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1315,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.2,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 206,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.31
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 1034,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 758,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 6.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 42,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3850,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-8%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 145,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 285,
                  "n": 0.22
            },
            "cbn": {
                  "C": 450,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 758,
            "B": 1465,
            "n": 0.65,
            "C": 0.012,
            "m": 1.18
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 18,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.68,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 850,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.62,
                  "tool": 0.25,
                  "workpiece": 0.13
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 85,
                  "unit": "um"
            },
            "residualStressType": "compressive",
            "whiteLayerRisk": "MODERATE"
      },
      "machinability": {
            "rating": "D",
            "index": 12,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 15,
                        "opt": 25,
                        "max": 45,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.08,
                        "opt": 0.15,
                        "max": 0.25,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "ASM Metals Handbook",
                  "Machining Data Handbook",
                  "Superalloys Database"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-010": {
      "id": "S-NI-010",
      "name": "Inconel X-750",
      "condition": "Aged",
      "isoGroup": "S",
      "uns": "N07750",
      "standard": "ASTM B637",
      "composition": {
            "Ni": {
                  "min": 70.0,
                  "typical": 72.5,
                  "max": 75.0
            },
            "Cr": {
                  "min": 14.0,
                  "typical": 15.5,
                  "max": 17.0
            },
            "Fe": {
                  "min": 5.0,
                  "typical": 7.0,
                  "max": 9.0
            },
            "Nb": {
                  "min": 0.7,
                  "typical": 0.95,
                  "max": 1.2
            },
            "Ti": {
                  "min": 2.25,
                  "typical": 2.5,
                  "max": 2.75
            },
            "Al": {
                  "min": 0.4,
                  "typical": 0.7,
                  "max": 1.0
            },
            "C": {
                  "min": 0.02,
                  "typical": 0.04,
                  "max": 0.08
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.01
            },
            "Cu": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8280,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1393,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.2,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 207,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.31
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 1380,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1035,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 15,
                  "unit": "%"
            },
            "hardness": {
                  "value": 42,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3850,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.22,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 95,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.25
            },
            "cbn": {
                  "C": 320,
                  "n": 0.35
            }
      },
      "johnsonCook": {
            "A": 1241,
            "B": 622,
            "n": 0.652,
            "C": 0.0134,
            "m": 1.1
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.68,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 950,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.65,
                  "tool": 0.25,
                  "workpiece": 0.1
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 125,
                  "unit": "um"
            },
            "residualStressType": "compressive",
            "whiteLayerRisk": "MODERATE"
      },
      "machinability": {
            "rating": "D",
            "index": 8,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 15,
                        "opt": 25,
                        "max": 40,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.08,
                        "opt": 0.15,
                        "max": 0.25,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "ASTM B637",
                  "ASM Handbook Vol.16",
                  "Sandvik Machining Guide"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
