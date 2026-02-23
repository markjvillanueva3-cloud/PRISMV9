/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:06:41.742346
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-026": {
      "id": "S-NI-026",
      "name": "Hastelloy G-30",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N06030",
      "standard": "ASTM B582",
      "composition": {
            "nickel": {
                  "min": 38.0,
                  "typical": 42.5,
                  "max": 47.0
            },
            "chromium": {
                  "min": 28.0,
                  "typical": 30.0,
                  "max": 32.0
            },
            "iron": {
                  "min": 13.0,
                  "typical": 15.0,
                  "max": 17.0
            },
            "molybdenum": {
                  "min": 4.0,
                  "typical": 5.5,
                  "max": 6.0
            },
            "tungsten": {
                  "min": 1.5,
                  "typical": 2.5,
                  "max": 4.0
            },
            "cobalt": {
                  "min": 0.0,
                  "typical": 2.0,
                  "max": 5.0
            },
            "copper": {
                  "min": 1.0,
                  "typical": 2.0,
                  "max": 2.5
            },
            "niobium": {
                  "min": 0.3,
                  "typical": 0.8,
                  "max": 1.5
            },
            "carbon": {
                  "min": 0.0,
                  "typical": 0.02,
                  "max": 0.03
            },
            "manganese": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.5
            },
            "silicon": {
                  "min": 0.0,
                  "typical": 0.4,
                  "max": 1.0
            },
            "sulfur": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.02
            },
            "phosphorus": {
                  "min": 0.0,
                  "typical": 0.02,
                  "max": 0.04
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1357,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 12.1,
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
                  "value": 690,
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
                  "value": 92,
                  "unit": "HRB",
                  "scale": "Rockwell B"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3250,
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
                  "n": 0.15
            },
            "ceramic": {
                  "C": 145,
                  "n": 0.22
            },
            "cbn": {
                  "C": 220,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 310,
            "B": 1275,
            "n": 0.65,
            "C": 0.012,
            "m": 1.18
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
            "index": 25,
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
                  "ASTM B582",
                  "Haynes International",
                  "ASM Metals Handbook"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-027": {
      "id": "S-NI-027",
      "name": "Haynes 188",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "R30188",
      "standard": "ASTM B435",
      "composition": {
            "Co": {
                  "min": 35.0,
                  "typical": 39.0,
                  "max": 43.0
            },
            "Ni": {
                  "min": 20.0,
                  "typical": 22.0,
                  "max": 24.0
            },
            "Cr": {
                  "min": 20.0,
                  "typical": 22.0,
                  "max": 24.0
            },
            "W": {
                  "min": 13.0,
                  "typical": 14.5,
                  "max": 16.0
            },
            "Fe": {
                  "min": 1.0,
                  "typical": 2.0,
                  "max": 3.0
            },
            "Mn": {
                  "min": 0.5,
                  "typical": 1.0,
                  "max": 1.25
            },
            "Si": {
                  "min": 0.2,
                  "typical": 0.35,
                  "max": 0.5
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.08,
                  "max": 0.15
            },
            "La": {
                  "min": 0.02,
                  "typical": 0.05,
                  "max": 0.12
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.007,
                  "max": 0.015
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 9130,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1330,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 10.1,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 385,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 229,
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
                  "value": 448,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 43,
                  "unit": "%"
            },
            "hardness": {
                  "value": 92,
                  "unit": "HRB",
                  "scale": "Rockwell B"
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
                  "C": 185,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 420,
                  "n": 0.22
            },
            "cbn": {
                  "C": 850,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 448,
            "B": 895,
            "n": 0.47,
            "C": 0.014,
            "m": 1.35
      },
      "chipFormation": {
            "type": "CONTINUOUS",
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
                  "Haynes International",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-028": {
      "id": "S-NI-028",
      "name": "Haynes 230",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N06230",
      "standard": "ASTM B564",
      "composition": {
            "Ni": {
                  "min": 57.0,
                  "typical": 60.0,
                  "max": 63.0
            },
            "Cr": {
                  "min": 20.0,
                  "typical": 22.0,
                  "max": 24.0
            },
            "W": {
                  "min": 14.0,
                  "typical": 14.0,
                  "max": 14.0
            },
            "Mo": {
                  "min": 1.0,
                  "typical": 2.0,
                  "max": 3.0
            },
            "Fe": {
                  "min": null,
                  "typical": 1.5,
                  "max": 3.0
            },
            "Co": {
                  "min": null,
                  "typical": 2.5,
                  "max": 5.0
            },
            "Mn": {
                  "min": null,
                  "typical": 0.3,
                  "max": 0.5
            },
            "Si": {
                  "min": null,
                  "typical": 0.25,
                  "max": 0.4
            },
            "Al": {
                  "min": 0.2,
                  "typical": 0.3,
                  "max": 0.5
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.08,
                  "max": 0.15
            },
            "B": {
                  "min": 0.005,
                  "typical": 0.01,
                  "max": 0.015
            },
            "La": {
                  "min": 0.002,
                  "typical": 0.015,
                  "max": 0.05
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8970,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1350,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 12.6,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 460,
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
                  "value": 760,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 380,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 45,
                  "unit": "%"
            },
            "hardness": {
                  "value": 220,
                  "unit": "HB",
                  "scale": "Brinell"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3200,
                  "unit": "N/mm2",
                  "uncertainty": "+-15%"
            },
            "mc": {
                  "value": 0.22,
                  "uncertainty": "+-0.05"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.25
            },
            "cbn": {
                  "C": 350,
                  "n": 0.35
            }
      },
      "johnsonCook": {
            "A": 380,
            "B": 640,
            "n": 0.42,
            "C": 0.015,
            "m": 1.25
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 25,
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
                  "value": 150,
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
                        "max": 80,
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
                  "Haynes International",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-029": {
      "id": "S-NI-029",
      "name": "Haynes 214",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N07214",
      "standard": "AMS 5878",
      "composition": {
            "Ni": {
                  "min": 73.0,
                  "typical": 76.0,
                  "max": 77.0
            },
            "Cr": {
                  "min": 15.0,
                  "typical": 16.0,
                  "max": 17.0
            },
            "Al": {
                  "min": 3.5,
                  "typical": 4.0,
                  "max": 4.5
            },
            "Fe": {
                  "min": 2.0,
                  "typical": 2.5,
                  "max": 3.0
            },
            "Y": {
                  "min": 0.01,
                  "typical": 0.05,
                  "max": 0.1
            },
            "Zr": {
                  "min": 0.01,
                  "typical": 0.02,
                  "max": 0.1
            },
            "C": {
                  "min": 0.01,
                  "typical": 0.04,
                  "max": 0.08
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.1,
                  "max": 0.5
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.1,
                  "max": 0.5
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.015
            },
            "B": {
                  "min": 0.001,
                  "typical": 0.003,
                  "max": 0.015
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7900,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1400,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 12.5,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 460,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 215,
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
                  "value": 379,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 30,
                  "unit": "%"
            },
            "hardness": {
                  "value": 220,
                  "unit": "HB",
                  "scale": "Brinell"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3200,
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
                  "C": 120,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 280,
                  "n": 0.22
            },
            "cbn": {
                  "C": 450,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 379,
            "B": 1420,
            "n": 0.65,
            "C": 0.018,
            "m": 1.24
      },
      "chipFormation": {
            "type": "CONTINUOUS",
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
                  "value": 950,
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
                  "value": 85,
                  "unit": "um"
            },
            "residualStressType": "tensile",
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
                        "min": 45,
                        "opt": 75,
                        "max": 120,
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
                  "Haynes Technical Data",
                  "Machining Data Center"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-030": {
      "id": "S-NI-030",
      "name": "Haynes 25 (L-605)",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "R30605",
      "standard": "AMS 5759",
      "composition": {
            "cobalt": {
                  "min": 49.0,
                  "typical": 52.0,
                  "max": 55.0
            },
            "chromium": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 21.0
            },
            "tungsten": {
                  "min": 14.0,
                  "typical": 15.0,
                  "max": 16.0
            },
            "nickel": {
                  "min": 9.0,
                  "typical": 10.0,
                  "max": 11.0
            },
            "iron": {
                  "min": 0.0,
                  "typical": 1.5,
                  "max": 3.0
            },
            "manganese": {
                  "min": 1.0,
                  "typical": 1.5,
                  "max": 2.0
            },
            "carbon": {
                  "min": 0.05,
                  "typical": 0.08,
                  "max": 0.15
            },
            "silicon": {
                  "min": 0.0,
                  "typical": 0.2,
                  "max": 0.4
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 9130,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1330,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 10.4,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 228,
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
                  "value": 448,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 50,
                  "unit": "%"
            },
            "hardness": {
                  "value": 95,
                  "unit": "HRB",
                  "scale": "Rockwell B"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3150,
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
                  "C": 85,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.22
            },
            "cbn": {
                  "C": 320,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 448,
            "B": 1015,
            "n": 0.42,
            "C": 0.018,
            "m": 1.05
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
                  "ASM Handbook Vol. 16",
                  "Haynes International",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
