/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:05:24.069389
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-021": {
      "id": "S-NI-021",
      "name": "MAR-M-509",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": null,
      "standard": "AMS 5708",
      "composition": {
            "C": {
                  "min": 0.55,
                  "typical": 0.6,
                  "max": 0.65
            },
            "Cr": {
                  "min": 23.0,
                  "typical": 23.5,
                  "max": 24.0
            },
            "Co": {
                  "min": 9.5,
                  "typical": 10.0,
                  "max": 10.5
            },
            "W": {
                  "min": 6.8,
                  "typical": 7.0,
                  "max": 7.5
            },
            "Ta": {
                  "min": 3.2,
                  "typical": 3.5,
                  "max": 3.8
            },
            "Ti": {
                  "min": 0.15,
                  "typical": 0.2,
                  "max": 0.25
            },
            "Zr": {
                  "min": 0.45,
                  "typical": 0.5,
                  "max": 0.6
            },
            "B": {
                  "min": 0.003,
                  "typical": 0.005,
                  "max": 0.01
            },
            "Ni": {
                  "min": 54.0,
                  "typical": 55.0,
                  "max": 56.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8250,
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
                  "value": 220,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.31
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 1170,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 830,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.0,
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
            "A": 1150,
            "B": 650,
            "n": 0.28,
            "C": 0.015,
            "m": 1.25
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
                  "chip": 0.55,
                  "tool": 0.25,
                  "workpiece": 0.2
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
            "confidence": 0.82,
            "sources": [
                  "ASM Handbook Vol. 16",
                  "Machining Data Handbook",
                  "AMS Standards"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-022": {
      "id": "S-NI-022",
      "name": "Hastelloy X",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N06002",
      "standard": "ASTM B435",
      "composition": {
            "Ni": {
                  "min": 45.0,
                  "typical": 47.0,
                  "max": 50.0
            },
            "Cr": {
                  "min": 20.5,
                  "typical": 22.0,
                  "max": 23.0
            },
            "Fe": {
                  "min": 17.0,
                  "typical": 18.5,
                  "max": 20.0
            },
            "Mo": {
                  "min": 8.0,
                  "typical": 9.0,
                  "max": 10.0
            },
            "Co": {
                  "min": 0.5,
                  "typical": 1.5,
                  "max": 2.5
            },
            "W": {
                  "min": 0.2,
                  "typical": 0.6,
                  "max": 1.0
            },
            "C": {
                  "min": 0.05,
                  "typical": 0.1,
                  "max": 0.15
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Mn": {
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
                  "value": 1355,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 486,
                  "unit": "J/kgK"
            },
            "elasticModulus": {
                  "value": 205,
                  "unit": "GPa"
            },
            "poissonsRatio": 0.3
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 785,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 345,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 43,
                  "unit": "%"
            },
            "hardness": {
                  "value": 90,
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
                  "value": 0.24,
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
            "A": 344,
            "B": 875,
            "n": 0.52,
            "C": 0.021,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
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
                  "chip": 0.68,
                  "tool": 0.18,
                  "workpiece": 0.14
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
                        "min": 35,
                        "opt": 55,
                        "max": 85,
                        "unit": "m/min"
                  },
                  "feed": {
                        "min": 0.1,
                        "opt": 0.18,
                        "max": 0.3,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "ASTM Standards",
                  "Haynes International",
                  "Machining Data Handbook"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-023": {
      "id": "S-NI-023",
      "name": "Hastelloy C-276",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N10276",
      "standard": "ASTM B575",
      "composition": {
            "Ni": {
                  "min": 57.0,
                  "typical": 59.0,
                  "max": 61.0
            },
            "Cr": {
                  "min": 14.5,
                  "typical": 15.5,
                  "max": 16.5
            },
            "Mo": {
                  "min": 15.0,
                  "typical": 16.0,
                  "max": 17.0
            },
            "W": {
                  "min": 3.0,
                  "typical": 4.0,
                  "max": 4.5
            },
            "Fe": {
                  "min": 4.0,
                  "typical": 5.5,
                  "max": 7.0
            },
            "Co": {
                  "min": null,
                  "typical": 1.0,
                  "max": 2.5
            },
            "C": {
                  "min": null,
                  "typical": 0.006,
                  "max": 0.01
            },
            "Mn": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Si": {
                  "min": null,
                  "typical": 0.04,
                  "max": 0.08
            },
            "P": {
                  "min": null,
                  "typical": 0.015,
                  "max": 0.04
            },
            "S": {
                  "min": null,
                  "typical": 0.005,
                  "max": 0.03
            },
            "V": {
                  "min": null,
                  "typical": 0.15,
                  "max": 0.35
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8890,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1370,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 10.1,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 427,
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
                  "value": 758,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 355,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 40,
                  "unit": "%"
            },
            "hardness": {
                  "value": 217,
                  "unit": "HB",
                  "scale": "Brinell"
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
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 185,
                  "n": 0.25
            },
            "ceramic": {
                  "C": 320,
                  "n": 0.35
            },
            "cbn": {
                  "C": 580,
                  "n": 0.45
            }
      },
      "johnsonCook": {
            "A": 355,
            "B": 712,
            "n": 0.421,
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
                  "value": 650,
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
            "whiteLayerRisk": "LOW"
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
            "confidence": 0.88,
            "sources": [
                  "ASM Metals Handbook",
                  "Hastelloy Technical Data",
                  "NIST Superalloy Database"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-024": {
      "id": "S-NI-024",
      "name": "Hastelloy C-22",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N06022",
      "standard": "ASTM B575",
      "composition": {
            "Ni": {
                  "min": 50.0,
                  "typical": 56.0,
                  "max": 59.0
            },
            "Cr": {
                  "min": 20.0,
                  "typical": 22.0,
                  "max": 22.5
            },
            "Mo": {
                  "min": 12.5,
                  "typical": 13.0,
                  "max": 14.5
            },
            "W": {
                  "min": 2.5,
                  "typical": 3.0,
                  "max": 3.5
            },
            "Fe": {
                  "min": 2.0,
                  "typical": 3.0,
                  "max": 6.0
            },
            "Co": {
                  "min": 0.0,
                  "typical": 1.25,
                  "max": 2.5
            },
            "V": {
                  "min": 0.0,
                  "typical": 0.175,
                  "max": 0.35
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.008,
                  "max": 0.015
            },
            "Mn": {
                  "min": 0.0,
                  "typical": 0.25,
                  "max": 0.5
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.04,
                  "max": 0.08
            },
            "P": {
                  "min": 0.0,
                  "typical": 0.015,
                  "max": 0.02
            },
            "S": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.01
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8690,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1370,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 11.1,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 425,
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
                  "value": 760,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 345,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 45,
                  "unit": "%"
            },
            "hardness": {
                  "value": 217,
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
                  "value": 0.21,
                  "uncertainty": "+-0.03"
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
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 345,
            "B": 1100,
            "n": 0.42,
            "C": 0.011,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 25,
            "bueRisk": "MODERATE",
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
            "index": 18,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 45,
                        "opt": 85,
                        "max": 120,
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
            "confidence": 0.88,
            "sources": [
                  "ASTM B575",
                  "NACE MR0175",
                  "Haynes International"
            ],
            "uncertainty": "+-8%"
      }
},
    "S-NI-025": {
      "id": "S-NI-025",
      "name": "Hastelloy B-2",
      "condition": "Solution Treated",
      "isoGroup": "S",
      "uns": "N10665",
      "standard": "ASTM B333",
      "composition": {
            "Ni": {
                  "min": 60.0,
                  "typical": 62.0,
                  "max": null
            },
            "Mo": {
                  "min": 26.0,
                  "typical": 28.0,
                  "max": 30.0
            },
            "Fe": {
                  "min": null,
                  "typical": 1.0,
                  "max": 2.0
            },
            "Cr": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            },
            "Co": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            },
            "C": {
                  "min": null,
                  "typical": 0.01,
                  "max": 0.02
            },
            "Si": {
                  "min": null,
                  "typical": 0.05,
                  "max": 0.1
            },
            "Mn": {
                  "min": null,
                  "typical": 0.5,
                  "max": 1.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 9220,
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
                  "value": 385,
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
                  "value": 760,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 350,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 40,
                  "unit": "%"
            },
            "hardness": {
                  "value": 230,
                  "unit": "HB",
                  "scale": "Brinell"
            }
      },
      "kienzle": {
            "kc1_1": {
                  "value": 2800,
                  "unit": "N/mm2",
                  "uncertainty": "+-15%"
            },
            "mc": {
                  "value": 0.22,
                  "uncertainty": "+-10%"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 85,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 120,
                  "n": 0.18
            },
            "cbn": {
                  "C": 180,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 350,
            "B": 715,
            "n": 0.28,
            "C": 0.015,
            "m": 1.12
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
                  "tool": 0.25,
                  "workpiece": 0.1
            }
      },
      "surfaceIntegrity": {
            "workHardeningDepth": {
                  "value": 150,
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
            "confidence": 85,
            "sources": [
                  "ASTM B333",
                  "Haynes International",
                  "ASM Handbook Vol. 16"
            ],
            "uncertainty": "+-12%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
