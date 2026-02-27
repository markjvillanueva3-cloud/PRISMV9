/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:07:55.730708
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-031": {
      "id": "S-NI-031",
      "name": "Haynes 556",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "R30556",
      "standard": "AMS 5852",
      "composition": {
            "Ni": {
                  "min": 18.0,
                  "typical": 20.0,
                  "max": 22.0
            },
            "Cr": {
                  "min": 21.0,
                  "typical": 22.0,
                  "max": 23.0
            },
            "Co": {
                  "min": 18.0,
                  "typical": 20.0,
                  "max": 22.0
            },
            "Mo": {
                  "min": 2.5,
                  "typical": 3.0,
                  "max": 4.0
            },
            "W": {
                  "min": 2.0,
                  "typical": 2.5,
                  "max": 3.0
            },
            "Al": {
                  "min": 0.15,
                  "typical": 0.2,
                  "max": 0.3
            },
            "Ta": {
                  "min": 0.6,
                  "typical": 0.8,
                  "max": 1.0
            },
            "C": {
                  "min": 0.08,
                  "typical": 0.1,
                  "max": 0.15
            },
            "Fe": {
                  "min": null,
                  "typical": null,
                  "max": 31.0
            },
            "Mn": {
                  "min": null,
                  "typical": 1.0,
                  "max": 2.0
            },
            "Si": {
                  "min": null,
                  "typical": 0.4,
                  "max": 0.8
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8140,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1371,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.9,
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
                  "value": 758,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 379,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 42,
                  "unit": "%"
            },
            "hardness": {
                  "value": 22,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3650,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
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
            "A": 379,
            "B": 1580,
            "n": 0.42,
            "C": 0.018,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
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
                  "chip": 0.45,
                  "tool": 0.28,
                  "workpiece": 0.27
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 185,
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
                  "Haynes International",
                  "ASM Metals Handbook",
                  "NIST Superalloy Database"
            ],
            "uncertainty": "+-8%"
      }
},
    "S-NI-032": {
      "id": "S-NI-032",
      "name": "Nimonic 75",
      "condition": "Annealed",
      "isoGroup": "S",
      "uns": "N06075",
      "standard": "AMS 5378",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 60.5,
                  "max": 63.0
            },
            "Cr": {
                  "min": 18.0,
                  "typical": 20.0,
                  "max": 22.0
            },
            "Ti": {
                  "min": 0.2,
                  "typical": 0.4,
                  "max": 0.7
            },
            "Al": {
                  "min": 0.2,
                  "typical": 0.5,
                  "max": 0.8
            },
            "C": {
                  "min": 0.08,
                  "typical": 0.1,
                  "max": 0.15
            },
            "Mn": {
                  "min": 0.5,
                  "typical": 0.75,
                  "max": 1.0
            },
            "Si": {
                  "min": 0.5,
                  "typical": 0.75,
                  "max": 1.0
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.007,
                  "max": 0.015
            },
            "P": {
                  "min": 0.0,
                  "typical": 0.015,
                  "max": 0.03
            },
            "Fe": {
                  "min": 4.0,
                  "typical": 5.0,
                  "max": 6.0
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
                  "value": 750,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 310,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 35,
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
                  "value": 0.24,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 185,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 320,
                  "n": 0.22
            },
            "cbn": {
                  "C": 750,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 450,
            "B": 1200,
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
                        "opt": 65,
                        "max": 95,
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
                  "Special Metals Corp"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-033": {
      "id": "S-NI-033",
      "name": "Nimonic 80A",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07080",
      "standard": "BS HR 505",
      "composition": {
            "Ni": {
                  "min": 70.0,
                  "typical": 73.5,
                  "max": 77.0
            },
            "Cr": {
                  "min": 18.0,
                  "typical": 20.0,
                  "max": 22.0
            },
            "Ti": {
                  "min": 2.0,
                  "typical": 2.4,
                  "max": 2.8
            },
            "Al": {
                  "min": 1.0,
                  "typical": 1.4,
                  "max": 1.8
            },
            "Co": {
                  "min": 0.0,
                  "typical": 1.5,
                  "max": 3.0
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 1.5,
                  "max": 3.0
            },
            "C": {
                  "min": 0.06,
                  "typical": 0.08,
                  "max": 0.1
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.006,
                  "max": 0.008
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8190,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1365,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.2,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 461,
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
                  "value": 1240,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 690,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 25,
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
                  "value": 0.24,
                  "uncertainty": "+-8%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 42,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 165,
                  "n": 0.22
            },
            "cbn": {
                  "C": 285,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 690,
            "B": 412,
            "n": 0.32,
            "C": 0.024,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
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
                  "value": 650,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.52,
                  "tool": 0.38,
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
            "index": 18,
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
            "confidence": 85,
            "sources": [
                  "ASM Metals Handbook Vol 16",
                  "Sandvik Machining Guide",
                  "NIMS Database"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-034": {
      "id": "S-NI-034",
      "name": "Nimonic 90",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07090",
      "standard": "AMS 5717",
      "composition": {
            "Ni": {
                  "min": 55.0,
                  "typical": 58.5,
                  "max": 62.0
            },
            "Cr": {
                  "min": 18.0,
                  "typical": 19.5,
                  "max": 21.0
            },
            "Co": {
                  "min": 15.0,
                  "typical": 17.0,
                  "max": 20.0
            },
            "Ti": {
                  "min": 2.2,
                  "typical": 2.5,
                  "max": 2.8
            },
            "Al": {
                  "min": 1.2,
                  "typical": 1.5,
                  "max": 1.8
            },
            "Fe": {
                  "min": null,
                  "typical": 1.5,
                  "max": 3.0
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.1,
                  "max": 0.15
            },
            "Mn": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Si": {
                  "min": null,
                  "typical": 0.4,
                  "max": 1.0
            },
            "S": {
                  "min": null,
                  "typical": null,
                  "max": 0.015
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8180,
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
                  "value": 461,
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
                  "value": 1240,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 760,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 15,
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
                  "value": 0.21,
                  "uncertainty": "+-8%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 145,
                  "n": 0.22
            },
            "cbn": {
                  "C": 220,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 760,
            "B": 1820,
            "n": 0.42,
            "C": 0.0134,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 18,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.82,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 980,
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
            "whiteLayerRisk": "HIGH"
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
                  "ASM Machining Handbook",
                  "Special Metals Technical Bulletin",
                  "Manufacturing Database"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-035": {
      "id": "S-NI-035",
      "name": "Nimonic 105",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07105",
      "standard": "AMS 5532",
      "composition": {
            "Ni": {
                  "min": 50.0,
                  "typical": 53.0,
                  "max": 56.0
            },
            "Cr": {
                  "min": 14.0,
                  "typical": 15.0,
                  "max": 16.0
            },
            "Co": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 21.0
            },
            "Mo": {
                  "min": 4.5,
                  "typical": 5.0,
                  "max": 5.5
            },
            "Al": {
                  "min": 4.5,
                  "typical": 4.8,
                  "max": 5.2
            },
            "Ti": {
                  "min": 1.0,
                  "typical": 1.2,
                  "max": 1.4
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 1.0,
                  "max": 2.0
            },
            "C": {
                  "min": 0.08,
                  "typical": 0.12,
                  "max": 0.18
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.005,
                  "max": 0.012
            },
            "Zr": {
                  "min": 0.02,
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
                  "value": 4850,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
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
                  "C": 165,
                  "n": 0.18
            },
            "cbn": {
                  "C": 280,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 680,
            "n": 0.42,
            "C": 0.015,
            "m": 1.18
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
                  "tool": 0.25,
                  "workpiece": 0.1
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
                        "min": 0.05,
                        "opt": 0.08,
                        "max": 0.15,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "ASM Metals Handbook",
                  "NIMS Database",
                  "Rolls-Royce Technical Data"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
