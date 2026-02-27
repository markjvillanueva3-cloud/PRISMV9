/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:19:41.183700
 * Materials: 5
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-076": {
      "id": "S-NI-076",
      "name": "Inconel 713LC",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": "N07713",
      "standard": "AMS 5391",
      "composition": {
            "Ni": {
                  "min": 70.0,
                  "typical": 73.0,
                  "max": 76.0
            },
            "Cr": {
                  "min": 12.0,
                  "typical": 13.0,
                  "max": 14.0
            },
            "Al": {
                  "min": 5.5,
                  "typical": 6.1,
                  "max": 6.5
            },
            "Mo": {
                  "min": 4.0,
                  "typical": 4.5,
                  "max": 5.0
            },
            "Ti": {
                  "min": 0.6,
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
                  "min": 0.009,
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
                  "typical": 1.0,
                  "max": 2.5
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
                  "value": 760,
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
            "A": 1241,
            "B": 622,
            "n": 0.652,
            "C": 0.011,
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
                  "ASM Metals Handbook Vol. 16",
                  "Machining Data Handbook",
                  "Sandvik Coromant Guide"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-077": {
      "id": "S-NI-077",
      "name": "Inconel 939",
      "condition": "Cast",
      "isoGroup": "S",
      "uns": "N07939",
      "standard": "AMS 5398",
      "composition": {
            "Ni": {
                  "min": 52.0,
                  "typical": 53.5,
                  "max": 55.0
            },
            "Co": {
                  "min": 18.5,
                  "typical": 19.0,
                  "max": 19.5
            },
            "Cr": {
                  "min": 22.0,
                  "typical": 22.5,
                  "max": 23.0
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
            "Al": {
                  "min": 3.6,
                  "typical": 3.7,
                  "max": 3.8
            },
            "Ti": {
                  "min": 3.6,
                  "typical": 3.7,
                  "max": 3.8
            },
            "C": {
                  "min": 0.13,
                  "typical": 0.15,
                  "max": 0.17
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
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1340,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 13.5,
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
                  "value": 1240,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1105,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 44,
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
            "A": 1105,
            "B": 850,
            "n": 0.285,
            "C": 0.0125,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 18.5,
            "bueRisk": "MODERATE",
            "breakability": "POOR"
      },
      "friction": {
            "coefficient": 0.62,
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
            "index": 12,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 18,
                        "opt": 35,
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
                  "ASM Handbook Vol 16",
                  "Machining Data Handbook",
                  "AMS 5398"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-078": {
      "id": "S-NI-078",
      "name": "Inconel MA754",
      "condition": "ODS",
      "isoGroup": "S",
      "uns": "N07754",
      "standard": "AMS 5760",
      "composition": {
            "Ni": {
                  "min": 75.0,
                  "typical": 78.0,
                  "max": 80.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 21.0
            },
            "Al": {
                  "min": 0.2,
                  "typical": 0.3,
                  "max": 0.4
            },
            "Ti": {
                  "min": 0.4,
                  "typical": 0.5,
                  "max": 0.6
            },
            "Y2O3": {
                  "min": 0.55,
                  "typical": 0.6,
                  "max": 0.65
            },
            "C": {
                  "min": 0.03,
                  "typical": 0.05,
                  "max": 0.08
            },
            "Fe": {
                  "min": null,
                  "typical": 1.0,
                  "max": 3.0
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8100,
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
                  "value": 965,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 758,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8.5,
                  "unit": "%"
            },
            "hardness": {
                  "value": 325,
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
                  "value": 0.18,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 185,
                  "n": 0.22
            },
            "ceramic": {
                  "C": 425,
                  "n": 0.28
            },
            "cbn": {
                  "C": 850,
                  "n": 0.35
            }
      },
      "johnsonCook": {
            "A": 758,
            "B": 685,
            "n": 0.42,
            "C": 0.028,
            "m": 1.15
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 18.5,
            "bueRisk": "HIGH",
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
            "index": 12,
            "reference": "B1112 = 100"
      },
      "recommendedParameters": {
            "turning": {
                  "speed": {
                        "min": 15,
                        "opt": 35,
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
            "confidence": 0.82,
            "sources": [
                  "ASM Handbook Vol 16",
                  "NIMS Database",
                  "Inconel Technical Bulletin"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-079": {
      "id": "S-NI-079",
      "name": "Inconel MA758",
      "condition": "ODS",
      "isoGroup": "S",
      "uns": null,
      "standard": "ASTM B408",
      "composition": {
            "Ni": {
                  "min": 75.0,
                  "typical": 77.5,
                  "max": 80.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 23.0
            },
            "Al": {
                  "min": 0.2,
                  "typical": 0.3,
                  "max": 0.6
            },
            "Ti": {
                  "min": 0.3,
                  "typical": 0.5,
                  "max": 0.7
            },
            "Y2O3": {
                  "min": 0.5,
                  "typical": 0.6,
                  "max": 0.7
            },
            "Fe": {
                  "min": 0.0,
                  "typical": 0.3,
                  "max": 1.0
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.05,
                  "max": 0.1
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.2,
                  "max": 0.5
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8220,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1395,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 12.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 461,
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
                  "value": 1380,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 1210,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8,
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
                  "C": 145,
                  "n": 0.18
            },
            "cbn": {
                  "C": 280,
                  "n": 0.22
            }
      },
      "johnsonCook": {
            "A": 1210,
            "B": 850,
            "n": 0.35,
            "C": 0.008,
            "m": 1.25
      },
      "chipFormation": {
            "type": "CONTINUOUS",
            "shearAngle": 18,
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
            "confidence": 0.75,
            "sources": [
                  "ASTM B408",
                  "Inconel MA758 Technical Bulletin",
                  "ODS Alloy Machining Handbook"
            ],
            "uncertainty": "+-18%"
      }
},
    "S-NI-080": {
      "id": "S-NI-080",
      "name": "PM2000",
      "condition": "ODS",
      "isoGroup": "S",
      "uns": null,
      "standard": "ASTM B928",
      "composition": {
            "Fe": {
                  "min": 74.5,
                  "typical": 75.8,
                  "max": 77.0
            },
            "Cr": {
                  "min": 19.0,
                  "typical": 20.0,
                  "max": 21.0
            },
            "Al": {
                  "min": 5.0,
                  "typical": 5.5,
                  "max": 6.0
            },
            "Ti": {
                  "min": 0.3,
                  "typical": 0.5,
                  "max": 0.7
            },
            "Y2O3": {
                  "min": 0.3,
                  "typical": 0.5,
                  "max": 0.7
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.01,
                  "max": 0.02
            },
            "N": {
                  "min": 0.0,
                  "typical": 0.005,
                  "max": 0.01
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7200,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1480,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 18.5,
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
                  "value": 850,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 650,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 12,
                  "unit": "%"
            },
            "hardness": {
                  "value": 280,
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
                  "value": 0.21,
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
            "A": 650,
            "B": 380,
            "n": 0.42,
            "C": 0.018,
            "m": 1.15
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
                  "chip": 0.55,
                  "tool": 0.32,
                  "workpiece": 0.13
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
            "index": 18,
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
            "confidence": 0.75,
            "sources": [
                  "ASTM B928-17",
                  "PM Technology Literature",
                  "ODS Alloy Research Papers"
            ],
            "uncertainty": "+-18%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
