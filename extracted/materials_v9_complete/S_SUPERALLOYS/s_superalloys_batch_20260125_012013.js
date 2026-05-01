/**
 * PRISM MATERIALS DATABASE - S_SUPERALLOYS
 * Generated: 2026-01-25T01:20:13.868745
 * Materials: 2
 * Schema: 127 parameters
 */

const S_SUPERALLOYS_BATCH = {
  materials: {
    "S-NI-081": {
      "id": "S-NI-081",
      "name": "Kanthal APM",
      "condition": "ODS",
      "isoGroup": "S",
      "uns": null,
      "standard": "ASTM B608",
      "composition": {
            "Fe": {
                  "min": 70.5,
                  "typical": 72.8,
                  "max": 75.0
            },
            "Cr": {
                  "min": 20.5,
                  "typical": 21.0,
                  "max": 23.5
            },
            "Al": {
                  "min": 4.8,
                  "typical": 5.3,
                  "max": 5.8
            },
            "Y2O3": {
                  "min": 0.3,
                  "typical": 0.4,
                  "max": 0.6
            },
            "C": {
                  "min": 0.0,
                  "typical": 0.08,
                  "max": 0.15
            },
            "Si": {
                  "min": 0.0,
                  "typical": 0.4,
                  "max": 0.7
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 7150,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1500,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 10.5,
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
            "poissonsRatio": 0.3
      },
      "mechanicalProperties": {
            "tensileStrength": {
                  "value": 450,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 320,
                  "unit": "MPa"
            },
            "elongation": {
                  "value": 8,
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
                  "C": 85,
                  "n": 0.18
            },
            "ceramic": {
                  "C": 180,
                  "n": 0.25
            },
            "cbn": {
                  "C": 320,
                  "n": 0.35
            }
      },
      "johnsonCook": {
            "A": 320,
            "B": 280,
            "n": 0.42,
            "C": 0.025,
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
                  "value": 45,
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
                        "min": 0.15,
                        "opt": 0.25,
                        "max": 0.4,
                        "unit": "mm/rev"
                  }
            },
            "coolant": "MANDATORY"
      },
      "statisticalData": {
            "confidence": 0.85,
            "sources": [
                  "ASTM B608",
                  "Kanthal Handbook",
                  "ASM Metals Handbook Vol. 16"
            ],
            "uncertainty": "+-15%"
      }
},
    "S-NI-082": {
      "id": "S-NI-082",
      "name": "Stellite 6B",
      "condition": "Wrought",
      "isoGroup": "S",
      "uns": "R30016",
      "standard": "ASTM F1537",
      "composition": {
            "Co": {
                  "min": 60.0,
                  "typical": 65.0,
                  "max": 70.0
            },
            "Cr": {
                  "min": 27.0,
                  "typical": 28.5,
                  "max": 30.0
            },
            "W": {
                  "min": 3.5,
                  "typical": 4.5,
                  "max": 5.5
            },
            "C": {
                  "min": 0.9,
                  "typical": 1.15,
                  "max": 1.4
            },
            "Ni": {
                  "min": null,
                  "typical": 2.0,
                  "max": 3.0
            },
            "Fe": {
                  "min": null,
                  "typical": 1.5,
                  "max": 3.0
            },
            "Si": {
                  "min": null,
                  "typical": 0.8,
                  "max": 1.5
            },
            "Mn": {
                  "min": null,
                  "typical": 0.8,
                  "max": 1.5
            }
      },
      "physicalProperties": {
            "density": {
                  "value": 8300,
                  "unit": "kg/m3"
            },
            "meltingPoint": {
                  "value": 1350,
                  "unit": "C"
            },
            "thermalConductivity": {
                  "value": 16.8,
                  "unit": "W/mK"
            },
            "specificHeat": {
                  "value": 420,
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
                  "value": 1240,
                  "unit": "MPa"
            },
            "yieldStrength": {
                  "value": 620,
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
                  "uncertainty": "+-15%"
            },
            "mc": {
                  "value": 0.18,
                  "uncertainty": "+-0.03"
            }
      },
      "taylorToolLife": {
            "carbide": {
                  "C": 285,
                  "n": 0.15
            },
            "ceramic": {
                  "C": 420,
                  "n": 0.22
            },
            "cbn": {
                  "C": 680,
                  "n": 0.28
            }
      },
      "johnsonCook": {
            "A": 620,
            "B": 1850,
            "n": 0.35,
            "C": 0.028,
            "m": 1.2
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
                  "chip": 0.52,
                  "tool": 0.35,
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
            "confidence": 85,
            "sources": [
                  "ASTM F1537",
                  "Kennametal Machining Guide",
                  "Stellite Technology"
            ],
            "uncertainty": "+-12%"
      }
}
  }
};

module.exports = S_SUPERALLOYS_BATCH;
