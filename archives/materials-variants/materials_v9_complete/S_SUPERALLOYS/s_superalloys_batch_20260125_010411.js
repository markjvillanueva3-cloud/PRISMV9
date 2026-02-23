/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:04:11.497833
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-016": {
      "id": "S-NI-016",
      "name": "Rene 104",
      "condition": "Powder Metallurgy",
      "isoGroup": "S",
      "uns": "N07104",
      "standard": "AMS 5800",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 60.5,
                  "max": 63.0
            },
            "Cr": {
                  "min": 18.0,
                  "typical": 19.0,
                  "max": 20.0
            },
            "Co": {
                  "min": 17.5,
                  "typical": 18.5,
                  "max": 19.5
            },
            "W": {
                  "min": 3.5,
                  "typical": 4.0,
                  "max": 4.5
            },
            "Al": {
                  "min": 2.8,
                  "typical": 3.1,
                  "max": 3.4
            },
            "Ti": {
                  "min": 2.8,
                  "typical": 3.1,
                  "max": 3.4
            },
            "Mo": {
                  "min": 2.8,
                  "typical": 3.2,
                  "max": 3.6
            },
            "Ta": {
                  "min": 3.0,
                  "typical": 3.5,
                  "max": 4.0
            },
            "Re": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Ru": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Hf": {
                  "min": 0.25,
                  "typical": 0.35,
                  "max": 0.45
            },
            "C": {
                  "min": 0.04,
                  "typical": 0.06,
                  "max": 0.08
            },
            "B": {
                  "min": 0.01,
                  "typical": 0.015,
                  "max": 0.02
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8950,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1360,
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
                  "value": 220,
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
                  "value": 1100,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.5,
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
                  "value": 4850,
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
                  "C": 420,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1100,
            "B": 850,
            "n": 0.42,
            "C": 0.018,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 18,
            "bueRisk": "MODERATE",
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
                  "AMS 5800",
                  "ASM Metals Handbook",
                  "Superalloys II",
                  "PM Superalloys Database"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-017": {
      "id": "S-NI-017",
      "name": "Rene N5",
      "condition": "Single Crystal",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 5398",
      "composition": {
            "Ni": {
                  "min": 61.0,
                  "typical": 62.5,
                  "max": 64.0
            },
            "Co": {
                  "min": 7.0,
                  "typical": 7.5,
                  "max": 8.0
            },
            "Cr": {
                  "min": 6.8,
                  "typical": 7.0,
                  "max": 7.2
            },
            "Ta": {
                  "min": 6.2,
                  "typical": 6.5,
                  "max": 6.8
            },
            "Al": {
                  "min": 6.0,
                  "typical": 6.2,
                  "max": 6.4
            },
            "W": {
                  "min": 4.8,
                  "typical": 5.0,
                  "max": 5.2
            },
            "Re": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Mo": {
                  "min": 1.8,
                  "typical": 2.0,
                  "max": 2.2
            },
            "Hf": {
                  "min": 0.1,
                  "typical": 0.15,
                  "max": 0.2
            },
            "Y": {
                  "min": 0.01,
                  "typical": 0.02,
                  "max": 0.03
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.07,
                  "max": 0.1
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8670,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1365,
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
                  "value": 206,
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
                  "value": 4850,
                  "unit": "N/mm2",
                  "uncertainty": "+-15%"
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
                  "C": 195,
                  "n": 0.18
            },
            "cbn": {
                  "C": 320,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 685,
            "n": 0.42,
            "C": 0.015,
            "m": 1.18
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 18.5,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.78,
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
                        "min": 12,
                        "opt": 18,
                        "max": 28,
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
                  "ASM Metals Handbook",
                  "NIST Superalloy Database",
                  "NASA Glenn Research"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-018": {
      "id": "S-NI-018",
      "name": "MAR-M-246",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": "N10246",
      "standard": "AMS 5371",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 60.5,
                  "max": 63.0
            },
            "Co": {
                  "min": 8.5,
                  "typical": 9.0,
                  "max": 9.5
            },
            "Cr": {
                  "min": 8.75,
                  "typical": 9.0,
                  "max": 9.5
            },
            "W": {
                  "min": 9.5,
                  "typical": 10.0,
                  "max": 10.5
            },
            "Ta": {
                  "min": 1.4,
                  "typical": 1.5,
                  "max": 1.6
            },
            "Al": {
                  "min": 5.4,
                  "typical": 5.5,
                  "max": 5.7
            },
            "Ti": {
                  "min": 1.4,
                  "typical": 1.5,
                  "max": 1.6
            },
            "Hf": {
                  "min": 1.4,
                  "typical": 1.5,
                  "max": 1.6
            },
            "C": {
                  "min": 0.13,
                  "typical": 0.15,
                  "max": 0.17
            },
            "B": {
                  "min": 0.013,
                  "typical": 0.015,
                  "max": 0.017
            },
            "Zr": {
                  "min": 0.04,
                  "typical": 0.05,
                  "max": 0.06
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8270,
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
                  "value": 1380,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1240,
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
                  "value": 4850,
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
                  "n": 0.15
            },
            "cbn": {
                  "C": 420,
                  "n": 0.18
            }
      },
      "johnsonCook": {
            "A": 1240,
            "B": 850,
            "n": 0.32,
            "C": 0.018,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 22,
            "bueRisk": "MODERATE",
            "breakability": "FAIR"
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
                        "min": 18,
                        "opt": 25,
                        "max": 35,
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
                  "ASM Metals Handbook",
                  "NASA Technical Memorandum",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-019": {
      "id": "S-NI-019",
      "name": "MAR-M-247",
      "condition": "Cast + HIP",
      "isoGroup": "S",
      "uns": "N07247",
      "standard": "AMS 5854",
      "composition": {
            "Ni": {
                  "min": 58.5,
                  "typical": 60.0,
                  "max": 61.5
            },
            "Co": {
                  "min": 9.5,
                  "typical": 10.0,
                  "max": 10.5
            },
            "Cr": {
                  "min": 8.0,
                  "typical": 8.25,
                  "max": 8.5
            },
            "W": {
                  "min": 9.5,
                  "typical": 10.0,
                  "max": 10.5
            },
            "Ta": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Al": {
                  "min": 5.4,
                  "typical": 5.5,
                  "max": 5.65
            },
            "Ti": {
                  "min": 0.9,
                  "typical": 1.0,
                  "max": 1.1
            },
            "Hf": {
                  "min": 1.3,
                  "typical": 1.4,
                  "max": 1.5
            },
            "Mo": {
                  "min": 0.5,
                  "typical": 0.65,
                  "max": 0.8
            },
            "C": {
                  "min": 0.13,
                  "typical": 0.15,
                  "max": 0.17
            },
            "B": {
                  "min": 0.01,
                  "typical": 0.015,
                  "max": 0.02
            },
            "Zr": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.07
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
                  "value": 12.8,
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
                  "value": 1035,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 870,
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
                  "n": 0.18
            },
            "ceramic": {
                  "C": 195,
                  "n": 0.25
            },
            "cbn": {
                  "C": 420,
                  "n": 0.32
            }
      },
      "johnsonCook": {
            "A": 1050,
            "B": 850,
            "n": 0.35,
            "C": 0.018,
            "m": 1.15
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
                  "ASM Metals Handbook Vol.16",
                  "Machining Data Handbook 3rd Ed",
                  "Superalloys Database"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-020": {
      "id": "S-NI-020",
      "name": "MAR-M-200",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 5403",
      "composition": {
            "Ni": {
                  "min": 58.5,
                  "typical": 59.0,
                  "max": 60.0
            },
            "Co": {
                  "min": 10.0,
                  "typical": 10.0,
                  "max": 10.0
            },
            "Cr": {
                  "min": 9.0,
                  "typical": 9.0,
                  "max": 9.0
            },
            "W": {
                  "min": 12.0,
                  "typical": 12.5,
                  "max": 13.0
            },
            "Al": {
                  "min": 4.8,
                  "typical": 5.0,
                  "max": 5.5
            },
            "Ti": {
                  "min": 1.8,
                  "typical": 2.0,
                  "max": 2.2
            },
            "Nb": {
                  "min": 0.9,
                  "typical": 1.0,
                  "max": 1.1
            },
            "C": {
                  "min": 0.13,
                  "typical": 0.15,
                  "max": 0.17
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
                  "value": 8300,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1315,
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
                  "value": 210,
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
                  "value": 42,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3850,
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
                  "C": 85,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 155,
                  "n": 0.22
            },
            "cbn": {
                  "C": 280,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 760,
            "B": 385,
            "n": 0.42,
            "C": 0.018,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 22,
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
            "index": 15,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 18,
                        "opt": 28,
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
                  "ASM Metals Handbook Vol. 16",
                  "Machining Data Handbook 3rd Ed",
                  "Superalloys II"
            ],
            "uncertainty": "+-12%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
