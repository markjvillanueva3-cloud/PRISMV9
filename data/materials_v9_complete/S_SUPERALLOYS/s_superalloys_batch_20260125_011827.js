/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:18:27.505402
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-071": {
      "id": "S-NI-071",
      "name": "Pyromet 31V",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07708",
      "standard": "AMS 5842",
      "composition": {
            "Ni": {
                  "min": 44.0,
                  "typical": 45.5,
                  "max": 47.0
            },
            "Co": {
                  "min": 14.5,
                  "typical": 15.5,
                  "max": 16.5
            },
            "Cr": {
                  "min": 12.0,
                  "typical": 12.7,
                  "max": 13.5
            },
            "Mo": {
                  "min": 4.8,
                  "typical": 5.2,
                  "max": 5.7
            },
            "Al": {
                  "min": 2.4,
                  "typical": 2.7,
                  "max": 3.0
            },
            "Ti": {
                  "min": 2.4,
                  "typical": 2.7,
                  "max": 3.0
            },
            "W": {
                  "min": 1.8,
                  "typical": 2.2,
                  "max": 2.6
            },
            "Nb": {
                  "min": 0.9,
                  "typical": 1.1,
                  "max": 1.3
            },
            "C": {
                  "min": 0.01,
                  "typical": 0.03,
                  "max": 0.05
            },
            "B": {
                  "min": 0.01,
                  "typical": 0.015,
                  "max": 0.02
            },
            "Zr": {
                  "min": 0.02,
                  "typical": 0.035,
                  "max": 0.05
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8280,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1340,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 13.8,
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
                  "value": 1550,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1240,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 12,
                  "unit": "%"
            },
            "hardness": {
                  "value": 46,
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
                  "value": 0.21,
                  "uncertainty": "+-15%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 165,
                  "n": 0.22
            },
            "cbn": {
                  "C": 280,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 1240,
            "B": 485,
            "n": 0.24,
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
            "coefficient": 0.65,
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
                        "opt": 35,
                        "max": 50,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.08,
                        "opt": 0.12,
                        "max": 0.18,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "AMS 5842",
                  "Carpenter Technology",
                  "ASM Handbook Vol 16"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-072": {
      "id": "S-NI-072",
      "name": "Custom Age 625 Plus",
      "condition": "Aged",
      "isoGroup": "S",
      "uns": "N07716",
      "standard": "ASTM B637",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 60.5,
                  "max": 63.0
            },
            "Cr": {
                  "min": 20.0,
                  "typical": 21.5,
                  "max": 23.0
            },
            "Mo": {
                  "min": 8.0,
                  "typical": 9.0,
                  "max": 10.0
            },
            "Nb": {
                  "min": 3.15,
                  "typical": 3.65,
                  "max": 4.15
            },
            "Ti": {
                  "min": 1.3,
                  "typical": 1.6,
                  "max": 1.9
            },
            "Al": {
                  "min": 0.2,
                  "typical": 0.4,
                  "max": 0.8
            },
            "Co": {
                  "min": 0.0,
                  "typical": 1.0,
                  "max": 1.0
            },
            "Fe": {
                  "min": 3.0,
                  "typical": 4.5,
                  "max": 9.0
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.015,
                  "max": 0.025
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.15,
                  "max": 0.35
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.2,
                  "max": 0.4
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.015
            },
            "P": {
                  "min": 0.0,
                  "typical": 0.008,
                  "max": 0.015
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8440,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1320,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 10.2,
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
                  "value": 0.24,
                  "uncertainty": "+-8%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.125
            },
            "ceramic": {
                  "C": 155,
                  "n": 0.165
            },
            "cbn": {
                  "C": 275,
                  "n": 0.195
            }
      },
      "johnsonCook": {
            "A": 450,
            "B": 1700,
            "n": 0.65,
            "C": 0.017,
            "m": 1.3
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 25,
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
            "index": 22,
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
            "confidence": 0.82,
            "sources": [
                  "ASTM B637",
                  "ASM Metals Handbook Vol.16",
                  "Inconel 625PLUS Technical Data"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-073": {
      "id": "S-NI-073",
      "name": "Thermo-Span",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07090",
      "standard": "AMS 5856",
      "composition": {
            "Ni": {
                  "min": 40.0,
                  "typical": 42.0,
                  "max": 44.0
            },
            "Co": {
                  "min": 25.0,
                  "typical": 26.0,
                  "max": 27.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 21.0
            },
            "Ti": {
                  "min": 2.8,
                  "typical": 3.1,
                  "max": 3.4
            },
            "Al": {
                  "min": 2.3,
                  "typical": 2.5,
                  "max": 2.7
            },
            "Mo": {
                  "min": 0.8,
                  "typical": 1.0,
                  "max": 1.2
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 1.0,
                  "max": 2.5
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.35,
                  "max": 0.75
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.05,
                  "max": 0.1
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.006,
                  "max": 0.01
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1385,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 12.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 460,
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
                  "value": 1310,
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
                  "value": 38,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3800,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.21,
                  "uncertainty": "+-0.03"
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
                  "C": 320,
                  "n": 0.18
            }
      },
      "johnsonCook": {
            "A": 965,
            "B": 680,
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
            "coefficient": 0.65,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 850,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.55,
                  "tool": 0.25,
                  "workpiece": 0.2
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
                        "min": 25,
                        "opt": 45,
                        "max": 65,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.08,
                        "opt": 0.12,
                        "max": 0.18,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 85,
            "sources": [
                  "AMS 5856",
                  "ASM Metals Handbook",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-074": {
      "id": "S-NI-074",
      "name": "Allvac 718Plus",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 5894",
      "composition": {
            "Ni": {
                  "min": 50.0,
                  "typical": 52.5,
                  "max": 55.0
            },
            "Cr": {
                  "min": 17.5,
                  "typical": 18.0,
                  "max": 18.5
            },
            "Co": {
                  "min": 8.5,
                  "typical": 9.0,
                  "max": 9.5
            },
            "Mo": {
                  "min": 2.7,
                  "typical": 2.8,
                  "max": 2.9
            },
            "W": {
                  "min": 0.9,
                  "typical": 1.0,
                  "max": 1.1
            },
            "Al": {
                  "min": 1.4,
                  "typical": 1.45,
                  "max": 1.5
            },
            "Ti": {
                  "min": 0.6,
                  "typical": 0.7,
                  "max": 0.8
            },
            "Nb": {
                  "min": 5.3,
                  "typical": 5.4,
                  "max": 5.5
            },
            "Fe": {
                  "min": 8.5,
                  "typical": 10.0,
                  "max": 11.5
            },
            "C": {
                  "min": 0.014,
                  "typical": 0.02,
                  "max": 0.05
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.006,
                  "max": 0.01
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1336,
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
                  "value": 208,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.31
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 1379,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1241,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 12.0,
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
                  "uncertainty": "+-15%"
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
                  "C": 1250,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 1241,
            "B": 1250,
            "n": 0.68,
            "C": 0.014,
            "m": 1.15
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
                  "value": 820,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.68,
                  "tool": 0.18,
                  "workpiece": 0.14
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
                  "ATI Allvac Technical Data",
                  "NIST Superalloy Database",
                  "ASM Metals Handbook"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-075": {
      "id": "S-NI-075",
      "name": "Inconel 100",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": "N13100",
      "standard": "AMS 5397",
      "composition": {
            "nickel": {
                  "min": 58.0,
                  "typical": 61.0,
                  "max": 64.0
            },
            "chromium": {
                  "min": 8.0,
                  "typical": 10.0,
                  "max": 12.0
            },
            "cobalt": {
                  "min": 14.0,
                  "typical": 15.0,
                  "max": 16.0
            },
            "aluminum": {
                  "min": 4.0,
                  "typical": 4.7,
                  "max": 5.5
            },
            "titanium": {
                  "min": 2.8,
                  "typical": 3.5,
                  "max": 4.2
            },
            "molybdenum": {
                  "min": 2.5,
                  "typical": 3.0,
                  "max": 3.5
            },
            "carbon": {
                  "min": 0.12,
                  "typical": 0.17,
                  "max": 0.2
            },
            "boron": {
                  "min": 0.01,
                  "typical": 0.014,
                  "max": 0.02
            },
            "zirconium": {
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
                  "value": 460,
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
                  "value": 758,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 552,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 32,
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
                  "n": 0.15
            },
            "ceramic": {
                  "C": 145,
                  "n": 0.18
            },
            "cbn": {
                  "C": 220,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 450,
            "B": 1100,
            "n": 0.35,
            "C": 0.018,
            "m": 1.25
      },
      "chipFormation": {
            "type": "SEGMENTED",
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
                  "value": 850,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.55,
                  "tool": 0.28,
                  "workpiece": 0.17
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 125,
                  "unit": "um"
            },
            "residualStressType": "tensile",
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
                        "min": 0.1,
                        "opt": 0.2,
                        "max": 0.35,
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
                  "Inconel Alloys Technical Data"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
