/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:09:10.888993
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-036": {
      "id": "S-NI-036",
      "name": "Nimonic 115",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07115",
      "standard": "AMS 5391",
      "composition": {
            "Ni": {
                  "min": 55.0,
                  "typical": 58.0,
                  "max": 61.0
            },
            "Cr": {
                  "min": 14.0,
                  "typical": 15.0,
                  "max": 16.0
            },
            "Co": {
                  "min": 13.0,
                  "typical": 14.0,
                  "max": 15.0
            },
            "Mo": {
                  "min": 3.0,
                  "typical": 3.5,
                  "max": 4.0
            },
            "Al": {
                  "min": 4.5,
                  "typical": 5.0,
                  "max": 5.5
            },
            "Ti": {
                  "min": 3.5,
                  "typical": 4.0,
                  "max": 4.5
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "C": {
                  "min": 0.15,
                  "typical": 0.17,
                  "max": 0.2
            },
            "B": {
                  "min": 0.01,
                  "typical": 0.015,
                  "max": 0.02
            },
            "Zr": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.08
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8190,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1320,
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
                  "value": 1380,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1100,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 12,
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
                  "uncertainty": "+-8%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-0.02"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.22
            },
            "cbn": {
                  "C": 420,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 450,
            "B": 1100,
            "n": 0.35,
            "C": 0.018,
            "m": 1.15
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
                  "value": 850,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.65,
                  "tool": 0.28,
                  "workpiece": 0.07
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 125,
                  "unit": "um"
            },
            "residualStressType": "compressive",
            "whiteLayerRisk": "HIGH"
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
                        "opt": 0.12,
                        "max": 0.2,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 85,
            "sources": [
                  "ASM Metals Handbook",
                  "Rolls-Royce Technical Data",
                  "Sandvik Machining Guide"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-037": {
      "id": "S-NI-037",
      "name": "Nimonic 263",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07263",
      "standard": "AMS 5887",
      "composition": {
            "Ni": {
                  "min": 49.0,
                  "typical": 51.5,
                  "max": 54.0
            },
            "Co": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 21.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 21.0
            },
            "Mo": {
                  "min": 5.6,
                  "typical": 5.9,
                  "max": 6.1
            },
            "Ti": {
                  "min": 1.9,
                  "typical": 2.05,
                  "max": 2.4
            },
            "Al": {
                  "min": 0.3,
                  "typical": 0.4,
                  "max": 0.6
            },
            "C": {
                  "min": 0.04,
                  "typical": 0.06,
                  "max": 0.08
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.005,
                  "max": 0.007
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 0.35,
                  "max": 0.7
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8360,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1350,
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
                  "value": 221,
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
                  "value": 12,
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
                  "value": 4850,
                  "unit": "N/mm2",
                  "uncertainty": "+-8%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-12%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.12
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.15
            },
            "cbn": {
                  "C": 320,
                  "n": 0.18
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 1250,
            "n": 0.42,
            "C": 0.015,
            "m": 1.25
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 22,
            "bueRisk": "MODERATE",
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
                  "ASM Metals Handbook",
                  "AMS 5887",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-10%"
      }
},
    "S-NI-038": {
      "id": "S-NI-038",
      "name": "Udimet 500",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07500",
      "standard": "AMS 5376",
      "composition": {
            "Ni": {
                  "min": 51.0,
                  "typical": 53.5,
                  "max": 56.0
            },
            "Co": {
                  "min": 17.0,
                  "typical": 18.5,
                  "max": 20.0
            },
            "Cr": {
                  "min": 17.0,
                  "typical": 18.0,
                  "max": 19.0
            },
            "Mo": {
                  "min": 3.5,
                  "typical": 4.0,
                  "max": 4.5
            },
            "Ti": {
                  "min": 2.6,
                  "typical": 3.0,
                  "max": 3.4
            },
            "Al": {
                  "min": 2.4,
                  "typical": 2.9,
                  "max": 3.4
            },
            "Fe": {
                  "min": null,
                  "typical": 2.0,
                  "max": 4.0
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.08,
                  "max": 0.1
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.006,
                  "max": 0.01
            },
            "Zr": {
                  "min": 0.02,
                  "typical": 0.05,
                  "max": 0.08
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
                  "value": 14.2,
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
                  "value": 1380,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1035,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 12,
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
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 185,
                  "n": 0.22
            },
            "ceramic": {
                  "C": 420,
                  "n": 0.28
            },
            "cbn": {
                  "C": 680,
                  "n": 0.32
            }
      },
      "johnsonCook": {
            "A": 1103,
            "B": 1020,
            "n": 0.42,
            "C": 0.014,
            "m": 1.18
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 18,
            "bueRisk": "MODERATE",
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
                        "opt": 35,
                        "max": 65,
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
                  "ASM Metals Handbook Vol 16",
                  "Machining Data Handbook",
                  "Superalloys II"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-039": {
      "id": "S-NI-039",
      "name": "Udimet 520",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07520",
      "standard": "AMS 5759",
      "composition": {
            "Ni": {
                  "min": 52.0,
                  "typical": 54.0,
                  "max": 56.0
            },
            "Cr": {
                  "min": 17.0,
                  "typical": 18.5,
                  "max": 20.0
            },
            "Co": {
                  "min": 11.0,
                  "typical": 12.0,
                  "max": 13.0
            },
            "Mo": {
                  "min": 5.5,
                  "typical": 6.0,
                  "max": 6.5
            },
            "W": {
                  "min": 1.0,
                  "typical": 1.25,
                  "max": 1.5
            },
            "Al": {
                  "min": 1.8,
                  "typical": 2.0,
                  "max": 2.2
            },
            "Ti": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "C": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.08
            },
            "B": {
                  "min": 0.005,
                  "typical": 0.007,
                  "max": 0.01
            },
            "Zr": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.08
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 1.0,
                  "max": 3.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8190,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1340,
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
                  "value": 214,
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
                  "value": 965,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 18,
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
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 145,
                  "n": 0.22
            },
            "cbn": {
                  "C": 180,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 965,
            "B": 1250,
            "n": 0.42,
            "C": 0.018,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.85,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 850,
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
                  "value": 180,
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
                        "min": 18,
                        "opt": 35,
                        "max": 55,
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
                  "Machining Data Handbook",
                  "Superalloy Machining Guide"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-040": {
      "id": "S-NI-040",
      "name": "Udimet 700",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07001",
      "standard": "ASTM B637",
      "composition": {
            "C": {
                  "min": 0.06,
                  "typical": 0.08,
                  "max": 0.1
            },
            "Cr": {
                  "min": 14.0,
                  "typical": 15.0,
                  "max": 16.0
            },
            "Co": {
                  "min": 17.0,
                  "typical": 18.5,
                  "max": 20.0
            },
            "Mo": {
                  "min": 4.0,
                  "typical": 4.3,
                  "max": 4.6
            },
            "Al": {
                  "min": 4.0,
                  "typical": 4.3,
                  "max": 4.7
            },
            "Ti": {
                  "min": 3.2,
                  "typical": 3.5,
                  "max": 3.8
            },
            "B": {
                  "min": 0.02,
                  "typical": 0.03,
                  "max": 0.04
            },
            "Zr": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.08
            },
            "Ni": {
                  "min": 50.0,
                  "typical": 53.0,
                  "max": 56.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8190,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1340,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.7,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 460,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 213,
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
                  "value": 12,
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
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 420,
                  "n": 0.25
            },
            "cbn": {
                  "C": 780,
                  "n": 0.32
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
            "shearAngle": 22,
            "bueRisk": "MODERATE",
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
                  "chip": 0.65,
                  "tool": 0.25,
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
                  "ASM Metals Handbook",
                  "Pratt & Whitney Technical Data",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
