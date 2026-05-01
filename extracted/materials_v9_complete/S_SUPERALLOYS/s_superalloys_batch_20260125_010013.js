/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:00:13.034370
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-001": {
      "id": "S-NI-001",
      "name": "Inconel 718",
      "condition": "Solution Treated + Aged",
      "isoGroup": "S",
      "uns": "N07718",
      "standard": "AMS 5662",
      "composition": {
            "Ni": {
                  "min": 50.0,
                  "typical": 53.0,
                  "max": 55.0
            },
            "Cr": {
                  "min": 17.0,
                  "typical": 19.0,
                  "max": 21.0
            },
            "Fe": {
                  "min": 15.0,
                  "typical": 18.0,
                  "max": 21.0
            },
            "Nb": {
                  "min": 4.75,
                  "typical": 5.13,
                  "max": 5.5
            },
            "Mo": {
                  "min": 2.8,
                  "typical": 3.05,
                  "max": 3.3
            },
            "Ti": {
                  "min": 0.65,
                  "typical": 0.9,
                  "max": 1.15
            },
            "Al": {
                  "min": 0.2,
                  "typical": 0.52,
                  "max": 0.8
            },
            "Co": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.04,
                  "max": 0.08
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
                  "value": 1034,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 12,
                  "unit": "%"
            },
            "hardness": {
                  "value": 40,
                  "unit": "HRC",
                  "scale": "Rockwell C"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 3450,
                  "unit": "N/mm2",
                  "uncertainty": "+-8%"
            },
            "mc": {
                  "value": 0.21,
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
                  "C": 580,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 1241,
            "B": 622,
            "n": 0.6518,
            "C": 0.0134,
            "m": 1.3
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
            "bueRisk": "MODERATE",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.72,
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
                        "min": 45,
                        "opt": 65,
                        "max": 85,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.15,
                        "opt": 0.25,
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
                  "Sandvik Coromant Guide"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-002": {
      "id": "S-NI-002",
      "name": "Inconel 625",
      "condition": "Annealed",
      "isoGroup": "S",
      "uns": "N06625",
      "standard": "ASTM B443",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 61.0,
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
            "Fe": {
                  "min": null,
                  "typical": 2.5,
                  "max": 5.0
            },
            "Co": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            },
            "C": {
                  "min": null,
                  "typical": 0.05,
                  "max": 0.1
            },
            "Mn": {
                  "min": null,
                  "typical": 0.25,
                  "max": 0.5
            },
            "Si": {
                  "min": null,
                  "typical": 0.25,
                  "max": 0.5
            },
            "P": {
                  "min": null,
                  "typical": 0.007,
                  "max": 0.015
            },
            "S": {
                  "min": null,
                  "typical": 0.007,
                  "max": 0.015
            },
            "Ti": {
                  "min": null,
                  "typical": 0.2,
                  "max": 0.4
            },
            "Al": {
                  "min": null,
                  "typical": 0.2,
                  "max": 0.4
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8440,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1350,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 9.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 410,
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
                  "value": 827,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 414,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 30,
                  "unit": "%"
            },
            "hardness": {
                  "value": 250,
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
                  "value": 0.2,
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
            "A": 450,
            "B": 1200,
            "n": 0.652,
            "C": 0.0134,
            "m": 1.35
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 25,
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
                  "ASTM B443",
                  "Machining Data Handbook",
                  "Inconel 625 Technical Bulletin"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-003": {
      "id": "S-NI-003",
      "name": "Inconel 600",
      "condition": "Annealed",
      "isoGroup": "S",
      "uns": "N06600",
      "standard": "ASTM B168/B163",
      "composition": {
            "Ni": {
                  "min": 72.0,
                  "typical": 76.0,
                  "max": null
            },
            "Cr": {
                  "min": 14.0,
                  "typical": 15.5,
                  "max": 17.0
            },
            "Fe": {
                  "min": 6.0,
                  "typical": 8.0,
                  "max": 10.0
            },
            "C": {
                  "min": null,
                  "typical": 0.08,
                  "max": 0.15
            },
            "Mn": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Si": {
                  "min": null,
                  "typical": 0.25,
                  "max": 0.5
            },
            "S": {
                  "min": null,
                  "typical": 0.008,
                  "max": 0.015
            },
            "Cu": {
                  "min": null,
                  "typical": 0.25,
                  "max": 0.5
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8470,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1413,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 14.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 444,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 214,
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
                  "value": 30,
                  "unit": "%"
            },
            "hardness": {
                  "value": 85,
                  "unit": "HRB",
                  "scale": "Rockwell B"
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
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 45,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.25
            },
            "cbn": {
                  "C": 320,
                  "n": 0.28
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
            "shearAngle": 18,
            "bueRisk": "HIGH",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.85,
            "adhesionTendency": "HIGH"
      },
      "thermalMachining": {
            "maxCuttingTemp": {
                  "value": 950,
                  "unit": "C"
            },
            "heatPartition": {
                  "chip": 0.45,
                  "tool": 0.35,
                  "workpiece": 0.2
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
                  "Machining Data Handbook",
                  "Sandvik Coromant"
            ],
            "uncertainty": "+-12%"
      }
},
    "S-NI-004": {
      "id": "S-NI-004",
      "name": "Inconel 601",
      "condition": "Annealed",
      "isoGroup": "S",
      "uns": "N06601",
      "standard": "ASTM B168/ASME SB-168",
      "composition": {
            "Ni": {
                  "min": 58.0,
                  "typical": 61.0,
                  "max": 63.0
            },
            "Cr": {
                  "min": 21.0,
                  "typical": 23.0,
                  "max": 25.0
            },
            "Fe": {
                  "min": 9.0,
                  "typical": 14.0,
                  "max": 17.0
            },
            "Al": {
                  "min": 1.0,
                  "typical": 1.35,
                  "max": 1.7
            },
            "C": {
                  "min": 0.01,
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
                  "typical": 0.007,
                  "max": 0.015
            },
            "Cu": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8110,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1360,
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
                  "value": 207,
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
                  "value": 85,
                  "unit": "HRB",
                  "scale": "Rockwell B"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 2850,
                  "unit": "N/mm2",
                  "uncertainty": "+-12%"
            },
            "mc": {
                  "value": 0.23,
                  "uncertainty": "+-0.02"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 125,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.22
            },
            "cbn": {
                  "C": 220,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 450,
            "B": 1200,
            "n": 0.65,
            "C": 0.016,
            "m": 1.1
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 25,
            "bueRisk": "MODERATE",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.65,
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
                  "value": 120,
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
                        "min": 30,
                        "opt": 60,
                        "max": 90,
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
                  "ASM Handbook Vol.16",
                  "ASTM B168",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-8%"
      }
},
    "S-NI-005": {
      "id": "S-NI-005",
      "name": "Inconel 617",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N06617",
      "standard": "ASTM B166",
      "composition": {
            "Ni": {
                  "min": 44.5,
                  "typical": 52.0,
                  "max": 59.5
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
                  "min": null,
                  "typical": 0.3,
                  "max": 0.6
            },
            "Fe": {
                  "min": null,
                  "typical": 1.5,
                  "max": 3.0
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.08,
                  "max": 0.15
            },
            "Mn": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Si": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            },
            "S": {
                  "min": null,
                  "typical": 0.007,
                  "max": 0.015
            },
            "P": {
                  "min": null,
                  "typical": 0.015,
                  "max": 0.03
            },
            "B": {
                  "min": null,
                  "typical": 0.003,
                  "max": 0.006
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
                  "value": 60,
                  "unit": "%"
            },
            "hardness": {
                  "value": 87,
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
                  "C": 145,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 280,
                  "n": 0.22
            },
            "cbn": {
                  "C": 420,
                  "n": 0.25
            }
      },
      "johnsonCook": {
            "A": 1058,
            "B": 1120,
            "n": 0.41,
            "C": 0.0134,
            "m": 1.18
      },
      "chipFormation": {
            "type": "SEGMENTED",
            "shearAngle": 28,
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
                  "ASM Metals Handbook Vol 16",
                  "NIST SRM Database",
                  "Sandvik Machining Guide"
            ],
            "uncertainty": "+-8%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
