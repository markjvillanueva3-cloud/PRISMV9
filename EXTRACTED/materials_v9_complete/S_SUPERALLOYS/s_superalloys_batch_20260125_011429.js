/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:14:29.896111
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-056": {
      "id": "S-NI-056",
      "name": "Alloy 825",
      "condition": "Annealed",
      "isoGroup": "S",
      "uns": "N08825",
      "standard": "ASTM B564",
      "composition": {
            "C": {
                  "min": 0.0,
                  "typical": 0.03,
                  "max": 0.05
            },
            "Cr": {
                  "min": 19.5,
                  "typical": 21.5,
                  "max": 23.5
            },
            "Ni": {
                  "min": 38.0,
                  "typical": 42.0,
                  "max": 46.0
            },
            "Fe": {
                  "min": 22.0,
                  "typical": 30.0,
                  "max": 40.0
            },
            "Mo": {
                  "min": 2.5,
                  "typical": 3.0,
                  "max": 3.5
            },
            "Cu": {
                  "min": 1.5,
                  "typical": 2.25,
                  "max": 3.0
            },
            "Ti": {
                  "min": 0.6,
                  "typical": 0.9,
                  "max": 1.2
            },
            "Al": {
                  "min": 0.0,
                  "typical": 0.1,
                  "max": 0.2
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.01,
                  "max": 0.03
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8140,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1370,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 12.1,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 460,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 196,
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
                  "value": 310,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 45,
                  "unit": "%"
            },
            "hardness": {
                  "value": 160,
                  "unit": "HB",
                  "scale": "Brinell"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 2850,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.19,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 145,
                  "n": 0.21
            },
            "ceramic": {
                  "C": 280,
                  "n": 0.25
            },
            "cbn": {
                  "C": 520,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 310,
            "B": 690,
            "n": 0.42,
            "C": 0.014,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 28,
            "bueRisk": "HIGH",
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
                  "chip": 0.68,
                  "tool": 0.22,
                  "workpiece": 0.1
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 125,
                  "unit": "um"
            },
            "residualStressType": "compressive",
            "whiteLayerRisk": "LOW"
      },
      "machinability": {
            "rating": "D",
            "index": 18,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 35,
                        "opt": 55,
                        "max": 85,
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
                  "ASTM B564",
                  "NIST SRM",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-057": {
      "id": "S-NI-057",
      "name": "Alloy 901",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N09901",
      "standard": "AMS 5660",
      "composition": {
            "Ni": {
                  "min": 40.0,
                  "typical": 42.5,
                  "max": 46.0
            },
            "Fe": {
                  "min": 34.0,
                  "typical": 36.0,
                  "max": 38.0
            },
            "Cr": {
                  "min": 11.0,
                  "typical": 12.5,
                  "max": 14.0
            },
            "Mo": {
                  "min": 5.5,
                  "typical": 6.0,
                  "max": 6.5
            },
            "Ti": {
                  "min": 2.2,
                  "typical": 2.8,
                  "max": 3.2
            },
            "Al": {
                  "min": 0.15,
                  "typical": 0.25,
                  "max": 0.35
            },
            "C": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.1
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
                  "max": 0.015
            },
            "P": {
                  "min": 0.0,
                  "typical": 0.015,
                  "max": 0.03
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8190,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1370,
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
                  "value": 1520,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1170,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 16,
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
                  "C": 185,
                  "n": 0.12
            },
            "ceramic": {
                  "C": 425,
                  "n": 0.18
            },
            "cbn": {
                  "C": 750,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1170,
            "B": 1540,
            "n": 0.65,
            "C": 0.008,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 25,
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
            "index": 15,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 35,
                        "opt": 55,
                        "max": 85,
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
                  "AMS 5660",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-058": {
      "id": "S-NI-058",
      "name": "Alloy 903",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N19903",
      "standard": "AMS 5800",
      "composition": {
            "Ni": {
                  "min": 36.0,
                  "typical": 38.0,
                  "max": 40.0
            },
            "Co": {
                  "min": 14.5,
                  "typical": 15.0,
                  "max": 15.5
            },
            "Cr": {
                  "min": 18.5,
                  "typical": 19.0,
                  "max": 19.5
            },
            "Mo": {
                  "min": 5.8,
                  "typical": 6.0,
                  "max": 6.2
            },
            "W": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Ti": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Al": {
                  "min": 0.8,
                  "typical": 0.9,
                  "max": 1.0
            },
            "Nb": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "B": {
                  "min": 0.01,
                  "typical": 0.015,
                  "max": 0.02
            },
            "C": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.08
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 1.5,
                  "max": 3.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8270,
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
                  "value": 1035,
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
                  "n": 0.12
            },
            "ceramic": {
                  "C": 145,
                  "n": 0.18
            },
            "cbn": {
                  "C": 280,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 890,
            "n": 0.42,
            "C": 0.0095,
            "m": 1.18
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
            "residualStressType": "tensile",
            "whiteLayerRisk": "MODERATE"
      },
      "machinability": {
            "rating": "D",
            "index": 18,
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
                  "Sandvik Machining Data",
                  "NIST Superalloy Database"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-059": {
      "id": "S-NI-059",
      "name": "Alloy 907",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N09907",
      "standard": "AMS 5800",
      "composition": {
            "Ni": {
                  "min": 36.0,
                  "typical": 38.0,
                  "max": 40.0
            },
            "Co": {
                  "min": 12.0,
                  "typical": 13.0,
                  "max": 15.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 20.5,
                  "max": 22.0
            },
            "Mo": {
                  "min": 4.5,
                  "typical": 5.2,
                  "max": 6.0
            },
            "Ti": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.3
            },
            "Al": {
                  "min": 0.05,
                  "typical": 0.15,
                  "max": 0.35
            },
            "Nb": {
                  "min": 4.3,
                  "typical": 4.7,
                  "max": 5.2
            },
            "C": {
                  "min": 0.01,
                  "typical": 0.05,
                  "max": 0.1
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.3,
                  "max": 0.7
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.2,
                  "max": 0.5
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 15.0,
                  "max": 18.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8200,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1340,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 12.5,
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
                  "value": 0.22,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.125
            },
            "ceramic": {
                  "C": 145,
                  "n": 0.155
            },
            "cbn": {
                  "C": 290,
                  "n": 0.185
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 985,
            "n": 0.42,
            "C": 0.018,
            "m": 1.25
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.65,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 850,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.58,
                  "tool": 0.28,
                  "workpiece": 0.14
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
                        "min": 35,
                        "opt": 55,
                        "max": 85,
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
                  "AMS 5800",
                  "ASM Metals Handbook Vol.16",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-060": {
      "id": "S-NI-060",
      "name": "Alloy 909",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N19909",
      "standard": "ASTM B637",
      "composition": {
            "Ni": {
                  "min": 36.0,
                  "typical": 38.0,
                  "max": 40.0
            },
            "Fe": {
                  "min": 40.0,
                  "typical": 42.0,
                  "max": 44.0
            },
            "Co": {
                  "min": 12.5,
                  "typical": 13.0,
                  "max": 16.0
            },
            "Nb": {
                  "min": 4.3,
                  "typical": 4.7,
                  "max": 5.2
            },
            "Ti": {
                  "min": 1.3,
                  "typical": 1.5,
                  "max": 1.8
            },
            "Al": {
                  "min": 0.0,
                  "typical": 0.03,
                  "max": 0.1
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.2,
                  "max": 0.4
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            },
            "Cr": {
                  "min": 0.0,
                  "typical": 0.05,
                  "max": 0.1
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.015,
                  "max": 0.03
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
                  "value": 12.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 180,
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
                  "C": 185,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 420,
                  "n": 0.22
            },
            "cbn": {
                  "C": 650,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 890,
            "n": 0.42,
            "C": 0.012,
            "m": 1.15
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
                  "value": 750,
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
            "index": 18,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 35,
                        "opt": 55,
                        "max": 85,
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
                  "ASM Metals Handbook Vol.16",
                  "Sandvik Machining Guide",
                  "Kennametal Technical Data"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
