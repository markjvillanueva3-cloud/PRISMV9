/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:17:06.185264
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-066": {
      "id": "S-NI-066",
      "name": "Incoloy 903",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N19903",
      "standard": "AMS 5800",
      "composition": {
            "C": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.08
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.3,
                  "max": 0.6
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.2,
                  "max": 0.4
            },
            "P": {
                  "min": 0.0,
                  "typical": 0.01,
                  "max": 0.02
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.01
            },
            "Cr": {
                  "min": 0.3,
                  "typical": 0.5,
                  "max": 0.7
            },
            "Ni": {
                  "min": 37.0,
                  "typical": 38.0,
                  "max": 40.0
            },
            "Co": {
                  "min": 14.5,
                  "typical": 15.0,
                  "max": 16.0
            },
            "Mo": {
                  "min": 5.5,
                  "typical": 6.0,
                  "max": 6.5
            },
            "Ti": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.3
            },
            "Al": {
                  "min": 0.05,
                  "typical": 0.1,
                  "max": 0.15
            },
            "B": {
                  "min": 0.01,
                  "typical": 0.015,
                  "max": 0.02
            },
            "Zr": {
                  "min": 0.05,
                  "typical": 0.1,
                  "max": 0.15
            },
            "Fe": {
                  "min": 35.0,
                  "typical": 37.5,
                  "max": 40.0
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
                  "value": 11.5,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 460,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 210,
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
                  "value": 1030,
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
                  "C": 45,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 85,
                  "n": 0.25
            },
            "cbn": {
                  "C": 180,
                  "n": 0.35
            }
      },
      "johnsonCook": {
            "A": 1030,
            "B": 985,
            "n": 0.42,
            "C": 0.008,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.75,
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
                  "AMS 5800",
                  "ASM Handbook Vol 16",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-067": {
      "id": "S-NI-067",
      "name": "Incoloy 907",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N19907",
      "standard": "ASTM B408",
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
                  "min": 0.3,
                  "typical": 0.5,
                  "max": 0.8
            },
            "Fe": {
                  "min": 41.0,
                  "typical": 42.5,
                  "max": 44.0
            },
            "Ti": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.3
            },
            "Al": {
                  "min": 0.02,
                  "typical": 0.03,
                  "max": 0.06
            },
            "Nb": {
                  "min": 4.3,
                  "typical": 4.7,
                  "max": 5.2
            },
            "B": {
                  "min": 0.006,
                  "typical": 0.01,
                  "max": 0.015
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.01,
                  "max": 0.04
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.1,
                  "max": 0.35
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8080,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1390,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 205,
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
                  "value": 1240,
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
            "A": 1240,
            "B": 850,
            "n": 0.32,
            "C": 0.014,
            "m": 1.25
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
            "index": 12,
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
            "confidence": 0.82,
            "sources": [
                  "ASTM Standards",
                  "Huntington Alloys",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-068": {
      "id": "S-NI-068",
      "name": "Incoloy 909",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N19909",
      "standard": "ASTM B408",
      "composition": {
            "nickel": {
                  "min": 36.0,
                  "typical": 38.0,
                  "max": 40.0
            },
            "cobalt": {
                  "min": 12.5,
                  "typical": 13.0,
                  "max": 15.5
            },
            "iron": {
                  "min": 41.0,
                  "typical": 42.0,
                  "max": 46.0
            },
            "niobium": {
                  "min": 4.3,
                  "typical": 4.7,
                  "max": 5.2
            },
            "titanium": {
                  "min": 1.4,
                  "typical": 1.5,
                  "max": 1.8
            },
            "silicon": {
                  "min": 0.25,
                  "typical": 0.35,
                  "max": 0.6
            },
            "aluminum": {
                  "min": 0.0,
                  "typical": 0.15,
                  "max": 0.35
            },
            "carbon": {
                  "min": 0.0,
                  "typical": 0.02,
                  "max": 0.06
            },
            "manganese": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1390,
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
                  "C": 220,
                  "n": 0.25
            },
            "cbn": {
                  "C": 450,
                  "n": 0.35
            }
      },
      "johnsonCook": {
            "A": 1100,
            "B": 680,
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
            "coefficient": 0.65,
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
            "confidence": 0.85,
            "sources": [
                  "ASM Handbook Vol.16",
                  "ASTM B408",
                  "Incoloy 909 Technical Bulletin"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-069": {
      "id": "S-NI-069",
      "name": "A-286",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "S66286",
      "standard": "AMS 5737",
      "composition": {
            "Ni": {
                  "min": 24.0,
                  "typical": 26.0,
                  "max": 27.0
            },
            "Cr": {
                  "min": 13.5,
                  "typical": 15.0,
                  "max": 16.0
            },
            "Ti": {
                  "min": 1.9,
                  "typical": 2.1,
                  "max": 2.35
            },
            "Mo": {
                  "min": 1.0,
                  "typical": 1.25,
                  "max": 1.5
            },
            "Al": {
                  "min": 0.35,
                  "typical": 0.5,
                  "max": 0.35
            },
            "V": {
                  "min": 0.1,
                  "typical": 0.25,
                  "max": 0.5
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 1.0,
                  "max": 2.0
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "C": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.08
            },
            "Fe": {
                  "min": 53.5,
                  "typical": 55.0,
                  "max": 57.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7900,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1390,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 14.2,
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
                  "value": 1240,
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
                  "value": 38,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3800,
                  "unit": "N/mm2",
                  "uncertainty": "+-15%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-10%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 180,
                  "n": 0.15
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
            "A": 965,
            "B": 680,
            "n": 0.32,
            "C": 0.014,
            "m": 1.1
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
            "confidence": 85,
            "sources": [
                  "ASM Metals Handbook",
                  "Machining Data Handbook",
                  "AMS Standards"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-070": {
      "id": "S-NI-070",
      "name": "Pyromet 718",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07718",
      "standard": "AMS 5662",
      "composition": {
            "nickel": {
                  "min": 50.0,
                  "typical": 53.0,
                  "max": 55.0
            },
            "chromium": {
                  "min": 17.0,
                  "typical": 19.0,
                  "max": 21.0
            },
            "iron": {
                  "min": 17.0,
                  "typical": 18.5,
                  "max": 21.0
            },
            "molybdenum": {
                  "min": 2.8,
                  "typical": 3.05,
                  "max": 3.3
            },
            "niobium": {
                  "min": 4.75,
                  "typical": 5.13,
                  "max": 5.5
            },
            "titanium": {
                  "min": 0.65,
                  "typical": 0.9,
                  "max": 1.15
            },
            "aluminum": {
                  "min": 0.2,
                  "typical": 0.5,
                  "max": 0.8
            },
            "carbon": {
                  "min": 0.02,
                  "typical": 0.04,
                  "max": 0.08
            },
            "manganese": {
                  "min": 0.0,
                  "typical": 0.175,
                  "max": 0.35
            },
            "silicon": {
                  "min": 0.0,
                  "typical": 0.175,
                  "max": 0.35
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8190,
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
                  "value": 200,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.29
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 1275,
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
                  "value": 0.23,
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
                  "C": 280,
                  "n": 0.26
            }
      },
      "johnsonCook": {
            "A": 1241,
            "B": 622,
            "n": 0.652,
            "C": 0.0134,
            "m": 1.3
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 22,
            "bueRisk": "MODERATE",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.52,
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
            "index": 18,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 35,
                        "opt": 55,
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
            "confidence": 0.92,
            "sources": [
                  "ASM Metals Handbook",
                  "AMS 5662",
                  "NIST SRM Database",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
