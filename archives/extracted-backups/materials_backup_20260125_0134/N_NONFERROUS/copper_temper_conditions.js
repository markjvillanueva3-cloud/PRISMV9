/**
 * PRISM MATERIALS DATABASE - Copper Alloy Temper Conditions
 * File: copper_temper_conditions.js
 * 
 * COMPREHENSIVE COVERAGE:
 * - Pure Copper: C10100, C10200, C11000 - O, H tempers
 * - Brass: C26000, C27000, C28000, C36000 - O, H tempers
 * - Phosphor Bronze: C51000, C52100, C54400 - O, H tempers
 * - Silicon Bronze: C65500 - O, H tempers
 * - Aluminum Bronze: C63000, C95400 - O, H tempers
 * - Beryllium Copper: C17200, C17500 - TB00, TD, TF tempers
 * - Nickel Silver: C75200, C77000 - O, H tempers
 * 
 * CRITICAL: Same alloy at different tempers = different machining!
 * - C26000 O60: Tensile 340 MPa, gummy, BUE issues
 * - C26000 H08: Tensile 585 MPa, excellent chip control
 * 
 * Generated: 2026-01-24 22:31:34
 */

const COPPER_TEMPER_CONDITIONS = {
  metadata: {
    file: "copper_temper_conditions.js",
    category: "N_NONFERROUS",
    materialCount: 77,
    coverage: {
      pure_copper: 15,
      brass: 19,
      bronze: 16,
      silicon_bronze: 5,
      aluminum_bronze: 4,
      beryllium_copper: 8,
      nickel_silver: 10
    }
  },

  materials: {
    "N-CU-101": {
      "id": "N-CU-101",
      "name": "C10100 OFE Copper O60",
      "designation": {
            "uns": "C10100",
            "din": "2.0040",
            "en": "CW009A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 99.99
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 391,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 220
            },
            "yield_strength": {
                  "typical": 69
            },
            "elongation": {
                  "typical": 55
            }
      },
      "kienzle": {
            "kc1_1": 855,
            "mc": 0.28
      },
      "taylor": {
            "C": 340,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 150,
                              "opt": 200,
                              "max": 270
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "electrical",
            "waveguides",
            "vacuum_components"
      ],
      "notes": "Oxygen-free electronic grade"
},
    "N-CU-102": {
      "id": "N-CU-102",
      "name": "C10100 OFE Copper H01",
      "designation": {
            "uns": "C10100",
            "din": "2.0040",
            "en": "CW009A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 99.99
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 391,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 246
            },
            "yield_strength": {
                  "typical": 86
            },
            "elongation": {
                  "typical": 44
            }
      },
      "kienzle": {
            "kc1_1": 912,
            "mc": 0.28
      },
      "taylor": {
            "C": 396,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 189,
                              "opt": 253,
                              "max": 341
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "waveguides",
            "vacuum_components"
      ],
      "notes": "Oxygen-free electronic grade"
},
    "N-CU-103": {
      "id": "N-CU-103",
      "name": "C10100 OFE Copper H02",
      "designation": {
            "uns": "C10100",
            "din": "2.0040",
            "en": "CW009A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 99.99
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 391,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 275
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 927,
            "mc": 0.28
      },
      "taylor": {
            "C": 392,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 192,
                              "opt": 257,
                              "max": 346
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "waveguides",
            "vacuum_components"
      ],
      "notes": "Oxygen-free electronic grade"
},
    "N-CU-104": {
      "id": "N-CU-104",
      "name": "C10100 OFE Copper H04",
      "designation": {
            "uns": "C10100",
            "din": "2.0040",
            "en": "CW009A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 99.99
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 391,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 330
            },
            "yield_strength": {
                  "typical": 138
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 954,
            "mc": 0.28
      },
      "taylor": {
            "C": 384,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 198,
                              "opt": 265,
                              "max": 357
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "waveguides",
            "vacuum_components"
      ],
      "notes": "Oxygen-free electronic grade"
},
    "N-CU-105": {
      "id": "N-CU-105",
      "name": "C10200 OFHC Copper O60",
      "designation": {
            "uns": "C10200",
            "din": "2.0040",
            "en": "CW008A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 99.95
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 388,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 220
            },
            "yield_strength": {
                  "typical": 69
            },
            "elongation": {
                  "typical": 55
            }
      },
      "kienzle": {
            "kc1_1": 855,
            "mc": 0.28
      },
      "taylor": {
            "C": 340,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 150,
                              "opt": 200,
                              "max": 270
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
},
    "N-CU-106": {
      "id": "N-CU-106",
      "name": "C10200 OFHC Copper H01",
      "designation": {
            "uns": "C10200",
            "din": "2.0040",
            "en": "CW008A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 99.95
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 388,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 246
            },
            "yield_strength": {
                  "typical": 86
            },
            "elongation": {
                  "typical": 44
            }
      },
      "kienzle": {
            "kc1_1": 912,
            "mc": 0.28
      },
      "taylor": {
            "C": 396,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 189,
                              "opt": 253,
                              "max": 341
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
},
    "N-CU-107": {
      "id": "N-CU-107",
      "name": "C10200 OFHC Copper H02",
      "designation": {
            "uns": "C10200",
            "din": "2.0040",
            "en": "CW008A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 99.95
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 388,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 275
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 927,
            "mc": 0.28
      },
      "taylor": {
            "C": 392,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 192,
                              "opt": 257,
                              "max": 346
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
},
    "N-CU-108": {
      "id": "N-CU-108",
      "name": "C10200 OFHC Copper H04",
      "designation": {
            "uns": "C10200",
            "din": "2.0040",
            "en": "CW008A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 99.95
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 388,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 330
            },
            "yield_strength": {
                  "typical": 138
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 954,
            "mc": 0.28
      },
      "taylor": {
            "C": 384,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 198,
                              "opt": 265,
                              "max": 357
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
},
    "N-CU-109": {
      "id": "N-CU-109",
      "name": "C10200 OFHC Copper H06",
      "designation": {
            "uns": "C10200",
            "din": "2.0040",
            "en": "CW008A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 99.95
      },
      "physical": {
            "density": 8940,
            "thermal_conductivity": 388,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 356
            },
            "yield_strength": {
                  "typical": 155
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 966,
            "mc": 0.28
      },
      "taylor": {
            "C": 380,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 204,
                              "opt": 272,
                              "max": 367
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical",
            "bus_bars",
            "heat_exchangers"
      ]
},
    "N-CU-110": {
      "id": "N-CU-110",
      "name": "C11000 ETP Copper O60",
      "designation": {
            "uns": "C11000",
            "din": "2.0060",
            "en": "CW004A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 99.9
      },
      "physical": {
            "density": 8920,
            "thermal_conductivity": 385,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 220
            },
            "yield_strength": {
                  "typical": 69
            },
            "elongation": {
                  "typical": 50
            }
      },
      "kienzle": {
            "kc1_1": 874,
            "mc": 0.28
      },
      "taylor": {
            "C": 323,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 144,
                              "opt": 192,
                              "max": 259
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "electrical_wire",
            "bus_bars",
            "roofing"
      ],
      "notes": "Electrolytic tough pitch"
},
    "N-CU-111": {
      "id": "N-CU-111",
      "name": "C11000 ETP Copper H01",
      "designation": {
            "uns": "C11000",
            "din": "2.0060",
            "en": "CW004A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 99.9
      },
      "physical": {
            "density": 8920,
            "thermal_conductivity": 385,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 246
            },
            "yield_strength": {
                  "typical": 86
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 933,
            "mc": 0.28
      },
      "taylor": {
            "C": 376,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 182,
                              "opt": 243,
                              "max": 328
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical_wire",
            "bus_bars",
            "roofing"
      ],
      "notes": "Electrolytic tough pitch"
},
    "N-CU-112": {
      "id": "N-CU-112",
      "name": "C11000 ETP Copper H02",
      "designation": {
            "uns": "C11000",
            "din": "2.0060",
            "en": "CW004A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 99.9
      },
      "physical": {
            "density": 8920,
            "thermal_conductivity": 385,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 275
            },
            "yield_strength": {
                  "typical": 103
            },
            "elongation": {
                  "typical": 32
            }
      },
      "kienzle": {
            "kc1_1": 947,
            "mc": 0.28
      },
      "taylor": {
            "C": 372,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 185,
                              "opt": 247,
                              "max": 333
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical_wire",
            "bus_bars",
            "roofing"
      ],
      "notes": "Electrolytic tough pitch"
},
    "N-CU-113": {
      "id": "N-CU-113",
      "name": "C11000 ETP Copper H04",
      "designation": {
            "uns": "C11000",
            "din": "2.0060",
            "en": "CW004A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 99.9
      },
      "physical": {
            "density": 8920,
            "thermal_conductivity": 385,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 330
            },
            "yield_strength": {
                  "typical": 138
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 975,
            "mc": 0.28
      },
      "taylor": {
            "C": 364,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 190,
                              "opt": 254,
                              "max": 342
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical_wire",
            "bus_bars",
            "roofing"
      ],
      "notes": "Electrolytic tough pitch"
},
    "N-CU-114": {
      "id": "N-CU-114",
      "name": "C11000 ETP Copper H06",
      "designation": {
            "uns": "C11000",
            "din": "2.0060",
            "en": "CW004A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 99.9
      },
      "physical": {
            "density": 8920,
            "thermal_conductivity": 385,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 356
            },
            "yield_strength": {
                  "typical": 155
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 988,
            "mc": 0.28
      },
      "taylor": {
            "C": 361,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 195,
                              "opt": 261,
                              "max": 352
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical_wire",
            "bus_bars",
            "roofing"
      ],
      "notes": "Electrolytic tough pitch"
},
    "N-CU-115": {
      "id": "N-CU-115",
      "name": "C11000 ETP Copper H08",
      "designation": {
            "uns": "C11000",
            "din": "2.0060",
            "en": "CW004A"
      },
      "iso_group": "N",
      "material_class": "Copper - Pure Copper",
      "condition": "H08",
      "condition_description": "Spring",
      "composition": {
            "Cu": 99.9
      },
      "physical": {
            "density": 8920,
            "thermal_conductivity": 385,
            "elastic_modulus": 117000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 378
            },
            "yield_strength": {
                  "typical": 172
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 999,
            "mc": 0.28
      },
      "taylor": {
            "C": 358,
            "n": 0.29
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 201,
                              "opt": 268,
                              "max": 361
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "electrical_wire",
            "bus_bars",
            "roofing"
      ],
      "notes": "Electrolytic tough pitch"
},
    "N-CU-116": {
      "id": "N-CU-116",
      "name": "C26000 Cartridge Brass O60",
      "designation": {
            "uns": "C26000",
            "din": "2.0265",
            "en": "CW505L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 70.0,
            "Zn": 30.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 120,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 340
            },
            "yield_strength": {
                  "typical": 105
            },
            "elongation": {
                  "typical": 65
            }
      },
      "kienzle": {
            "kc1_1": 997,
            "mc": 0.26
      },
      "taylor": {
            "C": 272,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 120,
                              "opt": 160,
                              "max": 216
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "cartridge_cases",
            "hardware",
            "fasteners"
      ],
      "notes": "70/30 brass - most common"
},
    "N-CU-117": {
      "id": "N-CU-117",
      "name": "C26000 Cartridge Brass H01",
      "designation": {
            "uns": "C26000",
            "din": "2.0265",
            "en": "CW505L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 70.0,
            "Zn": 30.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 120,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 380
            },
            "yield_strength": {
                  "typical": 131
            },
            "elongation": {
                  "typical": 52
            }
      },
      "kienzle": {
            "kc1_1": 1064,
            "mc": 0.26
      },
      "taylor": {
            "C": 316,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 151,
                              "opt": 202,
                              "max": 272
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cartridge_cases",
            "hardware",
            "fasteners"
      ],
      "notes": "70/30 brass - most common"
},
    "N-CU-118": {
      "id": "N-CU-118",
      "name": "C26000 Cartridge Brass H02",
      "designation": {
            "uns": "C26000",
            "din": "2.0265",
            "en": "CW505L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 70.0,
            "Zn": 30.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 120,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 425
            },
            "yield_strength": {
                  "typical": 157
            },
            "elongation": {
                  "typical": 42
            }
      },
      "kienzle": {
            "kc1_1": 1081,
            "mc": 0.26
      },
      "taylor": {
            "C": 313,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 154,
                              "opt": 206,
                              "max": 278
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cartridge_cases",
            "hardware",
            "fasteners"
      ],
      "notes": "70/30 brass - most common"
},
    "N-CU-119": {
      "id": "N-CU-119",
      "name": "C26000 Cartridge Brass H04",
      "designation": {
            "uns": "C26000",
            "din": "2.0265",
            "en": "CW505L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 70.0,
            "Zn": 30.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 120,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 510
            },
            "yield_strength": {
                  "typical": 210
            },
            "elongation": {
                  "typical": 26
            }
      },
      "kienzle": {
            "kc1_1": 1113,
            "mc": 0.26
      },
      "taylor": {
            "C": 307,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 159,
                              "opt": 212,
                              "max": 286
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cartridge_cases",
            "hardware",
            "fasteners"
      ],
      "notes": "70/30 brass - most common"
},
    "N-CU-120": {
      "id": "N-CU-120",
      "name": "C26000 Cartridge Brass H06",
      "designation": {
            "uns": "C26000",
            "din": "2.0265",
            "en": "CW505L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 70.0,
            "Zn": 30.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 120,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 550
            },
            "yield_strength": {
                  "typical": 236
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 1127,
            "mc": 0.26
      },
      "taylor": {
            "C": 304,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 163,
                              "opt": 218,
                              "max": 294
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cartridge_cases",
            "hardware",
            "fasteners"
      ],
      "notes": "70/30 brass - most common"
},
    "N-CU-121": {
      "id": "N-CU-121",
      "name": "C26000 Cartridge Brass H08",
      "designation": {
            "uns": "C26000",
            "din": "2.0265",
            "en": "CW505L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H08",
      "condition_description": "Spring",
      "composition": {
            "Cu": 70.0,
            "Zn": 30.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 120,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 584
            },
            "yield_strength": {
                  "typical": 262
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 1140,
            "mc": 0.26
      },
      "taylor": {
            "C": 301,
            "n": 0.26
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 168,
                              "opt": 224,
                              "max": 302
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "cartridge_cases",
            "hardware",
            "fasteners"
      ],
      "notes": "70/30 brass - most common"
},
    "N-CU-122": {
      "id": "N-CU-122",
      "name": "C27000 Yellow Brass O60",
      "designation": {
            "uns": "C27000",
            "din": "2.0280",
            "en": "CW508L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 65.0,
            "Zn": 35.0
      },
      "physical": {
            "density": 8470,
            "thermal_conductivity": 116,
            "elastic_modulus": 105000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 330
            },
            "yield_strength": {
                  "typical": 97
            },
            "elongation": {
                  "typical": 62
            }
      },
      "kienzle": {
            "kc1_1": 978,
            "mc": 0.26
      },
      "taylor": {
            "C": 280,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 126,
                              "opt": 168,
                              "max": 226
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "architectural",
            "hardware",
            "lamp_bases"
      ]
},
    "N-CU-123": {
      "id": "N-CU-123",
      "name": "C27000 Yellow Brass H01",
      "designation": {
            "uns": "C27000",
            "din": "2.0280",
            "en": "CW508L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 65.0,
            "Zn": 35.0
      },
      "physical": {
            "density": 8470,
            "thermal_conductivity": 116,
            "elastic_modulus": 105000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 369
            },
            "yield_strength": {
                  "typical": 121
            },
            "elongation": {
                  "typical": 49
            }
      },
      "kienzle": {
            "kc1_1": 1044,
            "mc": 0.26
      },
      "taylor": {
            "C": 326,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 159,
                              "opt": 213,
                              "max": 287
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "hardware",
            "lamp_bases"
      ]
},
    "N-CU-124": {
      "id": "N-CU-124",
      "name": "C27000 Yellow Brass H02",
      "designation": {
            "uns": "C27000",
            "din": "2.0280",
            "en": "CW508L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 65.0,
            "Zn": 35.0
      },
      "physical": {
            "density": 8470,
            "thermal_conductivity": 116,
            "elastic_modulus": 105000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 412
            },
            "yield_strength": {
                  "typical": 145
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 1060,
            "mc": 0.26
      },
      "taylor": {
            "C": 323,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 162,
                              "opt": 216,
                              "max": 291
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "hardware",
            "lamp_bases"
      ]
},
    "N-CU-125": {
      "id": "N-CU-125",
      "name": "C27000 Yellow Brass H04",
      "designation": {
            "uns": "C27000",
            "din": "2.0280",
            "en": "CW508L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 65.0,
            "Zn": 35.0
      },
      "physical": {
            "density": 8470,
            "thermal_conductivity": 116,
            "elastic_modulus": 105000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 495
            },
            "yield_strength": {
                  "typical": 194
            },
            "elongation": {
                  "typical": 24
            }
      },
      "kienzle": {
            "kc1_1": 1091,
            "mc": 0.26
      },
      "taylor": {
            "C": 316,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 166,
                              "opt": 222,
                              "max": 299
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "hardware",
            "lamp_bases"
      ]
},
    "N-CU-126": {
      "id": "N-CU-126",
      "name": "C27000 Yellow Brass H06",
      "designation": {
            "uns": "C27000",
            "din": "2.0280",
            "en": "CW508L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 65.0,
            "Zn": 35.0
      },
      "physical": {
            "density": 8470,
            "thermal_conductivity": 116,
            "elastic_modulus": 105000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 534
            },
            "yield_strength": {
                  "typical": 218
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 1106,
            "mc": 0.26
      },
      "taylor": {
            "C": 313,
            "n": 0.27
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 171,
                              "opt": 228,
                              "max": 307
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "hardware",
            "lamp_bases"
      ]
},
    "N-CU-127": {
      "id": "N-CU-127",
      "name": "C28000 Muntz Metal O60",
      "designation": {
            "uns": "C28000",
            "din": "2.0360",
            "en": "CW509L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 60.0,
            "Zn": 40.0
      },
      "physical": {
            "density": 8390,
            "thermal_conductivity": 109,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 365
            },
            "yield_strength": {
                  "typical": 140
            },
            "elongation": {
                  "typical": 50
            }
      },
      "kienzle": {
            "kc1_1": 1026,
            "mc": 0.25
      },
      "taylor": {
            "C": 255,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 114,
                              "opt": 152,
                              "max": 205
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "architectural",
            "condenser_tubes",
            "large_nuts_bolts"
      ],
      "notes": "Hot working brass"
},
    "N-CU-128": {
      "id": "N-CU-128",
      "name": "C28000 Muntz Metal H01",
      "designation": {
            "uns": "C28000",
            "din": "2.0360",
            "en": "CW509L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 60.0,
            "Zn": 40.0
      },
      "physical": {
            "density": 8390,
            "thermal_conductivity": 109,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 408
            },
            "yield_strength": {
                  "typical": 175
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 1095,
            "mc": 0.25
      },
      "taylor": {
            "C": 297,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 144,
                              "opt": 192,
                              "max": 259
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "condenser_tubes",
            "large_nuts_bolts"
      ],
      "notes": "Hot working brass"
},
    "N-CU-129": {
      "id": "N-CU-129",
      "name": "C28000 Muntz Metal H02",
      "designation": {
            "uns": "C28000",
            "din": "2.0360",
            "en": "CW509L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 60.0,
            "Zn": 40.0
      },
      "physical": {
            "density": 8390,
            "thermal_conductivity": 109,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 456
            },
            "yield_strength": {
                  "typical": 210
            },
            "elongation": {
                  "typical": 32
            }
      },
      "kienzle": {
            "kc1_1": 1112,
            "mc": 0.25
      },
      "taylor": {
            "C": 294,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 146,
                              "opt": 195,
                              "max": 263
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "condenser_tubes",
            "large_nuts_bolts"
      ],
      "notes": "Hot working brass"
},
    "N-CU-130": {
      "id": "N-CU-130",
      "name": "C28000 Muntz Metal H04",
      "designation": {
            "uns": "C28000",
            "din": "2.0360",
            "en": "CW509L"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 60.0,
            "Zn": 40.0
      },
      "physical": {
            "density": 8390,
            "thermal_conductivity": 109,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 547
            },
            "yield_strength": {
                  "typical": 280
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 1144,
            "mc": 0.25
      },
      "taylor": {
            "C": 288,
            "n": 0.25
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 150,
                              "opt": 201,
                              "max": 271
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "architectural",
            "condenser_tubes",
            "large_nuts_bolts"
      ],
      "notes": "Hot working brass"
},
    "N-CU-131": {
      "id": "N-CU-131",
      "name": "C36000 Free-Cutting Brass O60",
      "designation": {
            "uns": "C36000",
            "din": "2.0375",
            "en": "CW603N"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 61.5,
            "Zn": 35.5,
            "Pb": 3.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 115,
            "elastic_modulus": 97000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 340
            },
            "yield_strength": {
                  "typical": 125
            },
            "elongation": {
                  "typical": 45
            }
      },
      "kienzle": {
            "kc1_1": 646,
            "mc": 0.24
      },
      "taylor": {
            "C": 531,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 294,
                              "opt": 392,
                              "max": 529
                        }
                  }
            }
      },
      "machinability": "Excellent - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "screw_machine_products",
            "gears",
            "pinions"
      ],
      "notes": "100% machinability rating - baseline"
},
    "N-CU-132": {
      "id": "N-CU-132",
      "name": "C36000 Free-Cutting Brass H01",
      "designation": {
            "uns": "C36000",
            "din": "2.0375",
            "en": "CW603N"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 61.5,
            "Zn": 35.5,
            "Pb": 3.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 115,
            "elastic_modulus": 97000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 380
            },
            "yield_strength": {
                  "typical": 156
            },
            "elongation": {
                  "typical": 36
            }
      },
      "kienzle": {
            "kc1_1": 689,
            "mc": 0.24
      },
      "taylor": {
            "C": 618,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 372,
                              "opt": 496,
                              "max": 669
                        }
                  }
            }
      },
      "machinability": "Excellent - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "gears",
            "pinions"
      ],
      "notes": "100% machinability rating - baseline"
},
    "N-CU-133": {
      "id": "N-CU-133",
      "name": "C36000 Free-Cutting Brass H02",
      "designation": {
            "uns": "C36000",
            "din": "2.0375",
            "en": "CW603N"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 61.5,
            "Zn": 35.5,
            "Pb": 3.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 115,
            "elastic_modulus": 97000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 425
            },
            "yield_strength": {
                  "typical": 187
            },
            "elongation": {
                  "typical": 29
            }
      },
      "kienzle": {
            "kc1_1": 700,
            "mc": 0.24
      },
      "taylor": {
            "C": 612,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 377,
                              "opt": 503,
                              "max": 679
                        }
                  }
            }
      },
      "machinability": "Excellent - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "gears",
            "pinions"
      ],
      "notes": "100% machinability rating - baseline"
},
    "N-CU-134": {
      "id": "N-CU-134",
      "name": "C36000 Free-Cutting Brass H04",
      "designation": {
            "uns": "C36000",
            "din": "2.0375",
            "en": "CW603N"
      },
      "iso_group": "N",
      "material_class": "Copper - Brass (Cu-Zn)",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 61.5,
            "Zn": 35.5,
            "Pb": 3.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 115,
            "elastic_modulus": 97000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 510
            },
            "yield_strength": {
                  "typical": 250
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 720,
            "mc": 0.24
      },
      "taylor": {
            "C": 600,
            "n": 0.32
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 389,
                              "opt": 519,
                              "max": 700
                        }
                  }
            }
      },
      "machinability": "Excellent - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "gears",
            "pinions"
      ],
      "notes": "100% machinability rating - baseline"
},
    "N-CU-135": {
      "id": "N-CU-135",
      "name": "C51000 Phosphor Bronze A O60",
      "designation": {
            "uns": "C51000",
            "din": "2.1020",
            "en": "CW451K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 94.8,
            "Sn": 5.0,
            "P": 0.2
      },
      "physical": {
            "density": 8860,
            "thermal_conductivity": 84,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 340
            },
            "yield_strength": {
                  "typical": 130
            },
            "elongation": {
                  "typical": 65
            }
      },
      "kienzle": {
            "kc1_1": 1045,
            "mc": 0.26
      },
      "taylor": {
            "C": 238,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 108,
                              "opt": 144,
                              "max": 194
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "springs",
            "fasteners",
            "electrical_contacts"
      ]
},
    "N-CU-136": {
      "id": "N-CU-136",
      "name": "C51000 Phosphor Bronze A H01",
      "designation": {
            "uns": "C51000",
            "din": "2.1020",
            "en": "CW451K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 94.8,
            "Sn": 5.0,
            "P": 0.2
      },
      "physical": {
            "density": 8860,
            "thermal_conductivity": 84,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 380
            },
            "yield_strength": {
                  "typical": 162
            },
            "elongation": {
                  "typical": 52
            }
      },
      "kienzle": {
            "kc1_1": 1115,
            "mc": 0.26
      },
      "taylor": {
            "C": 277,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 136,
                              "opt": 182,
                              "max": 245
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "fasteners",
            "electrical_contacts"
      ]
},
    "N-CU-137": {
      "id": "N-CU-137",
      "name": "C51000 Phosphor Bronze A H02",
      "designation": {
            "uns": "C51000",
            "din": "2.1020",
            "en": "CW451K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 94.8,
            "Sn": 5.0,
            "P": 0.2
      },
      "physical": {
            "density": 8860,
            "thermal_conductivity": 84,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 425
            },
            "yield_strength": {
                  "typical": 195
            },
            "elongation": {
                  "typical": 42
            }
      },
      "kienzle": {
            "kc1_1": 1133,
            "mc": 0.26
      },
      "taylor": {
            "C": 274,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 138,
                              "opt": 185,
                              "max": 249
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "fasteners",
            "electrical_contacts"
      ]
},
    "N-CU-138": {
      "id": "N-CU-138",
      "name": "C51000 Phosphor Bronze A H04",
      "designation": {
            "uns": "C51000",
            "din": "2.1020",
            "en": "CW451K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 94.8,
            "Sn": 5.0,
            "P": 0.2
      },
      "physical": {
            "density": 8860,
            "thermal_conductivity": 84,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 510
            },
            "yield_strength": {
                  "typical": 260
            },
            "elongation": {
                  "typical": 26
            }
      },
      "kienzle": {
            "kc1_1": 1166,
            "mc": 0.26
      },
      "taylor": {
            "C": 268,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 142,
                              "opt": 190,
                              "max": 256
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "fasteners",
            "electrical_contacts"
      ]
},
    "N-CU-139": {
      "id": "N-CU-139",
      "name": "C51000 Phosphor Bronze A H06",
      "designation": {
            "uns": "C51000",
            "din": "2.1020",
            "en": "CW451K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 94.8,
            "Sn": 5.0,
            "P": 0.2
      },
      "physical": {
            "density": 8860,
            "thermal_conductivity": 84,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 550
            },
            "yield_strength": {
                  "typical": 292
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 1181,
            "mc": 0.26
      },
      "taylor": {
            "C": 266,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 147,
                              "opt": 196,
                              "max": 264
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "fasteners",
            "electrical_contacts"
      ]
},
    "N-CU-140": {
      "id": "N-CU-140",
      "name": "C51000 Phosphor Bronze A H08",
      "designation": {
            "uns": "C51000",
            "din": "2.1020",
            "en": "CW451K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H08",
      "condition_description": "Spring",
      "composition": {
            "Cu": 94.8,
            "Sn": 5.0,
            "P": 0.2
      },
      "physical": {
            "density": 8860,
            "thermal_conductivity": 84,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 584
            },
            "yield_strength": {
                  "typical": 325
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 1194,
            "mc": 0.26
      },
      "taylor": {
            "C": 263,
            "n": 0.24
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 150,
                              "opt": 201,
                              "max": 271
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "fasteners",
            "electrical_contacts"
      ]
},
    "N-CU-141": {
      "id": "N-CU-141",
      "name": "C52100 Phosphor Bronze C O60",
      "designation": {
            "uns": "C52100",
            "din": "2.1030",
            "en": "CW453K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 92.0,
            "Sn": 8.0,
            "P": 0.1
      },
      "physical": {
            "density": 8800,
            "thermal_conductivity": 62,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 380
            },
            "yield_strength": {
                  "typical": 165
            },
            "elongation": {
                  "typical": 55
            }
      },
      "kienzle": {
            "kc1_1": 1092,
            "mc": 0.25
      },
      "taylor": {
            "C": 221,
            "n": 0.23
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 96,
                              "opt": 128,
                              "max": 172
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "heavy_springs",
            "bridge_bearings",
            "gear_blanks"
      ]
},
    "N-CU-142": {
      "id": "N-CU-142",
      "name": "C52100 Phosphor Bronze C H01",
      "designation": {
            "uns": "C52100",
            "din": "2.1030",
            "en": "CW453K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 92.0,
            "Sn": 8.0,
            "P": 0.1
      },
      "physical": {
            "density": 8800,
            "thermal_conductivity": 62,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 425
            },
            "yield_strength": {
                  "typical": 206
            },
            "elongation": {
                  "typical": 44
            }
      },
      "kienzle": {
            "kc1_1": 1166,
            "mc": 0.25
      },
      "taylor": {
            "C": 257,
            "n": 0.23
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 121,
                              "opt": 162,
                              "max": 218
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "heavy_springs",
            "bridge_bearings",
            "gear_blanks"
      ]
},
    "N-CU-143": {
      "id": "N-CU-143",
      "name": "C52100 Phosphor Bronze C H02",
      "designation": {
            "uns": "C52100",
            "din": "2.1030",
            "en": "CW453K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 92.0,
            "Sn": 8.0,
            "P": 0.1
      },
      "physical": {
            "density": 8800,
            "thermal_conductivity": 62,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 475
            },
            "yield_strength": {
                  "typical": 247
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 1184,
            "mc": 0.25
      },
      "taylor": {
            "C": 254,
            "n": 0.23
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 123,
                              "opt": 164,
                              "max": 221
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "heavy_springs",
            "bridge_bearings",
            "gear_blanks"
      ]
},
    "N-CU-144": {
      "id": "N-CU-144",
      "name": "C52100 Phosphor Bronze C H04",
      "designation": {
            "uns": "C52100",
            "din": "2.1030",
            "en": "CW453K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 92.0,
            "Sn": 8.0,
            "P": 0.1
      },
      "physical": {
            "density": 8800,
            "thermal_conductivity": 62,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 570
            },
            "yield_strength": {
                  "typical": 330
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 1219,
            "mc": 0.25
      },
      "taylor": {
            "C": 249,
            "n": 0.23
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 126,
                              "opt": 169,
                              "max": 228
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "heavy_springs",
            "bridge_bearings",
            "gear_blanks"
      ]
},
    "N-CU-145": {
      "id": "N-CU-145",
      "name": "C52100 Phosphor Bronze C H06",
      "designation": {
            "uns": "C52100",
            "din": "2.1030",
            "en": "CW453K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 92.0,
            "Sn": 8.0,
            "P": 0.1
      },
      "physical": {
            "density": 8800,
            "thermal_conductivity": 62,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 615
            },
            "yield_strength": {
                  "typical": 371
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 1235,
            "mc": 0.25
      },
      "taylor": {
            "C": 247,
            "n": 0.23
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 130,
                              "opt": 174,
                              "max": 234
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "heavy_springs",
            "bridge_bearings",
            "gear_blanks"
      ]
},
    "N-CU-146": {
      "id": "N-CU-146",
      "name": "C52100 Phosphor Bronze C H08",
      "designation": {
            "uns": "C52100",
            "din": "2.1030",
            "en": "CW453K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H08",
      "condition_description": "Spring",
      "composition": {
            "Cu": 92.0,
            "Sn": 8.0,
            "P": 0.1
      },
      "physical": {
            "density": 8800,
            "thermal_conductivity": 62,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 653
            },
            "yield_strength": {
                  "typical": 412
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 1249,
            "mc": 0.25
      },
      "taylor": {
            "C": 245,
            "n": 0.23
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 134,
                              "opt": 179,
                              "max": 241
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "heavy_springs",
            "bridge_bearings",
            "gear_blanks"
      ]
},
    "N-CU-147": {
      "id": "N-CU-147",
      "name": "C54400 Free-Cutting Phosphor Bronze O60",
      "designation": {
            "uns": "C54400",
            "din": "",
            "en": "CW456K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 88.0,
            "Sn": 4.0,
            "Pb": 4.0,
            "Zn": 4.0
      },
      "physical": {
            "density": 8900,
            "thermal_conductivity": 75,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 310
            },
            "yield_strength": {
                  "typical": 130
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 685,
            "mc": 0.25
      },
      "taylor": {
            "C": 477,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 252,
                              "opt": 336,
                              "max": 453
                        }
                  }
            }
      },
      "machinability": "Excellent - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "screw_machine_products",
            "bearings",
            "bushings"
      ],
      "notes": "Free-machining bronze"
},
    "N-CU-148": {
      "id": "N-CU-148",
      "name": "C54400 Free-Cutting Phosphor Bronze H01",
      "designation": {
            "uns": "C54400",
            "din": "",
            "en": "CW456K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 88.0,
            "Sn": 4.0,
            "Pb": 4.0,
            "Zn": 4.0
      },
      "physical": {
            "density": 8900,
            "thermal_conductivity": 75,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 347
            },
            "yield_strength": {
                  "typical": 162
            },
            "elongation": {
                  "typical": 32
            }
      },
      "kienzle": {
            "kc1_1": 732,
            "mc": 0.25
      },
      "taylor": {
            "C": 556,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 318,
                              "opt": 425,
                              "max": 573
                        }
                  }
            }
      },
      "machinability": "Excellent - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "bearings",
            "bushings"
      ],
      "notes": "Free-machining bronze"
},
    "N-CU-149": {
      "id": "N-CU-149",
      "name": "C54400 Free-Cutting Phosphor Bronze H02",
      "designation": {
            "uns": "C54400",
            "din": "",
            "en": "CW456K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 88.0,
            "Sn": 4.0,
            "Pb": 4.0,
            "Zn": 4.0
      },
      "physical": {
            "density": 8900,
            "thermal_conductivity": 75,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 387
            },
            "yield_strength": {
                  "typical": 195
            },
            "elongation": {
                  "typical": 26
            }
      },
      "kienzle": {
            "kc1_1": 743,
            "mc": 0.25
      },
      "taylor": {
            "C": 551,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 324,
                              "opt": 432,
                              "max": 583
                        }
                  }
            }
      },
      "machinability": "Excellent - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "bearings",
            "bushings"
      ],
      "notes": "Free-machining bronze"
},
    "N-CU-150": {
      "id": "N-CU-150",
      "name": "C54400 Free-Cutting Phosphor Bronze H04",
      "designation": {
            "uns": "C54400",
            "din": "",
            "en": "CW456K"
      },
      "iso_group": "N",
      "material_class": "Copper - Bronze (Cu-Sn)",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 88.0,
            "Sn": 4.0,
            "Pb": 4.0,
            "Zn": 4.0
      },
      "physical": {
            "density": 8900,
            "thermal_conductivity": 75,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 465
            },
            "yield_strength": {
                  "typical": 260
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 765,
            "mc": 0.25
      },
      "taylor": {
            "C": 540,
            "n": 0.3
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 333,
                              "opt": 445,
                              "max": 600
                        }
                  }
            }
      },
      "machinability": "Excellent - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "screw_machine_products",
            "bearings",
            "bushings"
      ],
      "notes": "Free-machining bronze"
},
    "N-CU-151": {
      "id": "N-CU-151",
      "name": "C65500 High-Silicon Bronze A O60",
      "designation": {
            "uns": "C65500",
            "din": "2.1525",
            "en": "CW116C"
      },
      "iso_group": "N",
      "material_class": "Copper - Silicon Bronze",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 97.0,
            "Si": 3.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 36,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 390
            },
            "yield_strength": {
                  "typical": 145
            },
            "elongation": {
                  "typical": 55
            }
      },
      "kienzle": {
            "kc1_1": 1121,
            "mc": 0.25
      },
      "taylor": {
            "C": 204,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 90,
                              "opt": 120,
                              "max": 162
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "hydraulic_lines",
            "marine_hardware",
            "fasteners"
      ]
},
    "N-CU-152": {
      "id": "N-CU-152",
      "name": "C65500 High-Silicon Bronze A H01",
      "designation": {
            "uns": "C65500",
            "din": "2.1525",
            "en": "CW116C"
      },
      "iso_group": "N",
      "material_class": "Copper - Silicon Bronze",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 97.0,
            "Si": 3.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 36,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 436
            },
            "yield_strength": {
                  "typical": 181
            },
            "elongation": {
                  "typical": 44
            }
      },
      "kienzle": {
            "kc1_1": 1196,
            "mc": 0.25
      },
      "taylor": {
            "C": 237,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 114,
                              "opt": 152,
                              "max": 205
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "hydraulic_lines",
            "marine_hardware",
            "fasteners"
      ]
},
    "N-CU-153": {
      "id": "N-CU-153",
      "name": "C65500 High-Silicon Bronze A H02",
      "designation": {
            "uns": "C65500",
            "din": "2.1525",
            "en": "CW116C"
      },
      "iso_group": "N",
      "material_class": "Copper - Silicon Bronze",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 97.0,
            "Si": 3.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 36,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 487
            },
            "yield_strength": {
                  "typical": 217
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 1215,
            "mc": 0.25
      },
      "taylor": {
            "C": 235,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 115,
                              "opt": 154,
                              "max": 207
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "hydraulic_lines",
            "marine_hardware",
            "fasteners"
      ]
},
    "N-CU-154": {
      "id": "N-CU-154",
      "name": "C65500 High-Silicon Bronze A H04",
      "designation": {
            "uns": "C65500",
            "din": "2.1525",
            "en": "CW116C"
      },
      "iso_group": "N",
      "material_class": "Copper - Silicon Bronze",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 97.0,
            "Si": 3.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 36,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 585
            },
            "yield_strength": {
                  "typical": 290
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 1250,
            "mc": 0.25
      },
      "taylor": {
            "C": 230,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 119,
                              "opt": 159,
                              "max": 214
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "hydraulic_lines",
            "marine_hardware",
            "fasteners"
      ]
},
    "N-CU-155": {
      "id": "N-CU-155",
      "name": "C65500 High-Silicon Bronze A H06",
      "designation": {
            "uns": "C65500",
            "din": "2.1525",
            "en": "CW116C"
      },
      "iso_group": "N",
      "material_class": "Copper - Silicon Bronze",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 97.0,
            "Si": 3.0
      },
      "physical": {
            "density": 8530,
            "thermal_conductivity": 36,
            "elastic_modulus": 103000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 631
            },
            "yield_strength": {
                  "typical": 326
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 1267,
            "mc": 0.25
      },
      "taylor": {
            "C": 228,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 122,
                              "opt": 163,
                              "max": 220
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "hydraulic_lines",
            "marine_hardware",
            "fasteners"
      ]
},
    "N-CU-156": {
      "id": "N-CU-156",
      "name": "C63000 Aluminum Bronze O60",
      "designation": {
            "uns": "C63000",
            "din": "2.0966",
            "en": "CW307G"
      },
      "iso_group": "N",
      "material_class": "Copper - Aluminum Bronze",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 82.0,
            "Al": 10.0,
            "Ni": 5.0,
            "Fe": 3.0
      },
      "physical": {
            "density": 7580,
            "thermal_conductivity": 42,
            "elastic_modulus": 115000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 620
            },
            "yield_strength": {
                  "typical": 275
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 1282,
            "mc": 0.23
      },
      "taylor": {
            "C": 153,
            "n": 0.19
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 60,
                              "opt": 80,
                              "max": 108
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "marine",
            "gears",
            "bearings",
            "landing_gear"
      ],
      "notes": "High strength"
},
    "N-CU-157": {
      "id": "N-CU-157",
      "name": "C63000 Aluminum Bronze H01",
      "designation": {
            "uns": "C63000",
            "din": "2.0966",
            "en": "CW307G"
      },
      "iso_group": "N",
      "material_class": "Copper - Aluminum Bronze",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 82.0,
            "Al": 10.0,
            "Ni": 5.0,
            "Fe": 3.0
      },
      "physical": {
            "density": 7580,
            "thermal_conductivity": 42,
            "elastic_modulus": 115000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 694
            },
            "yield_strength": {
                  "typical": 343
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 1369,
            "mc": 0.23
      },
      "taylor": {
            "C": 178,
            "n": 0.19
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 75,
                              "opt": 101,
                              "max": 136
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "gears",
            "bearings",
            "landing_gear"
      ],
      "notes": "High strength"
},
    "N-CU-158": {
      "id": "N-CU-158",
      "name": "C63000 Aluminum Bronze H02",
      "designation": {
            "uns": "C63000",
            "din": "2.0966",
            "en": "CW307G"
      },
      "iso_group": "N",
      "material_class": "Copper - Aluminum Bronze",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 82.0,
            "Al": 10.0,
            "Ni": 5.0,
            "Fe": 3.0
      },
      "physical": {
            "density": 7580,
            "thermal_conductivity": 42,
            "elastic_modulus": 115000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 775
            },
            "yield_strength": {
                  "typical": 412
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 1390,
            "mc": 0.23
      },
      "taylor": {
            "C": 176,
            "n": 0.19
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 77,
                              "opt": 103,
                              "max": 139
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "marine",
            "gears",
            "bearings",
            "landing_gear"
      ],
      "notes": "High strength"
},
    "N-CU-159": {
      "id": "N-CU-159",
      "name": "C95400 Aluminum Bronze (Cast) O60",
      "designation": {
            "uns": "C95400",
            "din": "2.0964",
            "en": "CC331G"
      },
      "iso_group": "N",
      "material_class": "Copper - Aluminum Bronze",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 85.0,
            "Al": 11.0,
            "Fe": 4.0
      },
      "physical": {
            "density": 7530,
            "thermal_conductivity": 59,
            "elastic_modulus": 110000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 550
            },
            "yield_strength": {
                  "typical": 205
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1235,
            "mc": 0.24
      },
      "taylor": {
            "C": 161,
            "n": 0.2
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 66,
                              "opt": 88,
                              "max": 118
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "valve_stems",
            "pump_parts",
            "bushings"
      ]
},
    "N-CU-160": {
      "id": "N-CU-160",
      "name": "C17200 Beryllium Copper TB00",
      "designation": {
            "uns": "C17200",
            "din": "2.1247",
            "en": "CW101C"
      },
      "iso_group": "N",
      "material_class": "Copper - Beryllium Copper",
      "condition": "TB00",
      "condition_description": "Solution annealed",
      "composition": {
            "Cu": 97.8,
            "Be": 1.9,
            "Co": 0.3
      },
      "physical": {
            "density": 8250,
            "thermal_conductivity": 107,
            "elastic_modulus": 131000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 517
            },
            "yield_strength": {
                  "typical": 224
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 1275,
            "mc": 0.24
      },
      "taylor": {
            "C": 198,
            "n": 0.2
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 81,
                              "opt": 108,
                              "max": 145
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting, TOXIC dust hazard",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
      },
      "applications": [
            "springs",
            "electrical_contacts",
            "molds"
      ],
      "notes": "Highest strength copper alloy - TOXIC dust!"
},
    "N-CU-161": {
      "id": "N-CU-161",
      "name": "C17200 Beryllium Copper TD02",
      "designation": {
            "uns": "C17200",
            "din": "2.1247",
            "en": "CW101C"
      },
      "iso_group": "N",
      "material_class": "Copper - Beryllium Copper",
      "condition": "TD02",
      "condition_description": "1/2 Hard + aged",
      "composition": {
            "Cu": 97.8,
            "Be": 1.9,
            "Co": 0.3
      },
      "physical": {
            "density": 8250,
            "thermal_conductivity": 107,
            "elastic_modulus": 131000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 846
            },
            "yield_strength": {
                  "typical": 468
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1450,
            "mc": 0.24
      },
      "taylor": {
            "C": 184,
            "n": 0.2
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 81,
                              "opt": 108,
                              "max": 145
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting, TOXIC dust hazard",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
      },
      "applications": [
            "springs",
            "electrical_contacts",
            "molds"
      ],
      "notes": "Highest strength copper alloy - TOXIC dust!"
},
    "N-CU-162": {
      "id": "N-CU-162",
      "name": "C17200 Beryllium Copper TD04",
      "designation": {
            "uns": "C17200",
            "din": "2.1247",
            "en": "CW101C"
      },
      "iso_group": "N",
      "material_class": "Copper - Beryllium Copper",
      "condition": "TD04",
      "condition_description": "Hard + aged",
      "composition": {
            "Cu": 97.8,
            "Be": 1.9,
            "Co": 0.3
      },
      "physical": {
            "density": 8250,
            "thermal_conductivity": 107,
            "elastic_modulus": 131000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 940
            },
            "yield_strength": {
                  "typical": 546
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 1500,
            "mc": 0.24
      },
      "taylor": {
            "C": 180,
            "n": 0.2
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 81,
                              "opt": 108,
                              "max": 145
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting, TOXIC dust hazard",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
      },
      "applications": [
            "springs",
            "electrical_contacts",
            "molds"
      ],
      "notes": "Highest strength copper alloy - TOXIC dust!"
},
    "N-CU-163": {
      "id": "N-CU-163",
      "name": "C17200 Beryllium Copper TF00",
      "designation": {
            "uns": "C17200",
            "din": "2.1247",
            "en": "CW101C"
      },
      "iso_group": "N",
      "material_class": "Copper - Beryllium Copper",
      "condition": "TF00",
      "condition_description": "Aged from TB00",
      "composition": {
            "Cu": 97.8,
            "Be": 1.9,
            "Co": 0.3
      },
      "physical": {
            "density": 8250,
            "thermal_conductivity": 107,
            "elastic_modulus": 131000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 1034
            },
            "yield_strength": {
                  "typical": 624
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 1550,
            "mc": 0.24
      },
      "taylor": {
            "C": 176,
            "n": 0.2
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 81,
                              "opt": 108,
                              "max": 145
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting, TOXIC dust hazard",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
      },
      "applications": [
            "springs",
            "electrical_contacts",
            "molds"
      ],
      "notes": "Highest strength copper alloy - TOXIC dust!"
},
    "N-CU-164": {
      "id": "N-CU-164",
      "name": "C17500 Beryllium Copper TB00",
      "designation": {
            "uns": "C17500",
            "din": "2.1285",
            "en": "CW104C"
      },
      "iso_group": "N",
      "material_class": "Copper - Beryllium Copper",
      "condition": "TB00",
      "condition_description": "Solution annealed",
      "composition": {
            "Cu": 97.2,
            "Co": 2.5,
            "Be": 0.3
      },
      "physical": {
            "density": 8750,
            "thermal_conductivity": 209,
            "elastic_modulus": 138000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 341
            },
            "yield_strength": {
                  "typical": 132
            },
            "elongation": {
                  "typical": 45
            }
      },
      "kienzle": {
            "kc1_1": 1122,
            "mc": 0.25
      },
      "taylor": {
            "C": 227,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 94,
                              "opt": 126,
                              "max": 170
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting, TOXIC dust hazard",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
      },
      "applications": [
            "resistance_welding",
            "electrical_contacts"
      ],
      "notes": "High conductivity version - TOXIC dust!"
},
    "N-CU-165": {
      "id": "N-CU-165",
      "name": "C17500 Beryllium Copper TD02",
      "designation": {
            "uns": "C17500",
            "din": "2.1285",
            "en": "CW104C"
      },
      "iso_group": "N",
      "material_class": "Copper - Beryllium Copper",
      "condition": "TD02",
      "condition_description": "1/2 Hard + aged",
      "composition": {
            "Cu": 97.2,
            "Co": 2.5,
            "Be": 0.3
      },
      "physical": {
            "density": 8750,
            "thermal_conductivity": 209,
            "elastic_modulus": 138000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 558
            },
            "yield_strength": {
                  "typical": 276
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 1276,
            "mc": 0.25
      },
      "taylor": {
            "C": 211,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 94,
                              "opt": 126,
                              "max": 170
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting, TOXIC dust hazard",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
      },
      "applications": [
            "resistance_welding",
            "electrical_contacts"
      ],
      "notes": "High conductivity version - TOXIC dust!"
},
    "N-CU-166": {
      "id": "N-CU-166",
      "name": "C17500 Beryllium Copper TD04",
      "designation": {
            "uns": "C17500",
            "din": "2.1285",
            "en": "CW104C"
      },
      "iso_group": "N",
      "material_class": "Copper - Beryllium Copper",
      "condition": "TD04",
      "condition_description": "Hard + aged",
      "composition": {
            "Cu": 97.2,
            "Co": 2.5,
            "Be": 0.3
      },
      "physical": {
            "density": 8750,
            "thermal_conductivity": 209,
            "elastic_modulus": 138000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 620
            },
            "yield_strength": {
                  "typical": 322
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 1320,
            "mc": 0.25
      },
      "taylor": {
            "C": 207,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 94,
                              "opt": 126,
                              "max": 170
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting, TOXIC dust hazard",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
      },
      "applications": [
            "resistance_welding",
            "electrical_contacts"
      ],
      "notes": "High conductivity version - TOXIC dust!"
},
    "N-CU-167": {
      "id": "N-CU-167",
      "name": "C17500 Beryllium Copper TF00",
      "designation": {
            "uns": "C17500",
            "din": "2.1285",
            "en": "CW104C"
      },
      "iso_group": "N",
      "material_class": "Copper - Beryllium Copper",
      "condition": "TF00",
      "condition_description": "Aged from TB00",
      "composition": {
            "Cu": 97.2,
            "Co": 2.5,
            "Be": 0.3
      },
      "physical": {
            "density": 8750,
            "thermal_conductivity": 209,
            "elastic_modulus": 138000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 682
            },
            "yield_strength": {
                  "typical": 368
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 1364,
            "mc": 0.25
      },
      "taylor": {
            "C": 202,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 94,
                              "opt": 126,
                              "max": 170
                        }
                  }
            }
      },
      "machinability": "Good - stable cutting, TOXIC dust hazard",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "WARNING: TOXIC beryllium dust! Use vacuum extraction, wet cutting MANDATORY, PPE required"
      },
      "applications": [
            "resistance_welding",
            "electrical_contacts"
      ],
      "notes": "High conductivity version - TOXIC dust!"
},
    "N-CU-168": {
      "id": "N-CU-168",
      "name": "C75200 Nickel Silver 65-18 O60",
      "designation": {
            "uns": "C75200",
            "din": "2.0740",
            "en": "CW409J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 65.0,
            "Ni": 18.0,
            "Zn": 17.0
      },
      "physical": {
            "density": 8700,
            "thermal_conductivity": 33,
            "elastic_modulus": 125000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 390
            },
            "yield_strength": {
                  "typical": 150
            },
            "elongation": {
                  "typical": 45
            }
      },
      "kienzle": {
            "kc1_1": 1140,
            "mc": 0.25
      },
      "taylor": {
            "C": 187,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 84,
                              "opt": 112,
                              "max": 151
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "optical_parts",
            "musical_instruments",
            "jewelry"
      ]
},
    "N-CU-169": {
      "id": "N-CU-169",
      "name": "C75200 Nickel Silver 65-18 H01",
      "designation": {
            "uns": "C75200",
            "din": "2.0740",
            "en": "CW409J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 65.0,
            "Ni": 18.0,
            "Zn": 17.0
      },
      "physical": {
            "density": 8700,
            "thermal_conductivity": 33,
            "elastic_modulus": 125000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 436
            },
            "yield_strength": {
                  "typical": 187
            },
            "elongation": {
                  "typical": 36
            }
      },
      "kienzle": {
            "kc1_1": 1216,
            "mc": 0.25
      },
      "taylor": {
            "C": 217,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 106,
                              "opt": 142,
                              "max": 191
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "optical_parts",
            "musical_instruments",
            "jewelry"
      ]
},
    "N-CU-170": {
      "id": "N-CU-170",
      "name": "C75200 Nickel Silver 65-18 H02",
      "designation": {
            "uns": "C75200",
            "din": "2.0740",
            "en": "CW409J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 65.0,
            "Ni": 18.0,
            "Zn": 17.0
      },
      "physical": {
            "density": 8700,
            "thermal_conductivity": 33,
            "elastic_modulus": 125000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 487
            },
            "yield_strength": {
                  "typical": 225
            },
            "elongation": {
                  "typical": 29
            }
      },
      "kienzle": {
            "kc1_1": 1235,
            "mc": 0.25
      },
      "taylor": {
            "C": 215,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 108,
                              "opt": 144,
                              "max": 194
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "optical_parts",
            "musical_instruments",
            "jewelry"
      ]
},
    "N-CU-171": {
      "id": "N-CU-171",
      "name": "C75200 Nickel Silver 65-18 H04",
      "designation": {
            "uns": "C75200",
            "din": "2.0740",
            "en": "CW409J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 65.0,
            "Ni": 18.0,
            "Zn": 17.0
      },
      "physical": {
            "density": 8700,
            "thermal_conductivity": 33,
            "elastic_modulus": 125000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 585
            },
            "yield_strength": {
                  "typical": 300
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 1272,
            "mc": 0.25
      },
      "taylor": {
            "C": 211,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 111,
                              "opt": 148,
                              "max": 199
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "optical_parts",
            "musical_instruments",
            "jewelry"
      ]
},
    "N-CU-172": {
      "id": "N-CU-172",
      "name": "C75200 Nickel Silver 65-18 H06",
      "designation": {
            "uns": "C75200",
            "din": "2.0740",
            "en": "CW409J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 65.0,
            "Ni": 18.0,
            "Zn": 17.0
      },
      "physical": {
            "density": 8700,
            "thermal_conductivity": 33,
            "elastic_modulus": 125000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 631
            },
            "yield_strength": {
                  "typical": 337
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 1288,
            "mc": 0.25
      },
      "taylor": {
            "C": 209,
            "n": 0.22
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 114,
                              "opt": 152,
                              "max": 205
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "optical_parts",
            "musical_instruments",
            "jewelry"
      ]
},
    "N-CU-173": {
      "id": "N-CU-173",
      "name": "C77000 Nickel Silver 55-18 O60",
      "designation": {
            "uns": "C77000",
            "din": "2.0790",
            "en": "CW410J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "O60",
      "condition_description": "Soft anneal",
      "composition": {
            "Cu": 55.0,
            "Ni": 18.0,
            "Zn": 27.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 28,
            "elastic_modulus": 130000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 415
            },
            "yield_strength": {
                  "typical": 165
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 1168,
            "mc": 0.24
      },
      "taylor": {
            "C": 178,
            "n": 0.21
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 78,
                              "opt": 104,
                              "max": 140
                        }
                  }
            }
      },
      "machinability": "Poor - gummy/stringy chips, built-up edge issues",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "CRITICAL: Very sharp tools, high speed, flood coolant to prevent BUE"
      },
      "applications": [
            "springs",
            "contacts",
            "camera_parts"
      ]
},
    "N-CU-174": {
      "id": "N-CU-174",
      "name": "C77000 Nickel Silver 55-18 H01",
      "designation": {
            "uns": "C77000",
            "din": "2.0790",
            "en": "CW410J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "H01",
      "condition_description": "1/4 Hard",
      "composition": {
            "Cu": 55.0,
            "Ni": 18.0,
            "Zn": 27.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 28,
            "elastic_modulus": 130000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 464
            },
            "yield_strength": {
                  "typical": 206
            },
            "elongation": {
                  "typical": 32
            }
      },
      "kienzle": {
            "kc1_1": 1247,
            "mc": 0.24
      },
      "taylor": {
            "C": 208,
            "n": 0.21
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 98,
                              "opt": 131,
                              "max": 176
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "contacts",
            "camera_parts"
      ]
},
    "N-CU-175": {
      "id": "N-CU-175",
      "name": "C77000 Nickel Silver 55-18 H02",
      "designation": {
            "uns": "C77000",
            "din": "2.0790",
            "en": "CW410J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "H02",
      "condition_description": "1/2 Hard",
      "composition": {
            "Cu": 55.0,
            "Ni": 18.0,
            "Zn": 27.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 28,
            "elastic_modulus": 130000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 518
            },
            "yield_strength": {
                  "typical": 247
            },
            "elongation": {
                  "typical": 26
            }
      },
      "kienzle": {
            "kc1_1": 1266,
            "mc": 0.24
      },
      "taylor": {
            "C": 205,
            "n": 0.21
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 99,
                              "opt": 133,
                              "max": 179
                        }
                  }
            }
      },
      "machinability": "Fair - moderate chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "contacts",
            "camera_parts"
      ]
},
    "N-CU-176": {
      "id": "N-CU-176",
      "name": "C77000 Nickel Silver 55-18 H04",
      "designation": {
            "uns": "C77000",
            "din": "2.0790",
            "en": "CW410J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "H04",
      "condition_description": "Hard",
      "composition": {
            "Cu": 55.0,
            "Ni": 18.0,
            "Zn": 27.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 28,
            "elastic_modulus": 130000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 622
            },
            "yield_strength": {
                  "typical": 330
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 1303,
            "mc": 0.24
      },
      "taylor": {
            "C": 201,
            "n": 0.21
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 102,
                              "opt": 137,
                              "max": 184
                        }
                  }
            }
      },
      "machinability": "Good - improved chip breaking",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "contacts",
            "camera_parts"
      ]
},
    "N-CU-177": {
      "id": "N-CU-177",
      "name": "C77000 Nickel Silver 55-18 H06",
      "designation": {
            "uns": "C77000",
            "din": "2.0790",
            "en": "CW410J"
      },
      "iso_group": "N",
      "material_class": "Copper - Nickel Silver",
      "condition": "H06",
      "condition_description": "Extra Hard",
      "composition": {
            "Cu": 55.0,
            "Ni": 18.0,
            "Zn": 27.0
      },
      "physical": {
            "density": 8500,
            "thermal_conductivity": 28,
            "elastic_modulus": 130000,
            "poissons_ratio": 0.34
      },
      "mechanical": {
            "tensile_strength": {
                  "typical": 672
            },
            "yield_strength": {
                  "typical": 371
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 1321,
            "mc": 0.24
      },
      "taylor": {
            "C": 199,
            "n": 0.21
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 105,
                              "opt": 141,
                              "max": 190
                        }
                  }
            }
      },
      "machinability": "Very good - excellent chip control",
      "tooling": {
            "primary": "Uncoated Carbide or PCD",
            "insert_grade": "K10-K20 Uncoated",
            "coating": [
                  "None",
                  "TiN (optional)"
            ],
            "geometry": "Sharp positive rake 10-15\u00b0, polished rake face",
            "coolant": "Flood coolant recommended",
            "notes": "High helix cutters, 2-3 flute for chip evacuation"
      },
      "applications": [
            "springs",
            "contacts",
            "camera_parts"
      ]
}
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = COPPER_TEMPER_CONDITIONS;
}
