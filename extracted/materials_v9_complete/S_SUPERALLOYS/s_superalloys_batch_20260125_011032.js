/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:10:32.367397
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-041": {
      "id": "S-NI-041",
      "name": "Udimet 720",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07720",
      "standard": "AMS 5396",
      "composition": {
            "Ni": {
                  "min": 54.5,
                  "typical": 57.0,
                  "max": 59.5
            },
            "Co": {
                  "min": 14.5,
                  "typical": 15.0,
                  "max": 15.5
            },
            "Cr": {
                  "min": 16.0,
                  "typical": 18.0,
                  "max": 18.0
            },
            "W": {
                  "min": 1.0,
                  "typical": 1.25,
                  "max": 1.5
            },
            "Mo": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Al": {
                  "min": 2.4,
                  "typical": 2.5,
                  "max": 2.6
            },
            "Ti": {
                  "min": 4.8,
                  "typical": 5.0,
                  "max": 5.2
            },
            "C": {
                  "min": 0.025,
                  "typical": 0.035,
                  "max": 0.05
            },
            "B": {
                  "min": 0.03,
                  "typical": 0.033,
                  "max": 0.036
            },
            "Zr": {
                  "min": 0.025,
                  "typical": 0.03,
                  "max": 0.035
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
                  "C": 420,
                  "n": 0.18
            },
            "cbn": {
                  "C": 850,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1103,
            "B": 1372,
            "n": 0.65,
            "C": 0.017,
            "m": 1.3
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
            "rating": "D",
            "index": 18,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 45,
                        "opt": 65,
                        "max": 85,
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
                  "AMS 5396",
                  "ASM Metals Handbook Vol.16",
                  "Machinability Data Center"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-042": {
      "id": "S-NI-042",
      "name": "Astroloy",
      "condition": "Powder Metallurgy",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 5391",
      "composition": {
            "Ni": {
                  "min": 56.0,
                  "typical": 57.0,
                  "max": 58.0
            },
            "Co": {
                  "min": 16.0,
                  "typical": 17.0,
                  "max": 18.0
            },
            "Cr": {
                  "min": 14.0,
                  "typical": 15.0,
                  "max": 16.0
            },
            "Mo": {
                  "min": 4.8,
                  "typical": 5.25,
                  "max": 5.7
            },
            "Al": {
                  "min": 3.7,
                  "typical": 4.0,
                  "max": 4.3
            },
            "Ti": {
                  "min": 3.0,
                  "typical": 3.5,
                  "max": 4.0
            },
            "B": {
                  "min": 0.02,
                  "typical": 0.03,
                  "max": 0.04
            },
            "Zr": {
                  "min": 0.02,
                  "typical": 0.05,
                  "max": 0.08
            },
            "C": {
                  "min": 0.02,
                  "typical": 0.03,
                  "max": 0.04
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 0.15,
                  "max": 0.3
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
                  "value": 13.8,
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
                  "value": 12.5,
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
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 180,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 320,
                  "n": 0.22
            },
            "cbn": {
                  "C": 450,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 985,
            "n": 0.42,
            "C": 0.014,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
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
            "confidence": 0.85,
            "sources": [
                  "ASM Metals Handbook",
                  "AMS 5391",
                  "PM Superalloy Database"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-043": {
      "id": "S-NI-043",
      "name": "IN-100",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": "N07041",
      "standard": "AMS 5397",
      "composition": {
            "nickel": {
                  "min": 58.0,
                  "typical": 60.0,
                  "max": 62.0
            },
            "chromium": {
                  "min": 8.0,
                  "typical": 10.0,
                  "max": 12.0
            },
            "cobalt": {
                  "min": 13.0,
                  "typical": 15.0,
                  "max": 17.0
            },
            "aluminum": {
                  "min": 4.7,
                  "typical": 5.5,
                  "max": 6.0
            },
            "titanium": {
                  "min": 3.0,
                  "typical": 4.7,
                  "max": 5.4
            },
            "molybdenum": {
                  "min": 2.0,
                  "typical": 3.0,
                  "max": 4.0
            },
            "vanadium": {
                  "min": 0.7,
                  "typical": 1.0,
                  "max": 1.3
            },
            "carbon": {
                  "min": 0.12,
                  "typical": 0.15,
                  "max": 0.2
            },
            "boron": {
                  "min": 0.01,
                  "typical": 0.014,
                  "max": 0.02
            },
            "zirconium": {
                  "min": 0.02,
                  "typical": 0.05,
                  "max": 0.09
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7900,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1260,
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
                  "value": 213,
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
                  "value": 550,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 6.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 260,
                  "unit": "HB",
                  "scale": "Brinell"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3800,
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
                  "C": 95,
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
            "A": 450,
            "B": 1500,
            "n": 0.65,
            "C": 0.017,
            "m": 1.3
      },
      "chipFormation": {
            "type": "SEGMENTED",
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
                        "opt": 45,
                        "max": 70,
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
                  "NIST Superalloy Database"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-044": {
      "id": "S-NI-044",
      "name": "IN-713C",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": "N07713",
      "standard": "ASTM B637",
      "composition": {
            "Ni": {
                  "min": 70.0,
                  "typical": 74.0,
                  "max": 76.0
            },
            "Cr": {
                  "min": 11.0,
                  "typical": 12.5,
                  "max": 13.0
            },
            "Co": {
                  "min": 0.0,
                  "typical": 0.05,
                  "max": 0.1
            },
            "Mo": {
                  "min": 4.0,
                  "typical": 4.5,
                  "max": 5.0
            },
            "W": {
                  "min": 0.0,
                  "typical": 0.05,
                  "max": 0.1
            },
            "Al": {
                  "min": 5.5,
                  "typical": 6.1,
                  "max": 6.5
            },
            "Ti": {
                  "min": 0.5,
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
                  "min": 0.008,
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
                  "typical": 0.1,
                  "max": 0.5
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
                  "value": 758,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8,
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
                  "value": 3450,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.23,
                  "uncertainty": "+-15%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 245,
                  "n": 0.22
            },
            "cbn": {
                  "C": 420,
                  "n": 0.18
            }
      },
      "johnsonCook": {
            "A": 758,
            "B": 1450,
            "n": 0.35,
            "C": 0.019,
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
            "rating": "D",
            "index": 12,
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
                  "ASTM B637",
                  "ASM Metals Handbook",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-045": {
      "id": "S-NI-045",
      "name": "IN-738LC",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": "N07001",
      "standard": "ASTM B582",
      "composition": {
            "C": {
                  "min": 0.09,
                  "typical": 0.11,
                  "max": 0.13
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
            "W": {
                  "min": 2.4,
                  "typical": 2.6,
                  "max": 2.8
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
            "Al": {
                  "min": 3.2,
                  "typical": 3.4,
                  "max": 3.6
            },
            "Ti": {
                  "min": 3.2,
                  "typical": 3.4,
                  "max": 3.6
            },
            "Nb": {
                  "min": 0.6,
                  "typical": 0.9,
                  "max": 1.1
            },
            "B": {
                  "min": 0.007,
                  "typical": 0.01,
                  "max": 0.012
            },
            "Zr": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.07
            },
            "Ni": {
                  "min": 60.5,
                  "typical": 61.5,
                  "max": 62.5
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
                  "value": 206,
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
                  "value": 725,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 340,
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
                  "C": 320,
                  "n": 0.18
            },
            "cbn": {
                  "C": 485,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1241,
            "B": 572,
            "n": 0.421,
            "C": 0.0134,
            "m": 1.263
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
                  "tool": 0.24,
                  "workpiece": 0.08
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
            "confidence": 85,
            "sources": [
                  "ASM Handbook Vol.16",
                  "Machining Data Handbook",
                  "NIST Superalloy Database"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
