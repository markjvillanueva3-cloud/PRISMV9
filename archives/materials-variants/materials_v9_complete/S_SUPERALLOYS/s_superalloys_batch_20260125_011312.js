/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:13:12.198544
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-051": {
      "id": "S-NI-051",
      "name": "PWA 1480",
      "condition": "Single Crystal",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 5608",
      "composition": {
            "Ni": {
                  "min": 59.0,
                  "typical": 60.5,
                  "max": 62.0
            },
            "Co": {
                  "min": 4.8,
                  "typical": 5.0,
                  "max": 5.2
            },
            "Cr": {
                  "min": 9.8,
                  "typical": 10.0,
                  "max": 10.2
            },
            "W": {
                  "min": 3.8,
                  "typical": 4.0,
                  "max": 4.2
            },
            "Ta": {
                  "min": 11.8,
                  "typical": 12.0,
                  "max": 12.2
            },
            "Al": {
                  "min": 4.8,
                  "typical": 5.0,
                  "max": 5.2
            },
            "Ti": {
                  "min": 1.4,
                  "typical": 1.5,
                  "max": 1.6
            },
            "Re": {
                  "min": 0.0,
                  "typical": 0.0,
                  "max": 0.1
            },
            "Hf": {
                  "min": 0.0,
                  "typical": 0.0,
                  "max": 0.1
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.0,
                  "max": 0.05
            },
            "B": {
                  "min": 0.0,
                  "typical": 0.0,
                  "max": 0.005
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8240,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1370,
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
                  "value": 135,
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
                  "C": 165,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 285,
                  "n": 0.22
            },
            "cbn": {
                  "C": 420,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 1035,
            "B": 485,
            "n": 0.32,
            "C": 0.014,
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
            "confidence": 0.85,
            "sources": [
                  "ASM Handbook Vol 16",
                  "Machining Data Handbook",
                  "Superalloy Metallurgy"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-052": {
      "id": "S-NI-052",
      "name": "PWA 1484",
      "condition": "Single Crystal",
      "isoGroup": "S",
      "uns": null,
      "standard": "PWA Specification",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 59.5,
                  "max": 61.0
            },
            "Co": {
                  "min": 9.8,
                  "typical": 10.0,
                  "max": 10.2
            },
            "Cr": {
                  "min": 4.8,
                  "typical": 5.0,
                  "max": 5.2
            },
            "W": {
                  "min": 8.5,
                  "typical": 8.7,
                  "max": 8.9
            },
            "Ta": {
                  "min": 8.5,
                  "typical": 8.7,
                  "max": 8.9
            },
            "Re": {
                  "min": 2.8,
                  "typical": 3.0,
                  "max": 3.2
            },
            "Al": {
                  "min": 5.5,
                  "typical": 5.6,
                  "max": 5.7
            },
            "Ti": {
                  "min": 0.7,
                  "typical": 0.75,
                  "max": 0.8
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8950,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1355,
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
                  "value": 138,
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
                  "uncertainty": "+-8%"
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
            "B": 485,
            "n": 0.22,
            "C": 0.014,
            "m": 1.15
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
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
                        "min": 35,
                        "opt": 55,
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
            "confidence": 85,
            "sources": [
                  "PWA Technical Data",
                  "NIST Superalloy Database",
                  "Pratt & Whitney Research"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-053": {
      "id": "S-NI-053",
      "name": "Alloy 617B",
      "condition": "Wrought",
      "isoGroup": "S",
      "uns": "N06617",
      "standard": "ASTM B166",
      "composition": {
            "Ni": {
                  "min": 44.5,
                  "typical": 54.0,
                  "max": 64.0
            },
            "Cr": {
                  "min": 20.0,
                  "typical": 22.0,
                  "max": 24.0
            },
            "Co": {
                  "min": 10.0,
                  "typical": 12.5,
                  "max": 15.0
            },
            "Mo": {
                  "min": 8.0,
                  "typical": 9.0,
                  "max": 10.0
            },
            "Al": {
                  "min": 0.8,
                  "typical": 1.15,
                  "max": 1.5
            },
            "Ti": {
                  "min": 0.0,
                  "typical": 0.3,
                  "max": 0.6
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.08,
                  "max": 0.15
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.3,
                  "max": 0.5
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 1.5,
                  "max": 3.0
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
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8360,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1332,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 13.4,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 419,
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
                  "value": 758,
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
                  "value": 95,
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
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 28,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 85,
                  "n": 0.22
            },
            "cbn": {
                  "C": 180,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 310,
            "B": 1650,
            "n": 0.65,
            "C": 0.0085,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
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
                  "ASTM B166",
                  "ASM Handbook Vol. 16",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-054": {
      "id": "S-NI-054",
      "name": "Alloy 800H",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N08810",
      "standard": "ASTM B409",
      "composition": {
            "C": {
                  "min": 0.05,
                  "typical": 0.07,
                  "max": 0.1
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 21.0,
                  "max": 23.0
            },
            "Ni": {
                  "min": 30.0,
                  "typical": 32.5,
                  "max": 35.0
            },
            "Fe": {
                  "min": 39.5,
                  "typical": 46.0,
                  "max": 50.0
            },
            "Al": {
                  "min": 0.15,
                  "typical": 0.3,
                  "max": 0.6
            },
            "Ti": {
                  "min": 0.15,
                  "typical": 0.3,
                  "max": 0.6
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.75,
                  "max": 1.5
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.015
            },
            "Cu": {
                  "min": 0.0,
                  "typical": 0.35,
                  "max": 0.75
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7950,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1357,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.9,
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
            "poissonsRatio": 0.29
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 620,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 310,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 30,
                  "unit": "%"
            },
            "hardness": {
                  "value": 187,
                  "unit": "HB",
                  "scale": "Brinell"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 2680,
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
                  "C": 420,
                  "n": 0.22
            },
            "cbn": {
                  "C": 850,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 310,
            "B": 505,
            "n": 0.42,
            "C": 0.015,
            "m": 1.34
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
                  "ASTM B409",
                  "NIMS Machining Database"
            ],
            "uncertainty": "+-8%"
      }
},
    "S-NI-055": {
      "id": "S-NI-055",
      "name": "Alloy 800HT",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N08811",
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
                  "typical": 46.5,
                  "max": null
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.08,
                  "max": 0.1
            },
            "Al": {
                  "min": 0.15,
                  "typical": 0.4,
                  "max": 0.6
            },
            "Ti": {
                  "min": 0.15,
                  "typical": 0.4,
                  "max": 0.6
            },
            "Mn": {
                  "min": null,
                  "typical": 1.0,
                  "max": 1.5
            },
            "Si": {
                  "min": null,
                  "typical": 0.75,
                  "max": 1.0
            },
            "S": {
                  "min": null,
                  "typical": 0.008,
                  "max": 0.015
            },
            "Cu": {
                  "min": null,
                  "typical": 0.38,
                  "max": 0.75
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7940,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1357,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.9,
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
                  "value": 620,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 275,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 30,
                  "unit": "%"
            },
            "hardness": {
                  "value": 187,
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
                  "value": 0.21,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 285,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 420,
                  "n": 0.22
            },
            "cbn": {
                  "C": 580,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 275,
            "B": 680,
            "n": 0.45,
            "C": 0.014,
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
                  "value": 750,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.65,
                  "tool": 0.2,
                  "workpiece": 0.15
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
            "confidence": 0.85,
            "sources": [
                  "ASM Handbook Vol 16",
                  "ASTM B409",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-15%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
