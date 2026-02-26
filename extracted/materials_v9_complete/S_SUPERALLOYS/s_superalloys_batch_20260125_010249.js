/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:02:49.595263
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-011": {
      "id": "S-NI-011",
      "name": "Waspaloy",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07001",
      "standard": "AMS 5544",
      "composition": {
            "Ni": {
                  "min": 55.0,
                  "typical": 58.0,
                  "max": 60.0
            },
            "Cr": {
                  "min": 18.0,
                  "typical": 19.5,
                  "max": 21.0
            },
            "Co": {
                  "min": 12.0,
                  "typical": 13.5,
                  "max": 15.0
            },
            "Mo": {
                  "min": 3.5,
                  "typical": 4.3,
                  "max": 5.0
            },
            "Ti": {
                  "min": 2.75,
                  "typical": 3.0,
                  "max": 3.25
            },
            "Al": {
                  "min": 1.2,
                  "typical": 1.4,
                  "max": 1.6
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 1.0,
                  "max": 2.0
            },
            "C": {
                  "min": 0.02,
                  "typical": 0.08,
                  "max": 0.1
            },
            "B": {
                  "min": 0.004,
                  "typical": 0.006,
                  "max": 0.008
            },
            "Zr": {
                  "min": 0.03,
                  "typical": 0.06,
                  "max": 0.1
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
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
                  "value": 211,
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
                  "value": 20,
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
                  "uncertainty": "+-15%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.12
            },
            "ceramic": {
                  "C": 145,
                  "n": 0.15
            },
            "cbn": {
                  "C": 220,
                  "n": 0.18
            }
      },
      "johnsonCook": {
            "A": 1895,
            "B": 1850,
            "n": 0.42,
            "C": 0.014,
            "m": 1.35
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 22,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.75,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 850,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.72,
                  "tool": 0.22,
                  "workpiece": 0.06
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
                        "min": 25,
                        "opt": 45,
                        "max": 65,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.05,
                        "opt": 0.12,
                        "max": 0.2,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "ASM Metals Handbook Vol 16",
                  "NIST Superalloy Database",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-012": {
      "id": "S-NI-012",
      "name": "Rene 41",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07041",
      "standard": "AMS 5712",
      "composition": {
            "Ni": {
                  "min": 50.0,
                  "typical": 52.5,
                  "max": 55.0
            },
            "Cr": {
                  "min": 18.0,
                  "typical": 19.0,
                  "max": 20.0
            },
            "Co": {
                  "min": 10.0,
                  "typical": 11.0,
                  "max": 12.0
            },
            "Mo": {
                  "min": 9.0,
                  "typical": 10.0,
                  "max": 11.0
            },
            "Ti": {
                  "min": 3.0,
                  "typical": 3.15,
                  "max": 3.3
            },
            "Al": {
                  "min": 1.4,
                  "typical": 1.55,
                  "max": 1.8
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 2.5,
                  "max": 5.0
            },
            "C": {
                  "min": 0.06,
                  "typical": 0.09,
                  "max": 0.12
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.006,
                  "max": 0.01
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8249,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1343,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.5,
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
                  "value": 4200,
                  "unit": "N/mm2",
                  "uncertainty": "+-15%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 95,
                  "n": 0.12
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.15
            },
            "cbn": {
                  "C": 850,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 965,
            "B": 850,
            "n": 0.42,
            "C": 0.015,
            "m": 1.25
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
                  "value": 980,
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
            "index": 12,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 15,
                        "opt": 35,
                        "max": 60,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.05,
                        "opt": 0.15,
                        "max": 0.3,
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
            "uncertainty": "+-12%"
      }
},
    "S-NI-013": {
      "id": "S-NI-013",
      "name": "Rene 80",
      "condition": "Cast + Aged",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 5403",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 60.0,
                  "max": 62.0
            },
            "Cr": {
                  "min": 13.0,
                  "typical": 14.0,
                  "max": 15.0
            },
            "Co": {
                  "min": 9.0,
                  "typical": 9.5,
                  "max": 10.0
            },
            "W": {
                  "min": 3.8,
                  "typical": 4.0,
                  "max": 4.2
            },
            "Al": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Ti": {
                  "min": 4.8,
                  "typical": 5.0,
                  "max": 5.2
            },
            "Mo": {
                  "min": 3.8,
                  "typical": 4.0,
                  "max": 4.2
            },
            "C": {
                  "min": 0.15,
                  "typical": 0.17,
                  "max": 0.2
            },
            "B": {
                  "min": 0.015,
                  "typical": 0.017,
                  "max": 0.02
            },
            "Zr": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.06
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8250,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1315,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.5,
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
                  "value": 4.5,
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
                  "value": 4200,
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
                  "n": 0.125
            },
            "ceramic": {
                  "C": 195,
                  "n": 0.155
            },
            "cbn": {
                  "C": 420,
                  "n": 0.185
            }
      },
      "johnsonCook": {
            "A": 1262,
            "B": 354,
            "n": 0.18,
            "C": 0.0134,
            "m": 1.24
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 18,
            "bueRisk": "MODERATE",
            "breakability": "FAIR"
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
                  "tool": 0.28,
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
            "confidence": 85,
            "sources": [
                  "ASM Handbook Vol.16",
                  "Machining Data Handbook",
                  "AMS 5403"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-014": {
      "id": "S-NI-014",
      "name": "Rene 88DT",
      "condition": "Powder Metallurgy",
      "isoGroup": "S",
      "uns": "N07088",
      "standard": "ASTM F3055",
      "composition": {
            "Ni": {
                  "min": 60.0,
                  "typical": 62.5,
                  "max": 65.0
            },
            "Co": {
                  "min": 12.5,
                  "typical": 13.0,
                  "max": 13.5
            },
            "Cr": {
                  "min": 15.5,
                  "typical": 16.0,
                  "max": 16.5
            },
            "Mo": {
                  "min": 3.7,
                  "typical": 4.0,
                  "max": 4.3
            },
            "W": {
                  "min": 3.7,
                  "typical": 4.0,
                  "max": 4.3
            },
            "Al": {
                  "min": 2.0,
                  "typical": 2.1,
                  "max": 2.2
            },
            "Ti": {
                  "min": 3.65,
                  "typical": 3.7,
                  "max": 3.75
            },
            "Nb": {
                  "min": 0.5,
                  "typical": 0.7,
                  "max": 0.9
            },
            "C": {
                  "min": 0.025,
                  "typical": 0.03,
                  "max": 0.04
            },
            "B": {
                  "min": 0.015,
                  "typical": 0.02,
                  "max": 0.03
            },
            "Zr": {
                  "min": 0.03,
                  "typical": 0.04,
                  "max": 0.05
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1340,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.5,
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
                  "value": 1450,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1240,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 14,
                  "unit": "%"
            },
            "hardness": {
                  "value": 45,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 4200,
                  "unit": "N/mm2",
                  "uncertainty": "+-15%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-0.03"
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
            "A": 1240,
            "B": 890,
            "n": 0.42,
            "C": 0.018,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 22,
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
                  "value": 85,
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
            "confidence": 0.85,
            "sources": [
                  "ASM Metals Handbook",
                  "Machining Data Handbook",
                  "Powder Metallurgy Superalloys Research"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-015": {
      "id": "S-NI-015",
      "name": "Rene 95",
      "condition": "Powder Metallurgy",
      "isoGroup": "S",
      "uns": "N07095",
      "standard": "AMS 5382",
      "composition": {
            "Ni": {
                  "min": 60.0,
                  "typical": 63.0,
                  "max": 66.0
            },
            "Co": {
                  "min": 7.5,
                  "typical": 8.0,
                  "max": 8.5
            },
            "Cr": {
                  "min": 12.5,
                  "typical": 13.0,
                  "max": 13.5
            },
            "W": {
                  "min": 3.3,
                  "typical": 3.5,
                  "max": 3.7
            },
            "Mo": {
                  "min": 3.3,
                  "typical": 3.5,
                  "max": 3.7
            },
            "Al": {
                  "min": 3.3,
                  "typical": 3.5,
                  "max": 3.7
            },
            "Ti": {
                  "min": 2.3,
                  "typical": 2.5,
                  "max": 2.7
            },
            "Nb": {
                  "min": 3.3,
                  "typical": 3.5,
                  "max": 3.7
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.065,
                  "max": 0.08
            },
            "B": {
                  "min": 0.01,
                  "typical": 0.013,
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
                  "value": 8250,
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
                  "value": 220,
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
                  "value": 1170,
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
                  "value": 4200,
                  "unit": "N/mm2",
                  "uncertainty": "+-15%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-0.02"
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
                  "C": 420,
                  "n": 0.18
            }
      },
      "johnsonCook": {
            "A": 1170,
            "B": 650,
            "n": 0.32,
            "C": 0.008,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 22,
            "bueRisk": "MODERATE",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.72,
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
            "index": 15,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 25,
                        "opt": 40,
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
                  "ASM Metals Handbook",
                  "AMS 5382",
                  "Superalloys Database"
            ],
            "uncertainty": "+-12%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
