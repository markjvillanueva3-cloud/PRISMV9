/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:11:47.714759
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-046": {
      "id": "S-NI-046",
      "name": "IN-939",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": "N07939",
      "standard": "AMS 5397",
      "composition": {
            "C": {
                  "min": 0.12,
                  "typical": 0.15,
                  "max": 0.18
            },
            "Cr": {
                  "min": 22.0,
                  "typical": 22.5,
                  "max": 23.0
            },
            "Co": {
                  "min": 18.5,
                  "typical": 19.0,
                  "max": 19.5
            },
            "W": {
                  "min": 1.8,
                  "typical": 2.0,
                  "max": 2.2
            },
            "Ta": {
                  "min": 1.3,
                  "typical": 1.4,
                  "max": 1.5
            },
            "Ti": {
                  "min": 3.5,
                  "typical": 3.7,
                  "max": 3.9
            },
            "Al": {
                  "min": 1.8,
                  "typical": 1.9,
                  "max": 2.0
            },
            "Nb": {
                  "min": 0.9,
                  "typical": 1.0,
                  "max": 1.1
            },
            "B": {
                  "min": 0.008,
                  "typical": 0.01,
                  "max": 0.012
            },
            "Zr": {
                  "min": 0.08,
                  "typical": 0.1,
                  "max": 0.12
            },
            "Ni": {
                  "min": 47.0,
                  "typical": 48.0,
                  "max": 49.0
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
                  "value": 14.2,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 460,
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
                  "value": 1100,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 6.5,
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
                  "C": 180,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 320,
                  "n": 0.25
            },
            "cbn": {
                  "C": 450,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 1100,
            "B": 650,
            "n": 0.35,
            "C": 0.015,
            "m": 1.25
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 22,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.72,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 980,
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
                  "Superalloys Database",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-047": {
      "id": "S-NI-047",
      "name": "GTD-111",
      "condition": "Directionally Solidified",
      "isoGroup": "S",
      "uns": null,
      "standard": "GE Specification",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 60.2,
                  "max": 62.0
            },
            "Cr": {
                  "min": 13.5,
                  "typical": 14.0,
                  "max": 14.5
            },
            "Co": {
                  "min": 9.0,
                  "typical": 9.5,
                  "max": 10.0
            },
            "W": {
                  "min": 3.5,
                  "typical": 3.8,
                  "max": 4.0
            },
            "Mo": {
                  "min": 1.4,
                  "typical": 1.5,
                  "max": 1.6
            },
            "Ta": {
                  "min": 2.6,
                  "typical": 2.8,
                  "max": 3.0
            },
            "Ti": {
                  "min": 4.8,
                  "typical": 4.9,
                  "max": 5.0
            },
            "Al": {
                  "min": 3.0,
                  "typical": 3.0,
                  "max": 3.1
            },
            "B": {
                  "min": 0.01,
                  "typical": 0.011,
                  "max": 0.014
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.1,
                  "max": 0.17
            },
            "Zr": {
                  "min": 0.005,
                  "typical": 0.008,
                  "max": 0.015
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8250,
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
                  "value": 1100,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.5,
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
            "A": 1100,
            "B": 680,
            "n": 0.32,
            "C": 0.012,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
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
                  "GE Internal Data",
                  "NASA CR-165123",
                  "Superalloys Database"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-048": {
      "id": "S-NI-048",
      "name": "GTD-222",
      "condition": "Single Crystal",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 5958",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 60.5,
                  "max": 63.0
            },
            "Co": {
                  "min": 18.5,
                  "typical": 19.0,
                  "max": 19.5
            },
            "Cr": {
                  "min": 21.8,
                  "typical": 22.0,
                  "max": 22.2
            },
            "Mo": {
                  "min": 0.9,
                  "typical": 1.0,
                  "max": 1.1
            },
            "W": {
                  "min": 2.4,
                  "typical": 2.5,
                  "max": 2.6
            },
            "Al": {
                  "min": 1.1,
                  "typical": 1.2,
                  "max": 1.3
            },
            "Ti": {
                  "min": 1.0,
                  "typical": 1.1,
                  "max": 1.2
            },
            "C": {
                  "min": 0.06,
                  "typical": 0.08,
                  "max": 0.1
            },
            "Hf": {
                  "min": 1.4,
                  "typical": 1.5,
                  "max": 1.6
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8250,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1380,
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
                  "value": 1240,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1015,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.5,
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
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 165,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 285,
                  "n": 0.18
            },
            "cbn": {
                  "C": 420,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1015,
            "B": 485,
            "n": 0.28,
            "C": 0.014,
            "m": 1.12
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
                  "value": 950,
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
            "index": 18,
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
                  "ASM Handbook Vol. 16",
                  "Machining Data Handbook",
                  "NIST Superalloy Database"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-049": {
      "id": "S-NI-049",
      "name": "CMSX-4",
      "condition": "Single Crystal",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 4999",
      "composition": {
            "Ni": {
                  "min": 60.0,
                  "typical": 61.5,
                  "max": 63.0
            },
            "Co": {
                  "min": 9.0,
                  "typical": 9.6,
                  "max": 10.2
            },
            "Cr": {
                  "min": 6.0,
                  "typical": 6.5,
                  "max": 7.0
            },
            "W": {
                  "min": 6.0,
                  "typical": 6.4,
                  "max": 6.8
            },
            "Ta": {
                  "min": 6.0,
                  "typical": 6.5,
                  "max": 7.0
            },
            "Al": {
                  "min": 5.4,
                  "typical": 5.6,
                  "max": 5.8
            },
            "Ti": {
                  "min": 1.0,
                  "typical": 1.0,
                  "max": 1.0
            },
            "Re": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Mo": {
                  "min": 0.4,
                  "typical": 0.6,
                  "max": 0.8
            },
            "Hf": {
                  "min": 0.05,
                  "typical": 0.1,
                  "max": 0.15
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8700,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1350,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 10.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 435,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 127,
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
                  "value": 8.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 410,
                  "unit": "HV",
                  "scale": "Vickers"
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
            "A": 1100,
            "B": 650,
            "n": 0.42,
            "C": 0.018,
            "m": 1.25
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 18,
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
                  "chip": 0.68,
                  "tool": 0.22,
                  "workpiece": 0.1
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 45,
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
                  "NASA CR-2005-213645",
                  "ASME Turbo Expo 2018",
                  "Materials Science & Engineering A"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-050": {
      "id": "S-NI-050",
      "name": "CMSX-10",
      "condition": "Single Crystal",
      "isoGroup": "S",
      "uns": null,
      "standard": "ASTM F3055",
      "composition": {
            "Ni": {
                  "min": 68.0,
                  "typical": 70.0,
                  "max": 72.0
            },
            "Co": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Cr": {
                  "min": 1.8,
                  "typical": 2.0,
                  "max": 2.2
            },
            "Mo": {
                  "min": 0.35,
                  "typical": 0.4,
                  "max": 0.45
            },
            "W": {
                  "min": 4.8,
                  "typical": 5.0,
                  "max": 5.2
            },
            "Al": {
                  "min": 5.5,
                  "typical": 5.7,
                  "max": 5.9
            },
            "Ti": {
                  "min": 0.18,
                  "typical": 0.2,
                  "max": 0.22
            },
            "Ta": {
                  "min": 7.8,
                  "typical": 8.0,
                  "max": 8.2
            },
            "Re": {
                  "min": 5.8,
                  "typical": 6.0,
                  "max": 6.2
            },
            "Nb": {
                  "min": 0.08,
                  "typical": 0.1,
                  "max": 0.12
            },
            "Hf": {
                  "min": 0.025,
                  "typical": 0.03,
                  "max": 0.035
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8750,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1355,
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
                  "value": 132,
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
                  "value": 1250,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.5,
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
                  "value": 4850,
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
                  "C": 45,
                  "n": 0.12
            },
            "ceramic": {
                  "C": 285,
                  "n": 0.25
            },
            "cbn": {
                  "C": 950,
                  "n": 0.35
            }
      },
      "johnsonCook": {
            "A": 1250,
            "B": 580,
            "n": 0.42,
            "C": 0.008,
            "m": 1.25
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 18,
            "bueRisk": "LOW",
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
                  "NIST SRM",
                  "GE Aircraft Engines",
                  "Pratt & Whitney"
            ],
            "uncertainty": "+-12%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
