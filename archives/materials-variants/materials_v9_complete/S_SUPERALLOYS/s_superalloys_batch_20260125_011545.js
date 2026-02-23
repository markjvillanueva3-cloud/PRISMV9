/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:15:45.768375
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-061": {
      "id": "S-NI-061",
      "name": "MP35N",
      "condition": "Cold Worked + Aged",
      "isoGroup": "S",
      "uns": "R30035",
      "standard": "ASTM F562",
      "composition": {
            "Co": {
                  "min": 33.0,
                  "typical": 35.0,
                  "max": 37.0
            },
            "Ni": {
                  "min": 33.0,
                  "typical": 35.0,
                  "max": 37.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 21.0
            },
            "Mo": {
                  "min": 9.0,
                  "typical": 10.0,
                  "max": 10.5
            },
            "Ti": {
                  "min": 0.0,
                  "typical": 1.0,
                  "max": 1.0
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 0.15,
                  "max": 1.0
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.025,
                  "max": 0.05
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.075,
                  "max": 0.15
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.075,
                  "max": 0.15
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8430,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1360,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 13.4,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 377,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 234,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.32
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 2585,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 2275,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8,
                  "unit": "%"
            },
            "hardness": {
                  "value": 52,
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
                  "uncertainty": "+-8%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 125,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 165,
                  "n": 0.18
            },
            "cbn": {
                  "C": 420,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 1200,
            "B": 1850,
            "n": 0.42,
            "C": 0.015,
            "m": 1.25
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 18,
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
                  "chip": 0.42,
                  "tool": 0.38,
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
            "rating": "F",
            "index": 8,
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
            "confidence": 85,
            "sources": [
                  "SMP Inc Database",
                  "ASTM F562",
                  "Machining Handbook 30th Ed",
                  "Industrial Tribology"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-062": {
      "id": "S-NI-062",
      "name": "MP159",
      "condition": "Cold Worked + Aged",
      "isoGroup": "S",
      "uns": "N26022",
      "standard": "AMS 5723",
      "composition": {
            "Ni": {
                  "min": 25.0,
                  "typical": 26.0,
                  "max": 27.0
            },
            "Co": {
                  "min": 35.0,
                  "typical": 36.0,
                  "max": 37.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 19.5,
                  "max": 21.0
            },
            "Mo": {
                  "min": 7.0,
                  "typical": 7.5,
                  "max": 8.5
            },
            "Ti": {
                  "min": 3.0,
                  "typical": 3.15,
                  "max": 3.4
            },
            "Al": {
                  "min": 0.2,
                  "typical": 0.3,
                  "max": 0.4
            },
            "Fe": {
                  "min": 8.0,
                  "typical": 9.0,
                  "max": 10.0
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.05,
                  "max": 0.15
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
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
                  "value": 460,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 231,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.29
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 1930,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1655,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.0,
                  "unit": "%"
            },
            "hardness": {
                  "value": 48,
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
                  "n": 0.16
            },
            "cbn": {
                  "C": 420,
                  "n": 0.24
            }
      },
      "johnsonCook": {
            "A": 1120,
            "B": 690,
            "n": 0.28,
            "C": 0.014,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
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
                  "tool": 0.28,
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
            "rating": "F",
            "index": 8,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 12,
                        "opt": 18,
                        "max": 25,
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
                  "AMS 5723",
                  "ASM Metals Handbook",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-063": {
      "id": "S-NI-063",
      "name": "Incoloy 800",
      "condition": "Annealed",
      "isoGroup": "S",
      "uns": "N08800",
      "standard": "ASTM B409",
      "composition": {
            "Ni": {
                  "min": 30.0,
                  "typical": 32.5,
                  "max": 35.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 21.0,
                  "max": 23.0
            },
            "Fe": {
                  "min": 39.5,
                  "typical": 46.0,
                  "max": 49.5
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.08,
                  "max": 0.1
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.75,
                  "max": 1.5
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.008,
                  "max": 0.015
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Cu": {
                  "min": 0.0,
                  "typical": 0.38,
                  "max": 0.75
            },
            "Al": {
                  "min": 0.15,
                  "typical": 0.38,
                  "max": 0.6
            },
            "Ti": {
                  "min": 0.15,
                  "typical": 0.38,
                  "max": 0.6
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7940,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1380,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.5,
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
            "poissonsRatio": 0.29
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 550,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 240,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 45,
                  "unit": "%"
            },
            "hardness": {
                  "value": 150,
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
                  "value": 0.22,
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
                  "n": 0.18
            },
            "cbn": {
                  "C": 680,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 240,
            "B": 485,
            "n": 0.42,
            "C": 0.018,
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
            "index": 18,
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
                  "ASTM B409",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-064": {
      "id": "S-NI-064",
      "name": "Incoloy 825",
      "condition": "Annealed",
      "isoGroup": "S",
      "uns": "N08825",
      "standard": "ASTM B564/ASME SB-564",
      "composition": {
            "nickel": {
                  "min": 38.0,
                  "typical": 42.0,
                  "max": 46.0
            },
            "chromium": {
                  "min": 19.5,
                  "typical": 21.5,
                  "max": 23.5
            },
            "iron": {
                  "min": 22.0,
                  "typical": 30.0,
                  "max": null
            },
            "molybdenum": {
                  "min": 2.5,
                  "typical": 3.0,
                  "max": 3.5
            },
            "copper": {
                  "min": 1.5,
                  "typical": 2.25,
                  "max": 3.0
            },
            "titanium": {
                  "min": 0.6,
                  "typical": 0.9,
                  "max": 1.2
            },
            "aluminum": {
                  "min": 0.1,
                  "typical": 0.15,
                  "max": 0.2
            },
            "carbon": {
                  "min": null,
                  "typical": 0.03,
                  "max": 0.05
            },
            "sulfur": {
                  "min": null,
                  "typical": 0.015,
                  "max": 0.03
            },
            "silicon": {
                  "min": null,
                  "typical": 0.25,
                  "max": 0.5
            },
            "manganese": {
                  "min": null,
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
                  "value": 11.2,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
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
                  "value": 620,
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
                  "value": 160,
                  "unit": "HB",
                  "scale": "Brinell"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 2850,
                  "unit": "N/mm2",
                  "uncertainty": "+-15%"
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
                  "C": 310,
                  "n": 0.22
            },
            "cbn": {
                  "C": 420,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 275,
            "B": 685,
            "n": 0.42,
            "C": 0.028,
            "m": 1.15
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
                  "value": 750,
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
                  "ASTM B564",
                  "ASM Metals Handbook Vol.16",
                  "Inco Alloys Data"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-065": {
      "id": "S-NI-065",
      "name": "Incoloy 901",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N09901",
      "standard": "ASTM B408",
      "composition": {
            "Ni": {
                  "min": 40.0,
                  "typical": 42.5,
                  "max": 45.0
            },
            "Fe": {
                  "min": 32.0,
                  "typical": 35.0,
                  "max": 38.0
            },
            "Cr": {
                  "min": 12.0,
                  "typical": 13.0,
                  "max": 14.0
            },
            "Mo": {
                  "min": 5.5,
                  "typical": 6.0,
                  "max": 6.5
            },
            "Ti": {
                  "min": 2.5,
                  "typical": 2.8,
                  "max": 3.1
            },
            "Al": {
                  "min": 0.2,
                  "typical": 0.35,
                  "max": 0.5
            },
            "C": {
                  "min": 0.04,
                  "typical": 0.05,
                  "max": 0.06
            },
            "Si": {
                  "min": 0.1,
                  "typical": 0.25,
                  "max": 0.4
            },
            "Mn": {
                  "min": 0.35,
                  "typical": 0.5,
                  "max": 0.8
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.01
            },
            "P": {
                  "min": 0.0,
                  "typical": 0.008,
                  "max": 0.015
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
                  "value": 15.1,
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
                  "value": 0.21,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 185,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 320,
                  "n": 0.18
            },
            "cbn": {
                  "C": 485,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 1895,
            "n": 0.65,
            "C": 0.0134,
            "m": 1.45
      },
      "chipFormation": {
            "type": "SEGMENTED",
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
                  "ASM Metals Handbook Vol. 16",
                  "NIST Superalloy Database",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
